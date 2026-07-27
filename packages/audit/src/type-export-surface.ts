/**
 * TYPE-export surface enumerator — the one new mechanism minted for Wave 8.5
 * (issue #156) that closes the api-surface snapshot's structural blind spot.
 *
 * The committed api-surface snapshot (`tests/fixtures/api-surface-snapshot.json`,
 * `snapshotFormat:1`) is RUNTIME-derived: it enumerates a barrel's VALUE exports
 * via `import * as`, so `export type` / `interface` declarations — erased at
 * runtime, absent from the module namespace object — are structurally invisible to
 * it. A type dropped, renamed, or added on a package's public surface (the exact
 * CLASS of slip that let `CapSet` drift under the value gate's nose) passes it
 * clean. This enumerator walks the SHIPPED `.ts` / `.d.ts` AST — never the runtime
 * namespace — and records every EXPORTED type on a package's PUBLIC surface, so a
 * type-surface change is a snapshot drift the gate reds on. It makes the spine's
 * `intentionally-omitted` relation mechanically checkable: a mirror type that
 * disappears is either a reviewed snapshot regeneration or a caught drift.
 *
 * PURE AST, NO TYPE CHECKER: a syntactic export walk over `ts.SourceFile` (the
 * same substrate `structure.ts` / `extractSymbols` use). It is therefore
 * independent of the `WORKSPACE_ALIASES` resolution subset — it covers every
 * package, including `@liteship/error` / `@liteship/gauntlet` / `@liteship/command`, whose
 * cross-package types a type-directed program would collapse to `any`.
 *
 * PUBLIC SURFACE, not every exported declaration: enumeration starts at a
 * package's entry file and follows only RELATIVE `export * from './x'` re-exports
 * (BFS over the package's own graph), plus records type-only NAMED re-exports
 * directly. An internal-only exported type never reached from the entry is not on
 * the public surface and is not counted — so the snapshot stays stable against
 * internal refactors, matching the api-surface gate's public-contract discipline.
 *
 * POLICY-FREE (ADR-0012): this module names no LiteShip roster. The host (the
 * devops test) supplies the `{ name, entryFile }` roster; the audit engine only
 * folds the AST.
 *
 * @module
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import ts from 'typescript';
import { hasModifier } from './structure.js';

/** The kinds of TYPE-meaning export the surface tracks. */
export type TypeExportKind = 'interface' | 'type' | 'enum' | 'namespace';

/** One type export on a package's public surface: its name and declaration kind. */
export interface TypeExportDescriptor {
  readonly name: string;
  readonly kind: TypeExportKind;
}

/** A single package's public type surface (sorted, de-duplicated). */
export interface PackageTypeSurface {
  readonly typeExports: readonly TypeExportDescriptor[];
}

/** One entry in the enumeration roster — a package name and its source entry file. */
export interface TypeExportRosterEntry {
  readonly name: string;
  /** Absolute path to the package's SOURCE entry (`src/index.ts` / `index.d.ts`). */
  readonly entryFile: string;
}

/** The committed type-export surface across a roster of packages. */
export interface TypeExportSurfaceSnapshot {
  /** Bumped only if the descriptor schema itself changes. */
  readonly snapshotFormat: 1;
  readonly packages: Readonly<Record<string, PackageTypeSurface>>;
}

/**
 * The filesystem seam the enumerator reads through — injectable so the walk is a
 * pure unit under test (a virtual file map) and policy-free in production (the
 * real `fs`).
 */
export interface SurfaceReader {
  readFile(path: string): string;
  fileExists(path: string): boolean;
}

/** The default reader — the real filesystem. */
export const DEFAULT_SURFACE_READER: SurfaceReader = {
  readFile: (path) => readFileSync(path, 'utf8'),
  fileExists: (path) => existsSync(path),
};

