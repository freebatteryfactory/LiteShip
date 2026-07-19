/**
 * The HOST-SIDE repo-IR builder (Slice B, phase B1 — step 2).
 *
 * `@liteship/gauntlet` DEFINES the {@link RepoIR} interface but carries no
 * `typescript` dep — it is the lean, downstream-installable engine and the IR is
 * an INJECTED capability (owner-ratified ⚑ decision 1). THIS module is the host
 * half: `@liteship/audit` (which already deps `typescript`) materializes a real
 * {@link RepoIR} from a {@link DevopsProfile}'s source corpus and a CLI host
 * injects it into the gauntlet run. The dependency direction is `audit →
 * gauntlet` (gauntlet stays a leaf; no cycle — gauntlet deps only @liteship/error +
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
 *   • FACTS — the triangulation substrate (B1):
 *       - `is-default-export` from the AST-precise `ts-ast` oracle
 *         (`file-proxy-only`, via {@link emitFileProxyFact}). This is the STRUCTURAL
 *         oracle every TS repo has — it is NOT LiteShip config. A SECOND,
 *         host-injected `invariant-regex` (`text-only`) oracle for the same
 *         property is supplied by the CLI host through {@link buildRepoIR}'s
 *         `extraFactOracles` hook (the LiteShip-local `NO_DEFAULT_EXPORT` regex
 *         rule lives with the host, which deps `@liteship/command`; the audit engine
 *         stays LiteShip-agnostic — ADR-0012). Where the two disagree at a
 *         `(file, line)` the Step-3 divergence gate reports it (the text oracle
 *         fired on a comment the AST correctly ignores).
 *       - `bare-throw` from the AST oracle (`ts-ast`, `file-proxy-only`): the
 *         precise version of the `no-bare-throw` regex gate, folded by the Step-3
 *         `noBareThrowIRGate` (parity-tested against the regex gate).
 *
 * The {@link FactOracle} injection hook keeps the engine boundary clean: audit
 * runs its OWN structural AST oracle, then invokes any host-supplied oracles and
 * merges their Facts into the single IR — knowing NOTHING about what they check.
 * Any repo-local rule set (LiteShip's `INVARIANTS`, a downstream's own) is
 * INJECTED by the host, never baked into the published audit engine.
 *
 * Determinism: the source corpus is read sorted; symbols, edges, and facts are
 * sorted before assembly; `contentDigest` is over file bytes only (no mtime, no
 * run-id). Building twice over unchanged source yields a byte-stable IR — the
 * invariant the B2 content-addressed cache will depend on.
 *
 * @module
 */
import ts from 'typescript';
import { addressedDigestOf } from '@liteship/canonical';
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
  type FileId,
  type PkgName,
  type Fact,
  type CoverageClass,
} from '@liteship/gauntlet';
import { liteshipDevopsProfile } from './devops-profile.js';
import type { DevopsProfile } from './devops-profile.js';
import { listProfilePackageManifests, readProfileSourceFileRecords } from './shared.js';
import type { SourceFileRecord } from './shared.js';
import { buildPackageExportTargets, hasModifier, resolveImport } from './structure.js';
import { createTypeDirectedProgram } from './ts-program.js';
import { symbolReferenceOracle } from './repo-ir-language-service.js';

/** UTF-8 encoder reused across files (stateless, deterministic). */
const UTF8 = new TextEncoder();

/**
 * A host-supplied fact oracle — the injection hook that keeps `@liteship/audit`
 * LiteShip-agnostic (ADR-0012). It is a PURE function the host passes to
 * {@link buildRepoIR}: given one source file's raw text + path + owning package,
 * it returns the {@link Fact}s it observes. `buildRepoIR` invokes each injected
 * oracle per file and merges the returned facts into the single IR, knowing
 * NOTHING about what they check.
 *
 * This is where a repo-LOCAL rule set enters the IR WITHOUT the engine importing
 * it. The canonical example is the host's `invariant-regex` oracle: the CLI (which
 * deps `@liteship/command`) constructs an oracle that runs LiteShip's
 * `NO_DEFAULT_EXPORT` rule over the file text and emits `is-default-export`
 * `text-only` facts — the audit engine never sees `@liteship/command`. The generic
 * structural facts (`is-default-export` via AST, `bare-throw`) STAY in audit
 * because they are facts EVERY TS repo has, not LiteShip config.
 *
 * Text-only oracles work off `text` + `file`; an oracle that needs the parsed
 * tree is given the canonical `sourceFile` (the very `ts.SourceFile` audit
 * walked). The contract is: emit Facts whose `file` IS the passed `file` (so the
 * fact lands on a real IR node) — `buildRepoIR` rejects a dangling fact via
 * `makeRepoIR`, exactly as for its own facts.
 */
