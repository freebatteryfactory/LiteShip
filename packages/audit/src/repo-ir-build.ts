/**
 * The HOST-SIDE repo-IR builder (Slice B, phase B1 — step 2).
 *
 * `@czap/gauntlet` DEFINES the {@link RepoIR} interface but carries no
 * `typescript` dep — it is the lean, downstream-installable engine and the IR is
 * an INJECTED capability (owner-ratified ⚑ decision 1). THIS module is the host
 * half: `@czap/audit` (which already deps `typescript`) materializes a real
 * {@link RepoIR} from a {@link DevopsProfile}'s source corpus and a CLI host
 * injects it into the gauntlet run. The dependency direction is `audit →
 * gauntlet` (gauntlet stays a leaf; no cycle — gauntlet deps only @czap/error +
 * fast-glob) and `audit → canonical` (the blake3 content-address kernel).
 *
 * What it builds (design §1, ECS-shaped, immutable, content-addressed):
 *   • FileNode per source file — `contentDigest` is a REAL blake3 AddressedDigest
 *     over the file's utf8 bytes (never {@link PLACEHOLDER_DIGEST}, which is
 *     fixtures-only).
 *   • SymbolNode per exported/declared symbol — the syntactic kind mapped to the
 *     Step-1 {@link SymbolKind} union, INCLUDING the default-export /
 *     export-assignment / `{ x as default }` re-export distinction the
 *     no-default-export oracle (Step 3) turns on.
 *   • ImportEdge per import — resolved by the SAME `resolveImport` the structure
 *     pass uses (one resolver, no divergent fork).
 *   • PackageNode per package — `manifestDeps` from the discovered manifests.
 *   • refs — the reverse-reference index (file-proxy-only edges).
 *   • FACTS — for B1, the AST-precise `is-default-export` oracle (oracleId
 *     `ts-ast`, coverageClass `file-proxy-only`): one of the two sources the
 *     no-default-export cross-check (Step 3) triangulates. Emission is routed
 *     through {@link emitFileProxyFact}, an extensible per-oracle helper.
 *
 * Determinism: the source corpus is read sorted; symbols, edges, and facts are
 * sorted before assembly; `contentDigest` is over file bytes only (no mtime, no
 * run-id). Building twice over unchanged source yields a byte-stable IR — the
 * invariant the B2 content-addressed cache will depend on.
 *
 * @module
 */
import ts from 'typescript';
import { addressedDigestOf } from '@czap/canonical';
import {
  makeRepoIR,
  type RepoIR,
  type FileNode,
  type SymbolNode,
  type SymbolKind,
  type ImportEdge,
  type ImportKind,
  type PackageNode,
  type RefSite,
  type SymbolId,
  type Fact,
  type CoverageClass,
} from '@czap/gauntlet';
import { liteshipDevopsProfile } from './devops-profile.js';
import type { DevopsProfile } from './devops-profile.js';
import { listProfilePackageManifests, readProfileSourceFileRecords } from './shared.js';
import type { SourceFileRecord } from './shared.js';
import {
  buildPackageExportTargets,
  hasModifier,
  resolveImport,
} from './structure.js';
import { createTypeDirectedProgram } from './ts-program.js';

/** UTF-8 encoder reused across files (stateless, deterministic). */
const UTF8 = new TextEncoder();

/**
 * The blake3 content digest of a file's bytes, as the opaque display string the
 * IR stores (design §1: blake3, not the 32-bit fnv1a display id which collides
 * at repo scale). The digest covers the file CONTENT only — no mtime, no path —
 * so it is byte-stable across runs over unchanged source.
 */
function contentDigestOf(text: string): string {
  return addressedDigestOf(UTF8.encode(text), 'blake3').integrity_digest;
}