/** Deterministic UTF-16 code-unit order — locale-independent, byte-stable. */
function codeUnitCompare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Resolve a RELATIVE module specifier to a concrete source file, or null when it
 * does not resolve to a package-local `.ts` / `.d.ts`. Handles the two shipped
 * extension conventions: a `.d.ts` specifier resolves directly (the spine index
 * does `export * from './core.d.ts'`), and a `.js` specifier maps back to its
 * `.ts` / `.d.ts` source (runtime barrels do `export … from './x.js'`).
 */
function resolveRelativeSource(fromFile: string, spec: string, reader: SurfaceReader): string | null {
  const base = resolve(dirname(fromFile), spec);
  const candidates: string[] = [];
  if (spec.endsWith('.d.ts')) {
    candidates.push(base);
  } else if (spec.endsWith('.js')) {
    const stem = base.slice(0, -'.js'.length);
    candidates.push(`${stem}.ts`, `${stem}.d.ts`, `${stem}.tsx`, join(stem, 'index.ts'), join(stem, 'index.d.ts'));
  } else {
    candidates.push(
      base,
      `${base}.ts`,
      `${base}.d.ts`,
      `${base}.tsx`,
      join(base, 'index.ts'),
      join(base, 'index.d.ts'),
    );
  }
  for (const candidate of candidates) {
    if (reader.fileExists(candidate)) return candidate;
  }
  return null;
}

/** True when a named-export element is TYPE-only (`export type {}` or `export { type X }`). */
function elementIsTypeOnly(decl: ts.ExportDeclaration, element: ts.ExportSpecifier): boolean {
  return decl.isTypeOnly || element.isTypeOnly;
}

/**
 * A PLAIN (value-or-type) named re-export `export { A as B } from './rel'` whose
 * TYPE half — if any — is resolved by looking the ORIGINAL name (`A`) up in the
 * target module's type surface. `importedName` is `A` (the source name under
 * aliasing), `exportedName` is `B` (the name it is re-exported under here). A pure
 * VALUE re-export resolves to nothing; the type half of a value+type dual (a branded
 * `ContentAddress`, a namespace, an interface) is recorded under `exportedName`.
 */
interface NamedReExport {
  readonly target: string;
  readonly importedName: string;
  readonly exportedName: string;
}

/**
 * The direct type exports DECLARED or type-only RE-EXPORTED in one source file,
 * plus the relative `export * from './x'` targets to follow. A star re-export from
 * a BARE specifier (an external package) is unresolvable here and contributes
 * nothing to THIS package's owned surface.
 */