export type FactOracle = (input: {
  readonly file: FileId;
  readonly text: string;
  readonly packageName: PkgName | null;
  readonly sourceFile: ts.SourceFile;
}) => readonly Fact[];

/** Options for {@link buildRepoIR} — the host-injection surface. */
export interface BuildRepoIROptions {
  /**
   * Host-supplied extra oracles (e.g. the LiteShip `invariant-regex` oracle the
   * CLI injects). Each is invoked per source file and its facts merged into the
   * IR. Empty/omitted → audit emits ONLY its own structural AST facts.
   */
  readonly extraFactOracles?: readonly FactOracle[];
  /**
   * Run the SYMBOL-EVIDENCED LanguageService oracle (B3.3) — true cross-file
   * symbol references via a `ts.LanguageService`, cross-checked against the
   * file-proxy-only `refs` graph by the symbol-orphan divergence gate. OFF by
   * default: it is the heaviest oracle in the set (a whole-repo LanguageService +
   * a reference query per exported symbol), so it is opt-in (`liteship check --ir
   * --symbols`) and amortized by the B2 verdict cache. Without it, the gate finds
   * nothing (no symbol-evidenced facts) — harmless.
   */
  readonly withSymbolReferences?: boolean;
}

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
 * Emit a `file-proxy-only` {@link Fact} (the AST-precise oracle class). One of the
 * per-oracle emit helpers — its sibling {@link emitTextOnlyFact} emits the
 * known-imprecise regex oracle's facts (a later step adds the `ts-program`
 * symbol-evidenced helper). Extensible by construction: pass the `property`/`value`.
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

/**
 * Is `node` a bare native-error throw — `throw new (Error|RangeError|TypeError)(…)`
 * — the AST-precise version of the `no-bare-throw` gate's regex? This is the
 * file-proxy oracle for the `bare-throw` property: it sees the real throw
 * statement, so (unlike the regex) it never fires on the token inside a comment
 * or string. The Step-3 parity test proves the IR fold reproduces the gate's real
 * findings AND is a strict refinement of the text scan.
 */
function isBareNativeThrow(node: ts.Node): node is ts.ThrowStatement {
  if (!ts.isThrowStatement(node)) return false;
  const expr = node.expression;
  if (!ts.isNewExpression(expr) || !ts.isIdentifier(expr.expression)) return false;
  const callee = expr.expression.text;
  return callee === 'Error' || callee === 'RangeError' || callee === 'TypeError';
}

/**
 * Is `node` a REAL legacy variable statement — a `ts.VariableStatement` whose
 * declaration list carries neither the Const nor the Let NodeFlag (i.e. the
 * legacy binding form the NO_VAR invariant bans)? This is the AST-precise oracle
 * for the `var-declaration` property: it sees the real statement, so (unlike the
 * comment-blind regex) it never fires on the keyword inside a comment or string.
 * The B3.2 cross-check triangulates this against the canonical NO_VAR regex.
 */
function isLegacyVarStatement(node: ts.Node): node is ts.VariableStatement {
  if (!ts.isVariableStatement(node)) return false;
  const flags = node.declarationList.flags;
  return (flags & ts.NodeFlags.Const) === 0 && (flags & ts.NodeFlags.Let) === 0;
}

/**
 * Is `node` a real CommonJS-loader call — a `ts.CallExpression` whose callee is
 * the bare `require` identifier? This is the AST-precise oracle for the
 * `require-call` property: it sees the real call, so (unlike the comment-blind
 * regex) it never fires on the loader name inside a comment or string. The B3.2
 * cross-check triangulates this against the canonical NO_REQUIRE regex.
 */
