/**
 * Exact public type-surface contract for `@liteship/_spine`.
 *
 * The declaration leaves are the semantic owners. This module asks TypeScript
 * what each leaf actually exports, admits only symbols with type meaning into
 * the root barrel, and refuses ambiguous or undocumented public names. It is
 * deliberately independent of TypeDoc: documentation is projected from the
 * same declarations consumers compile.
 *
 * @module
 */

import { readFileSync, readdirSync } from 'node:fs';
import { basename, relative, resolve } from 'node:path';
import ts from 'typescript';

export type SpineSymbolKind = 'class' | 'enum' | 'interface' | 'namespace' | 'type';

/** One type-capable public symbol owned by one declaration leaf. */
export interface SpineSymbolContract {
  readonly name: string;
  readonly kind: SpineSymbolKind;
  readonly leaf: string;
  readonly moduleSpecifier: `./${string}.js`;
  readonly summary: string;
}

/** A declaration that has runtime meaning only and must not enter the root type barrel. */
export interface SpineRejectedValue {
  readonly name: string;
  readonly leaf: string;
}

export interface SpineSurfaceAnalysis {
  readonly symbols: readonly SpineSymbolContract[];
  readonly rejectedValues: readonly SpineRejectedValue[];
  readonly collisions: readonly string[];
  readonly undocumented: readonly string[];
}

function codeUnitCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function resolvedSymbol(checker: ts.TypeChecker, symbol: ts.Symbol): ts.Symbol {
  return (symbol.flags & ts.SymbolFlags.Alias) !== 0 ? checker.getAliasedSymbol(symbol) : symbol;
}

function symbolKind(symbol: ts.Symbol): SpineSymbolKind {
  if ((symbol.flags & ts.SymbolFlags.Class) !== 0) return 'class';
  if ((symbol.flags & ts.SymbolFlags.Enum) !== 0) return 'enum';
  if ((symbol.flags & ts.SymbolFlags.Interface) !== 0) return 'interface';
  if ((symbol.flags & ts.SymbolFlags.Namespace) !== 0) return 'namespace';
  return 'type';
}

function oneLine(text: string): string {
  return text.replace(/\s+/gu, ' ').trim();
}

/**
 * Analyze a TypeScript program containing the declaration leaves.
 *
 * A name exported by two leaves is always ambiguous, even when the underlying
 * aliases happen to be structurally equal: consumers deserve one named owner.
 */
export function analyzeSpineProgram(
  program: ts.Program,
  leafFiles: readonly string[],
  spineRoot: string,
): SpineSurfaceAnalysis {
  const checker = program.getTypeChecker();
  const byName = new Map<string, SpineSymbolContract[]>();
  const rejectedValues: SpineRejectedValue[] = [];
  const undocumented: string[] = [];

  for (const fileName of [...leafFiles].sort(codeUnitCompare)) {
    const source = program.getSourceFile(fileName);
    if (source === undefined) throw new Error(`spine surface: TypeScript did not load ${fileName}`);
    const moduleSymbol = checker.getSymbolAtLocation(source);
    if (moduleSymbol === undefined) throw new Error(`spine surface: ${fileName} is not an external module`);
    const leaf = relative(spineRoot, fileName).replaceAll('\\', '/');
    const stem = basename(leaf, '.d.ts');
    for (const exported of checker.getExportsOfModule(moduleSymbol)) {
      const symbol = resolvedSymbol(checker, exported);
      const hasTypeMeaning = (symbol.flags & (ts.SymbolFlags.Type | ts.SymbolFlags.Namespace)) !== 0;
      if (!hasTypeMeaning) {
        rejectedValues.push({ name: exported.name, leaf });
        continue;
      }
      const summary = oneLine(ts.displayPartsToString(symbol.getDocumentationComment(checker)));
      const contract: SpineSymbolContract = {
        name: exported.name,
        kind: symbolKind(symbol),
        leaf,
        moduleSpecifier: `./${stem}.js`,
        summary,
      };
      const owners = byName.get(contract.name) ?? [];
      owners.push(contract);
      byName.set(contract.name, owners);
      if (summary.length === 0) undocumented.push(`${leaf}:${contract.name}`);
    }
  }

  const collisions = [...byName]
    .filter(([, owners]) => owners.length > 1)
    .map(([name, owners]) => `${name}: ${owners.map((owner) => owner.leaf).join(', ')}`)
    .sort(codeUnitCompare);
  const symbols = [...byName.values()]
    .filter((owners) => owners.length === 1)
    .map((owners) => owners[0]!)
    .sort((left, right) => codeUnitCompare(left.leaf, right.leaf) || codeUnitCompare(left.name, right.name));

  return {
    symbols,
    rejectedValues: rejectedValues.sort(
      (left, right) => codeUnitCompare(left.leaf, right.leaf) || codeUnitCompare(left.name, right.name),
    ),
    collisions,
    undocumented: undocumented.sort(codeUnitCompare),
  };
}