function scanFile(
  file: string,
  reader: SurfaceReader,
): {
  readonly exports: readonly TypeExportDescriptor[];
  readonly starTargets: readonly string[];
  readonly namedReExports: readonly NamedReExport[];
} {
  const text = reader.readFile(file);
  const sourceFile = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const exports: TypeExportDescriptor[] = [];
  const starTargets: string[] = [];
  const namedReExports: NamedReExport[] = [];

  for (const node of sourceFile.statements) {
    if (ts.isInterfaceDeclaration(node) && hasModifier(node, ts.SyntaxKind.ExportKeyword)) {
      exports.push({ name: node.name.text, kind: 'interface' });
      continue;
    }
    if (ts.isTypeAliasDeclaration(node) && hasModifier(node, ts.SyntaxKind.ExportKeyword)) {
      exports.push({ name: node.name.text, kind: 'type' });
      continue;
    }
    if (ts.isEnumDeclaration(node) && hasModifier(node, ts.SyntaxKind.ExportKeyword)) {
      exports.push({ name: node.name.text, kind: 'enum' });
      continue;
    }
    if (ts.isModuleDeclaration(node) && ts.isIdentifier(node.name) && hasModifier(node, ts.SyntaxKind.ExportKeyword)) {
      exports.push({ name: node.name.text, kind: 'namespace' });
      continue;
    }
    if (ts.isExportDeclaration(node)) {
      // `export * from './x'` / `export * from 'pkg'` — no clause. Follow only the
      // relative form; a bare specifier is another package's surface.
      if (node.exportClause === undefined) {
        if (node.moduleSpecifier !== undefined && ts.isStringLiteral(node.moduleSpecifier)) {
          const spec = node.moduleSpecifier.text;
          if (spec.startsWith('.')) {
            const target = resolveRelativeSource(file, spec, reader);
            if (target !== null) starTargets.push(target);
          }
        }
        continue;
      }
      // `export { … } from '…'` or local `export { … }`. A TYPE-only element is a
      // type directly. A PLAIN element re-exported from a RELATIVE module may still
      // carry a TYPE half — a value+type dual (a branded `ContentAddress`), a
      // namespace, or an interface backing a same-named value — so it is deferred to
      // a NAMED-RE-EXPORT check that resolves the ORIGINAL name against the target
      // module's type surface (a pure-value re-export resolves to nothing, so the
      // value surface stays the api-surface gate's concern; the type half is no
      // longer lost). NOTE: a purely LOCAL `export { X }` (no module specifier) that
      // names a NON-exported same-file type is out of scope — the shipped barrels
      // re-export their duals through a relative specifier, which this covers.
      if (ts.isNamedExports(node.exportClause)) {
        const relTarget =
          node.moduleSpecifier !== undefined &&
          ts.isStringLiteral(node.moduleSpecifier) &&
          node.moduleSpecifier.text.startsWith('.')
            ? resolveRelativeSource(file, node.moduleSpecifier.text, reader)
            : null;
        for (const element of node.exportClause.elements) {
          if (elementIsTypeOnly(node, element)) {
            exports.push({ name: element.name.text, kind: 'type' });
          } else if (relTarget !== null) {
            namedReExports.push({
              target: relTarget,
              importedName: (element.propertyName ?? element.name).text,
              exportedName: element.name.text,
            });
          }
        }
      }
    }
  }
  return { exports, starTargets, namedReExports };
}

/**
 * The complete type surface a single `file` contributes: its own declared types,
 * the union of every relative `export *` target's surface, AND — for each PLAIN
 * named re-export `export { A as B } from './rel'` — the type half of `A` resolved
 * against `./rel`'s surface (recorded under `B`). Memoized by file so a diamond
 * re-export is scanned once; the memo doubles as a cycle guard (an in-progress file
 * resolves to its partial surface rather than recursing forever).
 */
function typeSurfaceOf(
  file: string,
  reader: SurfaceReader,
  memo: Map<string, TypeExportDescriptor[]>,
): readonly TypeExportDescriptor[] {
  const cached = memo.get(file);
  if (cached !== undefined) return cached;
  const out: TypeExportDescriptor[] = [];
  memo.set(file, out); // cycle guard: a re-entrant call reads this (growing) array
  let scanned: ReturnType<typeof scanFile>;
  try {
    scanned = scanFile(file, reader);
  } catch {
    return out;
  }
  out.push(...scanned.exports);
  for (const target of scanned.starTargets) out.push(...typeSurfaceOf(target, reader, memo));
  for (const re of scanned.namedReExports) {
    // A plain named re-export carries a TYPE half iff its ORIGINAL name resolves to a
    // type in the target's surface. A pure-value re-export finds nothing here.
    for (const descriptor of typeSurfaceOf(re.target, reader, memo)) {
      if (descriptor.name === re.importedName) out.push({ name: re.exportedName, kind: descriptor.kind });
    }
  }
  return out;
}

/**
 * Enumerate a package's PUBLIC type surface from `entryFile`, following relative
 * `export *` re-exports AND resolving the TYPE half of plain named re-exports
 * (value+type duals, re-exported namespaces/interfaces — the blind spot a
 * type-only-specifier scan left open). Deterministic — the result is de-duplicated
 * by `(name, kind)` and sorted by name then kind.
 */
export function enumeratePackageTypeExports(
  entryFile: string,
  reader: SurfaceReader = DEFAULT_SURFACE_READER,
): readonly TypeExportDescriptor[] {
  const surface = typeSurfaceOf(entryFile, reader, new Map());
  const seen = new Set<string>();
  const collected: TypeExportDescriptor[] = [];
  for (const descriptor of surface) {
    const key = `${descriptor.name} ${descriptor.kind}`;
    if (seen.has(key)) continue;
    seen.add(key);
    collected.push(descriptor);
  }
  return collected.sort((a, b) => codeUnitCompare(a.name, b.name) || codeUnitCompare(a.kind, b.kind));
}