function isRequireCall(node: ts.Node): node is ts.CallExpression {
  return ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'require';
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
 * @param options Host-injection surface. `extraFactOracles` are the host-supplied
 *   {@link FactOracle}s (e.g. the CLI's LiteShip `invariant-regex` oracle) whose
 *   facts merge into the IR alongside audit's own structural AST facts. The audit
 *   engine itself imports no repo-local rule set — the boundary is the hook.
 */
export function buildRepoIR(profile: DevopsProfile = liteshipDevopsProfile, options: BuildRepoIROptions = {}): RepoIR {
  const extraFactOracles = options.extraFactOracles ?? [];
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
  const recordByAbsTarget = new Map<string, SourceFileRecord>(records.map((r) => [r.absolutePath, r] as const));

  const tables: Tables = { files: [], symbols: [], imports: [], facts: [], refs: new Map() };

  for (const record of records) {
    tables.files.push({
      id: record.relativePath,
      contentDigest: contentDigestOf(record.text),
      packageName: record.packageName,
    });

    const sourceFile = record.sourceFile;

    // ── Host-injected oracles ─────────────────────────────────────────────
    // Invoke every host-supplied FactOracle on this file and merge its facts.
    // The audit engine knows NOTHING about what they check — this is the clean
    // ADR-0012 boundary: a repo-LOCAL rule set (LiteShip's NO_DEFAULT_EXPORT
    // invariant-regex oracle, injected by the CLI host) enters the IR here
    // WITHOUT the engine importing it. makeRepoIR rejects a dangling fact, so an
    // oracle that mis-targets its `file` fails loudly, exactly like audit's own.
    for (const oracle of extraFactOracles) {
      for (const fact of oracle({
        file: record.relativePath,
        text: record.text,
        packageName: record.packageName,
        sourceFile,
      })) {
        tables.facts.push(fact);
      }
    }

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
          emitFileProxyFact(
            tables.facts,
            record.relativePath,
            line,
            'is-default-export',
            true,
            'ts-ast',
            'file-proxy-only',
          );
        } else if (sym.kind === 're-export' && sym.name === 'default') {
          emitFileProxyFact(
            tables.facts,
            record.relativePath,
            line,
            'is-default-export',
            true,
            'ts-ast',
            'file-proxy-only',
          );
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
        const targetRecord = resolved.targetFile !== null ? recordByAbsTarget.get(resolved.targetFile) : undefined;

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

      // ── The bare-throw fact (AST-precise) — the file-proxy oracle for the
      // no-bare-throw gate. A `throw new (Error|RangeError|TypeError)(…)` real
      // throw statement (NEVER the token inside a comment/string, which the
      // codeOnly-stripping regex gate can mishandle): the AST sees the statement,
      // so it is a strict refinement of the text scan. The `noBareThrowIRGate`
      // (Step 3) folds these facts and the parity test proves it reproduces the
      // regex gate's real findings.
      if (isBareNativeThrow(node)) {
        emitFileProxyFact(
          tables.facts,
          record.relativePath,
          lineOf(sourceFile, node),
          'bare-throw',
          true,
          'ts-ast',
          'file-proxy-only',
        );
      }

      // ── The var-declaration fact (AST-precise) — the file-proxy oracle for the
      // NO_VAR invariant (B3.2). A real legacy variable statement (NodeFlags lack
      // Const + Let): the AST sees the statement, never the keyword inside a
      // comment/string the comment-blind regex can mishandle. The
      // noVarDivergenceGate (host-injected regex oracle) triangulates these.
      if (isLegacyVarStatement(node)) {
        emitFileProxyFact(
          tables.facts,
          record.relativePath,
          lineOf(sourceFile, node),
          'var-declaration',
          true,
          'ts-ast',
          'file-proxy-only',
        );
      }

      // ── The require-call fact (AST-precise) — the file-proxy oracle for the
      // NO_REQUIRE invariant (B3.2). A real CommonJS-loader call (callee is the
      // bare `require` identifier): the AST sees the call, never the loader name
      // inside a comment/string. The noRequireDivergenceGate triangulates these.
      if (isRequireCall(node)) {
        emitFileProxyFact(
          tables.facts,
          record.relativePath,
          lineOf(sourceFile, node),
          'require-call',
          true,
          'ts-ast',
          'file-proxy-only',
        );
      }

      ts.forEachChild(node, walk);
    }
  }

  // ── The symbol-evidenced LanguageService oracle (B3.3, opt-in) ───────────
  // A WHOLE-CORPUS oracle (a ts.LanguageService, not a per-file FactOracle), so it
  // runs once here after the per-file loop. Its symbol-evidenced facts merge into
  // the same table; the symbol-orphan divergence gate cross-checks them against the
  // file-proxy-only `refs` graph. Heaviest oracle → opt-in (default off).
  if (options.withSymbolReferences === true) {
    for (const fact of symbolReferenceOracle({ profile })) tables.facts.push(fact);
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
  // De-duplicate by SymbolId: TypeScript DECLARATION MERGING (an `interface` + a
  // same-named `const`/`namespace` in one file — e.g. `AssetRegistry` the value +
  // `AssetRegistry` the interface — or overloaded function declarations) yields
  // several exported declaration nodes that share `<file>#<name>`. They are ONE
  // logical exported symbol in the IR's symbol table, so collapse them to the
  // first (the tables are already id-sorted → deterministic). This is NOT a silent
  // skip: the symbol IS recorded (the first declaration locates it); merging is the
  // correct model for the symbol graph (the is-default-export / bare-throw FACTS
  // are emitted independently per node, so the dedup never drops a fact).
  const seenSymbolIds = new Set<string>();
  const symbols = tables.symbols
    .filter((s) => fileIds.has(s.file))
    .filter((s) => {
      if (seenSymbolIds.has(s.id)) return false;
      seenSymbolIds.add(s.id);
      return true;
    });

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
