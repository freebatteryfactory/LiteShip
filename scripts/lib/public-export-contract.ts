/** Exact public-export declaration ownership and paved-road inhabitation analysis. */

import { readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import ts from 'typescript';
import type { PackageCatalogRecord, PackagePublicSurfacePolicy } from '../package-catalog.js';
import { resolvePackageSourceEntrypoints } from './package-source-entrypoints.js';

export type PublicExportKind = 'type' | 'value' | 'value-and-type';
export type PublicSurfaceClass = 'paved-road' | 'advanced-module';

export interface PublicExportEntrypoint {
  readonly packageName: string;
  readonly subpath: string;
  readonly file: string;
  readonly policy: PackagePublicSurfacePolicy;
}

/** One named import consumers can actually reach through a package export map. */
export interface PublicExportContract {
  readonly packageName: string;
  readonly subpath: string;
  readonly specifier: string;
  readonly name: string;
  readonly kind: PublicExportKind;
  readonly surfaceClass: PublicSurfaceClass;
  readonly owner: string;
  /** Source declaration owner; this does not claim a concrete runtime value inhabits a structural type. */
  readonly producer: string;
  readonly audience: PackagePublicSurfacePolicy['audience'];
  readonly stability: PackagePublicSurfacePolicy['stability'];
  readonly category: 'runtime-value' | 'compile-time-type' | 'merged-value-type';
  readonly purpose: string;
  readonly example: string;
  readonly relatedInvariant: `INV-${string}`;
  readonly replacement: string;
  readonly failureContract: string;
  readonly proof: `tests/${string}.test.ts`;
}

export interface PublicExportAnalysis {
  readonly contracts: readonly PublicExportContract[];
  readonly undocumented: readonly string[];
  readonly producerless: readonly string[];
  readonly duplicateBindings: readonly string[];
}

function codeUnitCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function oneLine(value: string): string {
  return value.replace(/\s+/gu, ' ').trim();
}

function firstDocumentationBlock(source: string): string {
  const match = /\/\*\*([\s\S]*?)\*\//u.exec(source);
  if (match === null) return '';
  const lines = (match[1] ?? '').split('\n').map((line) => line.replace(/^\s*\*\s?/u, '').trim());
  const paragraph: string[] = [];
  for (const line of lines) {
    if (line.startsWith('@')) break;
    if (line === '') {
      if (paragraph.length > 0) break;
      continue;
    }
    paragraph.push(line);
  }
  return oneLine(paragraph.join(' '));
}

function resolvedSymbol(checker: ts.TypeChecker, symbol: ts.Symbol): ts.Symbol {
  if ((symbol.flags & ts.SymbolFlags.Alias) === 0) return symbol;
  const target = checker.getAliasedSymbol(symbol);
  return (target.flags & ts.SymbolFlags.Transient) !== 0 && target.declarations === undefined ? symbol : target;
}

function exportKind(symbol: ts.Symbol): PublicExportKind {
  const hasValue = (symbol.flags & ts.SymbolFlags.Value) !== 0;
  const hasType = (symbol.flags & (ts.SymbolFlags.Type | ts.SymbolFlags.Namespace)) !== 0;
  return hasValue && hasType ? 'value-and-type' : hasValue ? 'value' : 'type';
}

function category(kind: PublicExportKind): PublicExportContract['category'] {
  return kind === 'value' ? 'runtime-value' : kind === 'type' ? 'compile-time-type' : 'merged-value-type';
}

function importExample(specifier: string, name: string, kind: PublicExportKind): string {
  const typeKeyword = kind === 'type' ? 'type ' : '';
  return name === 'default'
    ? `import ${kind === 'type' ? 'type ' : ''}value from '${specifier}';`
    : `import ${typeKeyword}{ ${name} } from '${specifier}';`;
}

function deprecatedReplacement(symbol: ts.Symbol): string {
  const tag = symbol.getJsDocTags().find((candidate) => candidate.name === 'deprecated');
  if (tag === undefined) return 'none';
  const text =
    tag.text
      ?.map((part) => part.text)
      .join('')
      .trim() ?? '';
  return text === '' ? 'deprecated; no replacement declared' : `deprecated: ${oneLine(text)}`;
}

/**
 * Analyze an existing TypeScript program. This is public for planted negative
 * controls; repository discovery is kept in {@link analyzeRepositoryPublicExports}.
 */
export function analyzePublicExportProgram(
  program: ts.Program,
  entrypoints: readonly PublicExportEntrypoint[],
  repoRoot: string,
): PublicExportAnalysis {
  const checker = program.getTypeChecker();
  const contracts: PublicExportContract[] = [];
  const undocumented: string[] = [];
  const producerless: string[] = [];
  const duplicateBindings: string[] = [];
  const seen = new Set<string>();

  for (const entrypoint of [...entrypoints].sort((left, right) =>
    codeUnitCompare(`${left.packageName}:${left.subpath}`, `${right.packageName}:${right.subpath}`),
  )) {
    const source = program.getSourceFile(resolve(entrypoint.file));
    if (source === undefined) throw new Error(`public export contract: TypeScript did not load ${entrypoint.file}`);
    const moduleSymbol = checker.getSymbolAtLocation(source);
    const specifier =
      entrypoint.subpath === '.' ? entrypoint.packageName : `${entrypoint.packageName}${entrypoint.subpath.slice(1)}`;
    if (moduleSymbol === undefined) {
      const purpose = firstDocumentationBlock(source.text);
      if (!source.isDeclarationFile || !/\bdeclare\s+module\s+['"]/u.test(source.text)) {
        throw new Error(
          `public export contract: ${entrypoint.file} is neither a module nor an ambient declaration owner`,
        );
      }
      if (purpose === '') undocumented.push(`${specifier}:ambient-declarations`);
      contracts.push({
        packageName: entrypoint.packageName,
        subpath: entrypoint.subpath,
        specifier,
        name: 'ambient-declarations',
        kind: 'type',
        surfaceClass: 'advanced-module',
        owner: entrypoint.packageName,
        producer: relative(repoRoot, entrypoint.file).replaceAll('\\', '/'),
        audience: entrypoint.policy.audience,
        stability: entrypoint.policy.stability,
        category: 'compile-time-type',
        purpose,
        example: `/// <reference types="${specifier}" />`,
        relatedInvariant: entrypoint.policy.relatedInvariant,
        replacement: 'none',
        failureContract: entrypoint.policy.failureContract,
        proof: entrypoint.policy.reachabilityProof,
      });
      continue;
    }

    for (const exported of checker
      .getExportsOfModule(moduleSymbol)
      .sort((left, right) => codeUnitCompare(left.name, right.name))) {
      const key = `${specifier}:${exported.name}`;
      if (seen.has(key)) {
        duplicateBindings.push(key);
        continue;
      }
      seen.add(key);
      const target = resolvedSymbol(checker, exported);
      const kind = exportKind(target);
      const declarations = [...(target.declarations ?? exported.declarations ?? [])]
        .map((declaration) => relative(repoRoot, declaration.getSourceFile().fileName).replaceAll('\\', '/'))
        .filter((file) => file !== '' && !file.startsWith('../'))
        .sort(codeUnitCompare);
      const producer = declarations[0];
      const purpose = oneLine(
        ts.displayPartsToString(target.getDocumentationComment(checker)) ||
          ts.displayPartsToString(exported.getDocumentationComment(checker)) ||
          (exported.name === 'default' ? firstDocumentationBlock(source.text) : ''),
      );
      if (producer === undefined) producerless.push(key);
      if (purpose === '') undocumented.push(key);
      contracts.push({
        packageName: entrypoint.packageName,
        subpath: entrypoint.subpath,
        specifier,
        name: exported.name,
        kind,
        surfaceClass:
          entrypoint.packageName === 'liteship' && entrypoint.subpath === '.' ? 'paved-road' : 'advanced-module',
        owner: entrypoint.packageName,
        producer: producer ?? '(missing)',
        audience: entrypoint.policy.audience,
        stability: entrypoint.policy.stability,
        category: category(kind),
        purpose,
        example: importExample(specifier, exported.name, kind),
        relatedInvariant: entrypoint.policy.relatedInvariant,
        replacement: deprecatedReplacement(target),
        failureContract: entrypoint.policy.failureContract,
        proof: entrypoint.policy.reachabilityProof,
      });
    }
  }

  return {
    contracts,
    undocumented: undocumented.sort(codeUnitCompare),
    producerless: producerless.sort(codeUnitCompare),
    duplicateBindings: duplicateBindings.sort(codeUnitCompare),
  };
}

function compilerOptions(repoRoot: string): ts.CompilerOptions {
  const sourcePathConfig = resolve(repoRoot, 'tsconfig.test-paths.generated.json');
  const configPath = ts.sys.fileExists(sourcePathConfig) ? sourcePathConfig : resolve(repoRoot, 'tsconfig.json');
  const read = ts.readConfigFile(configPath, (path) => readFileSync(path, 'utf8'));
  if (read.error !== undefined) throw new Error(ts.flattenDiagnosticMessageText(read.error.messageText, '\n'));
  return ts.parseJsonConfigFileContent(read.config, ts.sys, repoRoot).options;
}

/** Analyze every positive subpath in the canonical 25-package catalog. */
export function analyzeRepositoryPublicExports(
  repoRoot: string,
  catalog: readonly PackageCatalogRecord[],
): PublicExportAnalysis {
  const entrypoints = catalog.flatMap((record) =>
    Object.entries(resolvePackageSourceEntrypoints(record, repoRoot)).map(([subpath, relativeFile]) => ({
      packageName: record.name,
      subpath,
      file: resolve(repoRoot, relativeFile),
      policy: record.publicSurface,
    })),
  );
  const typed = entrypoints.filter((entrypoint) => /(?:\.d)?\.[cm]?[jt]sx?$/u.test(entrypoint.file));
  const opaque = entrypoints.filter((entrypoint) => !typed.includes(entrypoint));
  const analysis = analyzePublicExportProgram(
    ts.createProgram({
      rootNames: typed.map((entrypoint) => entrypoint.file),
      options: { ...compilerOptions(repoRoot), noEmit: true },
    }),
    typed,
    repoRoot,
  );
  const opaqueContracts: PublicExportContract[] = [];
  const undocumented = [...analysis.undocumented];
  for (const entrypoint of opaque) {
    if (!entrypoint.file.endsWith('.astro')) {
      throw new Error(`public export contract: unsupported public source module ${entrypoint.file}`);
    }
    const purpose = firstDocumentationBlock(readFileSync(entrypoint.file, 'utf8'));
    const specifier = `${entrypoint.packageName}${entrypoint.subpath.slice(1)}`;
    if (purpose === '') undocumented.push(`${specifier}:default`);
    opaqueContracts.push({
      packageName: entrypoint.packageName,
      subpath: entrypoint.subpath,
      specifier,
      name: 'default',
      kind: 'value',
      surfaceClass: 'advanced-module',
      owner: entrypoint.packageName,
      producer: relative(repoRoot, entrypoint.file).replaceAll('\\', '/'),
      audience: entrypoint.policy.audience,
      stability: entrypoint.policy.stability,
      category: 'runtime-value',
      purpose,
      example: `import value from '${specifier}';`,
      relatedInvariant: entrypoint.policy.relatedInvariant,
      replacement: 'none',
      failureContract: entrypoint.policy.failureContract,
      proof: entrypoint.policy.reachabilityProof,
    });
  }
  return {
    ...analysis,
    contracts: [...analysis.contracts, ...opaqueContracts].sort((left, right) =>
      codeUnitCompare(`${left.specifier}:${left.name}`, `${right.specifier}:${right.name}`),
    ),
    undocumented: undocumented.sort(codeUnitCompare),
  };
}

/** Build a pure in-memory program for planted contract controls. */
export function analyzePublicExportSources(
  sources: Readonly<Record<string, string>>,
  entrypoints: readonly (Omit<PublicExportEntrypoint, 'file'> & { readonly sourceFile: string })[],
): PublicExportAnalysis {
  const repoRoot = resolve('/virtual-public-exports');
  const normalized = new Map(
    Object.entries(sources).map(([name, source]) => [resolve(repoRoot, name), source] as const),
  );
  const options: ts.CompilerOptions = {
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    target: ts.ScriptTarget.ES2022,
    strict: true,
    noLib: true,
    types: [],
  };
  const host = ts.createCompilerHost(options);
  const fallback = host.getSourceFile.bind(host);
  const directories = new Set([repoRoot, ...[...normalized.keys()].map((fileName) => dirname(fileName))]);
  host.fileExists = (fileName) => normalized.has(resolve(fileName));
  host.readFile = (fileName) => normalized.get(resolve(fileName));
  host.directoryExists = (directoryName) => directories.has(resolve(directoryName));
  host.getDirectories = (directoryName) => {
    const parent = resolve(directoryName);
    return [...directories]
      .filter((candidate) => candidate !== parent && dirname(candidate) === parent)
      .map((candidate) => candidate.slice(parent.length + 1));
  };
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
    const source = normalized.get(resolve(fileName));
    return source === undefined
      ? fallback(fileName, languageVersion, onError, shouldCreateNewSourceFile)
      : ts.createSourceFile(fileName, source, languageVersion, true, ts.ScriptKind.TS);
  };
  const hydrated = entrypoints.map(({ sourceFile, ...entrypoint }) => ({
    ...entrypoint,
    file: resolve(repoRoot, sourceFile),
  }));
  return analyzePublicExportProgram(
    ts.createProgram({ rootNames: [...normalized.keys()], options, host }),
    hydrated,
    repoRoot,
  );
}

/** Fail closed when a public binding has no declaration owner, documentation, or unique route. */
export function assertPublicExportContracts(analysis: PublicExportAnalysis): void {
  const findings = [
    ...analysis.undocumented.map((entry) => `undocumented ${entry}`),
    ...analysis.producerless.map((entry) => `producerless ${entry}`),
    ...analysis.duplicateBindings.map((entry) => `duplicate ${entry}`),
  ];
  if (findings.length === 0) return;
  const bounded = findings.slice(0, 60);
  const suffix = findings.length > bounded.length ? `\n  ... ${findings.length - bounded.length} more` : '';
  throw new Error(`public export contract is incomplete (${findings.length}):\n  ${bounded.join('\n  ')}${suffix}`);
}