/**
 * Build the type-export surface across a roster of packages. The roster is
 * host-supplied (policy-free, ADR-0012); entries are enumerated in name order.
 */
export function buildTypeExportSurface(
  roster: readonly TypeExportRosterEntry[],
  reader: SurfaceReader = DEFAULT_SURFACE_READER,
): TypeExportSurfaceSnapshot {
  const packages: Record<string, PackageTypeSurface> = {};
  for (const entry of [...roster].sort((a, b) => codeUnitCompare(a.name, b.name))) {
    packages[entry.name] = { typeExports: enumeratePackageTypeExports(entry.entryFile, reader) };
  }
  return { snapshotFormat: 1, packages };
}

/**
 * Byte-canonical serialization of a type-export surface: package names sorted,
 * each descriptor emitted `name` → `kind` in fixed key order, 2-space indent,
 * trailing newline. Re-serializing a committed snapshot is a no-op.
 */
export function serializeTypeExportSurface(snapshot: TypeExportSurfaceSnapshot): string {
  const packageNames = Object.keys(snapshot.packages).sort(codeUnitCompare);
  const packages: Record<string, PackageTypeSurface> = {};
  for (const name of packageNames) {
    const surface = snapshot.packages[name]!;
    packages[name] = {
      typeExports: [...surface.typeExports]
        .sort((a, b) => codeUnitCompare(a.name, b.name) || codeUnitCompare(a.kind, b.kind))
        .map((descriptor) => ({ name: descriptor.name, kind: descriptor.kind })),
    };
  }
  return `${JSON.stringify({ snapshotFormat: snapshot.snapshotFormat, packages }, null, 2)}\n`;
}

/** One per-type difference between a committed and a live type-export surface. */
export interface TypeExportDrift {
  readonly pkg: string;
  readonly detail: string;
  readonly changeClass: 'added' | 'removed' | 'kind-changed' | 'package-added' | 'package-removed';
}

/**
 * Per-type diff of two surfaces — the human-readable drift report the gate prints
 * so a reviewer sees exactly which type left or entered the surface (the CapSet
 * class of slip, now named rather than buried in a byte diff).
 */
export function diffTypeExportSurface(
  committed: TypeExportSurfaceSnapshot,
  live: TypeExportSurfaceSnapshot,
): readonly TypeExportDrift[] {
  const drift: TypeExportDrift[] = [];
  const allPackages = new Set<string>([...Object.keys(committed.packages), ...Object.keys(live.packages)]);
  for (const pkg of [...allPackages].sort(codeUnitCompare)) {
    const before = committed.packages[pkg];
    const after = live.packages[pkg];
    if (before === undefined) {
      drift.push({ pkg, detail: `package entered the type surface`, changeClass: 'package-added' });
      continue;
    }
    if (after === undefined) {
      drift.push({ pkg, detail: `package left the type surface`, changeClass: 'package-removed' });
      continue;
    }
    const beforeByName = new Map(before.typeExports.map((d) => [d.name, d.kind] as const));
    const afterByName = new Map(after.typeExports.map((d) => [d.name, d.kind] as const));
    const names = new Set<string>([...beforeByName.keys(), ...afterByName.keys()]);
    for (const name of [...names].sort(codeUnitCompare)) {
      const b = beforeByName.get(name);
      const a = afterByName.get(name);
      if (b === undefined) drift.push({ pkg, detail: `+ ${name} (${a})`, changeClass: 'added' });
      else if (a === undefined) drift.push({ pkg, detail: `- ${name} (${b})`, changeClass: 'removed' });
      else if (a !== b) drift.push({ pkg, detail: `~ ${name} (${b} → ${a})`, changeClass: 'kind-changed' });
    }
  }
  return drift;
}