/** 1-based line of a node's start in its source file (the fact's location). */
function lineOf(sourceFile: ts.SourceFile, node: ts.Node): number {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

/**
 * Map a declaration node to its Step-1 {@link SymbolKind}, or `null` when the
 * node is not a directly-kinded declaration the symbol table records. Mirrors
 * the syntactic shapes `structure.ts`'s `exportedNamesFromNode` enumerates, but
 * carries the KIND through (the symbol table is richer than the name-only audit
 * helper). The default-export keyword form and the `export =` assignment form
 * are kept distinct — the no-default-export cross-check (Step 3) turns on that
 * distinction.
 */
function variableKind(stmt: ts.VariableStatement): SymbolKind {
  const flags = stmt.declarationList.flags;
  if ((flags & ts.NodeFlags.Const) !== 0) return 'const';
  if ((flags & ts.NodeFlags.Let) !== 0) return 'let';
  return 'var';
}

/** One extracted symbol: its name, kind, and the node whose start locates it. */
interface ExtractedSymbol {
  readonly name: string;
  readonly kind: SymbolKind;
  readonly node: ts.Node;
}

/**
 * Extract the declared/exported symbols a single statement node contributes to
 * the symbol table, with their {@link SymbolKind}. Only EXPORTED declarations
 * are recorded (the symbol table is the public-surface graph, matching the audit
 * pass's exported-symbol model). Returns `[]` for non-declaration nodes.
 */
function extractSymbols(node: ts.Node): readonly ExtractedSymbol[] {
  // A default-exported function/class decl (the `default`-keyword form on a
  // `function`/`class`) carries BOTH the export and the default modifier. It is a
  // default export, not a named function/class export — record it under the
  // `default` key with `default-export` kind so the no-default-export cross-check
  // (Step 3) sees it. The name may be omitted (an anonymous default function decl).
  if (
    (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) &&
    hasModifier(node, ts.SyntaxKind.ExportKeyword) &&
    hasModifier(node, ts.SyntaxKind.DefaultKeyword)
  ) {
    return [{ name: 'default', kind: 'default-export', node: node.name ?? node }];
  }
  if (ts.isFunctionDeclaration(node)) {
    return node.name && hasModifier(node, ts.SyntaxKind.ExportKeyword)
      ? [{ name: node.name.text, kind: 'function', node: node.name }]
      : [];
  }
  if (ts.isClassDeclaration(node)) {
    return node.name && hasModifier(node, ts.SyntaxKind.ExportKeyword)
      ? [{ name: node.name.text, kind: 'class', node: node.name }]
      : [];
  }
  if (ts.isInterfaceDeclaration(node)) {
    return hasModifier(node, ts.SyntaxKind.ExportKeyword)
      ? [{ name: node.name.text, kind: 'interface', node: node.name }]
      : [];
  }
  if (ts.isTypeAliasDeclaration(node)) {
    return hasModifier(node, ts.SyntaxKind.ExportKeyword)
      ? [{ name: node.name.text, kind: 'type', node: node.name }]
      : [];
  }
  if (ts.isEnumDeclaration(node)) {
    return hasModifier(node, ts.SyntaxKind.ExportKeyword)
      ? [{ name: node.name.text, kind: 'enum', node: node.name }]
      : [];
  }
  if (ts.isModuleDeclaration(node) && ts.isIdentifier(node.name)) {
    return hasModifier(node, ts.SyntaxKind.ExportKeyword)
      ? [{ name: node.name.text, kind: 'namespace', node: node.name }]
      : [];
  }
  if (ts.isVariableStatement(node) && hasModifier(node, ts.SyntaxKind.ExportKeyword)) {
    const kind = variableKind(node);
    return node.declarationList.declarations
      .filter((d): d is ts.VariableDeclaration & { name: ts.Identifier } => ts.isIdentifier(d.name))
      .map((d) => ({ name: d.name.text, kind, node: d.name }));
  }
  // `export = x` — the export-assignment form (CommonJS-style default).
  if (ts.isExportAssignment(node)) {
    // The default-keyword expression form carries no `isExportEquals`; the
    // `export = x` assignment form sets it. The two are distinct kinds.
    return [
      {
        name: 'default',
        kind: node.isExportEquals === true ? 'export-assignment' : 'default-export',
        node,
      },
    ];
  }
  // `export { x as default }` / `export { x }` — a same-file re-export list (no
  // module specifier). A `default` alias re-exports under the default name; other
  // names are re-exports of local bindings.
  if (
    ts.isExportDeclaration(node) &&
    node.moduleSpecifier === undefined &&
    node.exportClause !== undefined &&
    ts.isNamedExports(node.exportClause)
  ) {
    return node.exportClause.elements.map((el) => ({
      name: el.name.text,
      kind: 're-export' as SymbolKind,
      node: el.name,
    }));
  }
  return [];
}

/**
 * Emit a `file-proxy-only` {@link Fact} (the AST-precise oracle class). The ONE
 * per-oracle emit helper for B1's AST facts — a later step adds sibling helpers
 * for the `ts-program` (symbol-evidenced) and regex (text-only) oracles without
 * touching this one. Extensible by construction: pass the `property`/`value`.
 */
function emitFileProxyFact(
  facts: Fact[],
  file: string,
  line: number,
  property: string,
  value: unknown,
  oracleId: string,
  coverageClass: CoverageClass,
): void {
  facts.push({ file, line, property, value, oracleId, coverageClass });
}

/** The composed flat tables before {@link makeRepoIR} indexes + freezes them. */
interface Tables {
  readonly files: FileNode[];
  readonly symbols: SymbolNode[];
  readonly imports: ImportEdge[];
  readonly facts: Fact[];
  /** Reverse-reference index, accumulated by symbolId. */
  readonly refs: Map<SymbolId, RefSite[]>;
}

/**
 * Build a real {@link RepoIR} from a {@link DevopsProfile} — the host-side
 * materialization. Pure and deterministic: same source bytes → identical IR.
 *
 * @param profile The audit profile (`profile.repoRoot` is the authoritative
 *   target). Defaults to the LiteShip reference profile.
 */
export function buildRepoIR(profile: DevopsProfile = liteshipDevopsProfile): RepoIR {
  const records = readProfileSourceFileRecords(profile);
  const packageInfos = listProfilePackageManifests(profile);
  const packageExportTargets = buildPackageExportTargets(packageInfos);

  // ONE type-directed program over the whole corpus (reuses the shared config +
  // WORKSPACE_ALIASES so cross-package types resolve, never collapsing to `any`).
  // The checker is available for later symbol-evidenced oracles; B1's facts are
  // AST-precise (file-proxy-only), so the program is built for the seam + future
  // oracles, and its source files give a canonical parse.
  const program = createTypeDirectedProgram(
    records.map((r) => r.absolutePath),
    profile.repoRoot,
  );
  void program.getTypeChecker();

  // resolved targetFile (repo-relative) → its SourceFileRecord, so import edges
  // only carry a targetFile that is actually IN the IR's file table.
  const recordByAbsTarget = new Map<string, SourceFileRecord>(
    records.map((r) => [r.absolutePath, r] as const),
  );

  const tables: Tables = { files: [], symbols: [], imports: [], facts: [], refs: new Map() };

  for (const record of records) {
    tables.files.push({
      id: record.relativePath,
      contentDigest: contentDigestOf(record.text),
      packageName: record.packageName,
    });

    const sourceFile = record.sourceFile;
    walk(sourceFile);

    function walk(node: ts.Node): void {
      // ── Symbols + the is-default-export fact (AST-precise) ──────────────
      for (const sym of extractSymbols(node)) {
        const line = lineOf(sourceFile, sym.node);
        tables.symbols.push({
          id: `${record.relativePath}#${sym.name}`,
          name: sym.name,
          kind: sym.kind,
          file: record.relativePath,
          location: { file: record.relativePath, line },
        });
        // The two AST forms the regex oracle can miss (`export =` and
        // `{ x as default }`) AND the keyword form — every real default-export
        // site emits the AST-precise fact the Step-3 cross-check triangulates.
        if (sym.kind === 'default-export' || sym.kind === 'export-assignment') {
          emitFileProxyFact(tables.facts, record.relativePath, line, 'is-default-export', true, 'ts-ast', 'file-proxy-only');
        } else if (sym.kind === 're-export' && sym.name === 'default') {
          emitFileProxyFact(tables.facts, record.relativePath, line, 'is-default-export', true, 'ts-ast', 'file-proxy-only');
        }
      }

      // ── Import / export-from edges + the reverse-reference index ────────
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        const specifier = node.moduleSpecifier.text;
        const resolved = resolveImport(
          specifier,
          record.absolutePath,
          packageExportTargets,
          profile.internalPackagePrefix,
        );
        const targetRecord =
          resolved.targetFile !== null ? recordByAbsTarget.get(resolved.targetFile) : undefined;

        const edge: ImportEdge = {
          fromFile: record.relativePath,
          specifier,
          kind: resolved.kind satisfies ImportKind,
          // Only carry a targetFile that is in the IR's file table (makeRepoIR
          // rejects a dangling edge); a resolved-but-unscanned file (e.g. a .d.ts)
          // drops to package-only.
          ...(targetRecord !== undefined ? { targetFile: targetRecord.relativePath } : {}),
          ...(resolved.targetPackage !== null ? { targetPackage: resolved.targetPackage } : {}),
        };
        tables.imports.push(edge);

        // Reverse-reference index: when the edge resolves to an in-IR file, every
        // by-name binding it pulls is a ref site for that file's symbol. This is
        // the file-proxy module-graph layer (B3 upgrades it to symbol-evidenced
        // via the checker / a LanguageService oracle).
        if (targetRecord !== undefined) {
          for (const name of referencedNames(node)) {
            const symbolId: SymbolId = `${targetRecord.relativePath}#${name}`;
            const sites = tables.refs.get(symbolId) ?? [];
            sites.push({ fromFile: record.relativePath, coverageClass: 'file-proxy-only' });
            tables.refs.set(symbolId, sites);
          }
        }
      }

      ts.forEachChild(node, walk);
    }
  }

  // Deterministic ordering — sort every table so the IR is byte-stable.
  tables.files.sort((a, b) => a.id.localeCompare(b.id));
  tables.symbols.sort((a, b) => a.id.localeCompare(b.id));
  tables.imports.sort(
    (a, b) =>
      a.fromFile.localeCompare(b.fromFile) ||
      a.specifier.localeCompare(b.specifier) ||
      (a.targetFile ?? '').localeCompare(b.targetFile ?? ''),
  );
  tables.facts.sort(
    (a, b) =>
      a.file.localeCompare(b.file) ||
      (a.line ?? 0) - (b.line ?? 0) ||
      a.oracleId.localeCompare(b.oracleId) ||
      a.property.localeCompare(b.property),
  );

  // refs: drop any symbolId that has no SymbolNode (e.g. a name imported from a
  // file that declares it only as a non-exported binding) — makeRepoIR requires
  // every refs key to be a known SymbolId. Sort sites for determinism.
  const knownSymbolIds = new Set(tables.symbols.map((s) => s.id));
  const refs = new Map<SymbolId, readonly RefSite[]>();
  for (const symbolId of [...tables.refs.keys()].sort((a, b) => a.localeCompare(b))) {
    if (!knownSymbolIds.has(symbolId)) continue;
    const sites = [...tables.refs.get(symbolId)!].sort((a, b) => a.fromFile.localeCompare(b.fromFile));
    refs.set(symbolId, sites);
  }

  const packages: PackageNode[] = packageInfos
    .map((pkg) => ({
      name: pkg.name,
      srcDir: pkg.srcDir,
      manifestDeps: pkg.dependencies,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Drop a symbol whose file is, by some profile quirk, not in the file table —
  // makeRepoIR would (correctly) reject it; the records loop guarantees the file
  // is present, so this is belt-and-braces consistency, not a silent skip path.
  const fileIds = new Set(tables.files.map((f) => f.id));
  const symbols = tables.symbols.filter((s) => fileIds.has(s.file));

  return makeRepoIR({
    files: tables.files,
    symbols,
    imports: tables.imports,
    packages,
    refs,
    facts: tables.facts,
  });
}

/**
 * The by-name bindings an import/export-from declaration references from its
 * target module — `*` for a namespace/whole-module import, the imported/exported
 * names otherwise. Mirrors the structure pass's reference accounting so the IR's
 * reverse index matches the audit's module graph.
 */
function referencedNames(node: ts.ImportDeclaration | ts.ExportDeclaration): readonly string[] {
  const names = new Set<string>();
  if (ts.isImportDeclaration(node)) {
    const clause = node.importClause;
    if (clause?.name) names.add('default');
    if (clause?.namedBindings) {
      if (ts.isNamespaceImport(clause.namedBindings)) {
        names.add('*');
      } else {
        for (const el of clause.namedBindings.elements) names.add(el.propertyName?.text ?? el.name.text);
      }
    }
    if (!clause) names.add('*');
  } else if (node.exportClause && ts.isNamedExports(node.exportClause)) {
    for (const el of node.exportClause.elements) names.add(el.propertyName?.text ?? el.name.text);
  } else {
    names.add('*');
  }
  return [...names];
}