/** Discover the 16 authored declaration leaves and analyze their public types. */
export function analyzeRepositorySpine(repoRoot: string): SpineSurfaceAnalysis {
  const spineRoot = resolve(repoRoot, 'packages/_spine');
  const leafFiles = readdirSync(spineRoot)
    .filter((name) => name.endsWith('.d.ts') && name !== 'index.d.ts')
    .map((name) => resolve(spineRoot, name));
  const program = ts.createProgram({
    rootNames: leafFiles,
    options: {
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      target: ts.ScriptTarget.ES2022,
      strict: true,
      skipLibCheck: true,
      types: [],
    },
  });
  return analyzeSpineProgram(program, leafFiles, spineRoot);
}

/** Build a pure in-memory declaration program for planted generator controls. */
export function analyzeSpineSources(sources: Readonly<Record<string, string>>): SpineSurfaceAnalysis {
  const spineRoot = resolve('/virtual-spine');
  const options: ts.CompilerOptions = {
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    target: ts.ScriptTarget.ES2022,
    strict: true,
    skipLibCheck: true,
    noLib: true,
    types: [],
  };
  const normalized = new Map(
    Object.entries(sources).map(([name, source]) => [resolve(spineRoot, name), source] as const),
  );
  const host = ts.createCompilerHost(options);
  const defaultGetSourceFile = host.getSourceFile.bind(host);
  host.fileExists = (fileName) => normalized.has(resolve(fileName));
  host.readFile = (fileName) => normalized.get(resolve(fileName));
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
    const source = normalized.get(resolve(fileName));
    return source === undefined
      ? defaultGetSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile)
      : ts.createSourceFile(fileName, source, languageVersion, true, ts.ScriptKind.TS);
  };
  const leafFiles = [...normalized.keys()];
  return analyzeSpineProgram(ts.createProgram({ rootNames: leafFiles, options, host }), leafFiles, spineRoot);
}

function assertAdmissible(analysis: SpineSurfaceAnalysis): void {
  const findings = [
    ...analysis.collisions.map((finding) => `collision ${finding}`),
    ...analysis.undocumented.map((finding) => `undocumented ${finding}`),
  ];
  if (findings.length > 0) {
    const bounded = findings.slice(0, 40);
    const suffix = findings.length > bounded.length ? `\n  ... ${findings.length - bounded.length} more` : '';
    throw new Error(`spine surface is not admissible (${findings.length}):\n  ${bounded.join('\n  ')}${suffix}`);
  }
}

/** Render the declaration-only root with explicit, named type re-exports. */
export function renderSpineBarrel(analysis: SpineSurfaceAnalysis): string {
  assertAdmissible(analysis);
  const byModule = new Map<string, SpineSymbolContract[]>();
  for (const symbol of analysis.symbols) {
    const group = byModule.get(symbol.moduleSpecifier) ?? [];
    group.push(symbol);
    byModule.set(symbol.moduleSpecifier, group);
  }
  const lines = [
    '/**',
    ' * @liteship type spine index -- generated from the declaration leaf owners.',
    ' *',
    ' * Type-only named re-exports keep the install-only root honest: value-only',
    ' * declarations remain available only to their owning mirror leaf and can never',
    ' * masquerade as a runtime API of `@liteship/_spine`.',
    ' *',
    ' * Generated by `scripts/gen-spine-surface.ts`; do not edit by hand.',
    ' * @module',
    ' */',
    '',
  ];
  for (const [moduleSpecifier, symbols] of [...byModule].sort(([left], [right]) => codeUnitCompare(left, right))) {
    lines.push(`export type {`);
    for (const symbol of symbols.sort((left, right) => codeUnitCompare(left.name, right.name))) {
      lines.push(`  ${symbol.name},`);
    }
    lines.push(`} from '${moduleSpecifier}';`, '');
  }
  return `${lines.join('\n').trimEnd()}\n`;
}

function markdownCell(value: string): string {
  return value.replaceAll('|', '\\|').replaceAll('`', '\\`');
}

/** Render the human/agent symbol index from the exact same admitted contracts. */
export function renderSpineSymbolDocumentation(analysis: SpineSurfaceAnalysis): string {
  assertAdmissible(analysis);
  const rows = analysis.symbols.map(
    (symbol) =>
      `| \`${symbol.name}\` | ${symbol.kind} | \`${symbol.leaf}\` | ${markdownCell(symbol.summary)} |`,
  );
  return [
    '# @liteship/_spine symbol index',
    '',
    'Generated from the 16 declaration leaf owners. A symbol cannot enter the root barrel unless it has type meaning, one owner, and declaration documentation.',
    '',
    '| Symbol | Kind | Owner leaf | Purpose |',
    '| --- | --- | --- | --- |',
    ...rows,
    '',
    `Value-only leaf declarations excluded from the type root: ${analysis.rejectedValues.length}.`,
    '',
  ].join('\n');
}

/** Read helper retained for focused freshness tests without a second filesystem owner. */
export function readSpineProjection(path: string): string {
  return readFileSync(path, 'utf8');
}
