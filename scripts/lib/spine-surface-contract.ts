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
  /** Stable type expression used by the relation probe (generic arity included). */
  readonly probeExpression: string;
}

/** Minimal public-export fact required to classify one spine symbol's provenance. */
export interface SpineRuntimeTypeContract {
  readonly packageName: string;
  readonly specifier: string;
  readonly name: string;
  readonly kind: 'type' | 'value' | 'value-and-type';
  readonly producer: string;
}

/** One authored admission already owned by the host relation policy. */
export interface SpineAuthoredAdmissionContract {
  readonly typeName: string;
  readonly runtimeModule?: string;
}

/** A rare same-name collision whose declaration shape identifies the intended twin. */
export interface SpineRuntimeOwnerOverride {
  readonly symbol: string;
  readonly producer: string;
  readonly reason: string;
}

/** One generated declaration leaf projected from owner-local protocol catalogs. */
export interface SpineProtocolProjectionContract {
  readonly leaf: string;
  readonly generator: string;
  readonly ownerCatalogs: readonly string[];
}

export interface SpineGeneratedMirrorAdmission {
  readonly typeName: string;
  readonly authority: 'runtime';
  readonly admittedRelation: 'exact';
  readonly spineExpr: string;
  readonly runtimeModule: string;
  readonly runtimeExpr: string;
}

export type SpineSymbolProvenance =
  | {
      readonly classification: 'runtime-mirror';
      readonly symbol: string;
      readonly leaf: string;
      readonly runtimeProducer: string;
      readonly runtimeSpecifiers: readonly string[];
      readonly admissionSource: 'authored' | 'generated';
    }
  | {
      readonly classification: 'spine-protocol';
      readonly symbol: string;
      readonly leaf: string;
      readonly owner: '@liteship/_spine';
      readonly provenance: 'declaration-leaf';
    }
  | {
      readonly classification: 'protocol-projection';
      readonly symbol: string;
      readonly leaf: string;
      readonly owner: '@liteship/_spine';
      readonly provenance: 'generated-owner-catalog';
      readonly generator: string;
      readonly ownerCatalogs: readonly string[];
    };

export interface SpineProvenanceProjection {
  readonly classifications: readonly SpineSymbolProvenance[];
  readonly generatedAdmissions: readonly SpineGeneratedMirrorAdmission[];
  readonly findings: readonly string[];
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

function probeExpression(symbol: ts.Symbol, name: string): string {
  if ((symbol.flags & ts.SymbolFlags.Namespace) !== 0 && (symbol.flags & ts.SymbolFlags.Type) === 0) {
    return `typeof ${name}`;
  }
  const parameterCount = Math.max(
    0,
    ...(symbol.declarations ?? []).map((declaration) => {
      if (
        ts.isInterfaceDeclaration(declaration) ||
        ts.isTypeAliasDeclaration(declaration) ||
        ts.isClassDeclaration(declaration)
      ) {
        return declaration.typeParameters?.filter((parameter) => parameter.default === undefined).length ?? 0;
      }
      return 0;
    }),
  );
  return parameterCount === 0 ? name : `${name}<${Array.from({ length: parameterCount }, () => 'any').join(', ')}>`;
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
        probeExpression: probeExpression(symbol, exported.name),
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

function admissionRoot(typeName: string): string {
  const match = /^[A-Za-z_$][\w$]*/u.exec(typeName.trim());
  return match?.[0] ?? typeName.trim();
}

function stableUnique(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort(codeUnitCompare);
}

function isGeneratedDeclarationLeaf(leaf: string): boolean {
  return leaf.endsWith('.generated.d.ts');
}

/**
 * Classify every generated root symbol from live declaration ownership and live
 * public runtime exports. Authored declaration protocols derive from the absence
 * of a runtime twin; generated protocol projections additionally require one
 * explicit leaf-to-generator-and-owner-catalog provenance contract.
 */
export function classifySpineProvenance(
  analysis: Pick<SpineSurfaceAnalysis, 'symbols' | 'collisions'>,
  runtimeContracts: readonly SpineRuntimeTypeContract[],
  authoredAdmissions: readonly SpineAuthoredAdmissionContract[],
  ownerOverrides: readonly SpineRuntimeOwnerOverride[] = [],
  protocolProjections: readonly SpineProtocolProjectionContract[] = [],
): SpineProvenanceProjection {
  const findings = [...analysis.collisions.map((collision) => `duplicate spine symbol ${collision}`)];
  const authoredByRoot = new Map<string, SpineAuthoredAdmissionContract[]>();
  for (const admission of authoredAdmissions) {
    const root = admissionRoot(admission.typeName);
    const rows = authoredByRoot.get(root) ?? [];
    rows.push(admission);
    authoredByRoot.set(root, rows);
  }
  const overrides = new Map<string, SpineRuntimeOwnerOverride>();
  for (const override of ownerOverrides) {
    if (overrides.has(override.symbol)) findings.push(`duplicate runtime owner override ${override.symbol}`);
    overrides.set(override.symbol, override);
  }
  const projectionsByLeaf = new Map<string, SpineProtocolProjectionContract>();
  for (const projection of protocolProjections) {
    if (projectionsByLeaf.has(projection.leaf)) findings.push(`duplicate protocol projection leaf ${projection.leaf}`);
    if (!isGeneratedDeclarationLeaf(projection.leaf)) {
      findings.push(`protocol projection leaf ${projection.leaf} is not a generated declaration`);
      continue;
    }
    if (projection.generator.trim().length === 0) {
      findings.push(`protocol projection ${projection.leaf} has blank generator provenance`);
    }
    if (projection.ownerCatalogs.length === 0)
      findings.push(`protocol projection ${projection.leaf} has no owner catalogs`);
    const ownerCatalogs = projection.ownerCatalogs.map((catalog) => catalog.trim());
    if (ownerCatalogs.some((catalog) => catalog.length === 0)) {
      findings.push(`protocol projection ${projection.leaf} has blank owner catalog provenance`);
    }
    for (const catalog of stableUnique(ownerCatalogs.filter((candidate) => candidate.length > 0))) {
      if (ownerCatalogs.filter((candidate) => candidate === catalog).length > 1) {
        findings.push(`protocol projection ${projection.leaf} repeats owner catalog ${catalog}`);
      }
    }
    projectionsByLeaf.set(projection.leaf, projection);
  }

  const classifications: SpineSymbolProvenance[] = [];
  const generatedAdmissions: SpineGeneratedMirrorAdmission[] = [];
  for (const symbol of analysis.symbols) {
    const twins = runtimeContracts.filter(
      (contract) =>
        contract.packageName !== '@liteship/_spine' &&
        contract.name === symbol.name &&
        contract.kind !== 'value' &&
        !contract.producer.startsWith('packages/_spine/'),
    );
    const protocolProjection = projectionsByLeaf.get(symbol.leaf);
    if (protocolProjection !== undefined) {
      const producers = stableUnique(twins.map((contract) => contract.producer));
      if (producers.length > 0) {
        findings.push(`protocol projection ${symbol.name} has runtime twin(s): ${producers.join(', ')}`);
        continue;
      }
      classifications.push({
        classification: 'protocol-projection',
        symbol: symbol.name,
        leaf: symbol.leaf,
        owner: '@liteship/_spine',
        provenance: 'generated-owner-catalog',
        generator: protocolProjection.generator,
        ownerCatalogs: stableUnique(protocolProjection.ownerCatalogs),
      });
      continue;
    }
    const authored = authoredByRoot.get(symbol.name) ?? [];
    if (authored.length > 0) {
      const wholeSymbolAdmissions = authored.filter((admission) => admission.typeName === symbol.name);
      const producerAdmissions = wholeSymbolAdmissions.length > 0 ? wholeSymbolAdmissions : authored;
      const producers = stableUnique(
        producerAdmissions.flatMap((admission) =>
          admission.runtimeModule === undefined ? [] : [admission.runtimeModule],
        ),
      );
      if (producers.length !== 1) {
        findings.push(
          `authored mirror ${symbol.name} must name exactly one runtime producer (found ${producers.join(', ') || 'none'})`,
        );
        continue;
      }
      classifications.push({
        classification: 'runtime-mirror',
        symbol: symbol.name,
        leaf: symbol.leaf,
        runtimeProducer: producers[0]!,
        runtimeSpecifiers: stableUnique(
          runtimeContracts
            .filter((contract) => contract.name === symbol.name && contract.producer === producers[0])
            .map((contract) => contract.specifier),
        ),
        admissionSource: 'authored',
      });
      continue;
    }
    const producers = stableUnique(twins.map((contract) => contract.producer));
    if (producers.length === 0) {
      if (isGeneratedDeclarationLeaf(symbol.leaf)) {
        findings.push(`generated declaration ${symbol.leaf}:${symbol.name} has no protocol projection provenance`);
        continue;
      }
      classifications.push({
        classification: 'spine-protocol',
        symbol: symbol.name,
        leaf: symbol.leaf,
        owner: '@liteship/_spine',
        provenance: 'declaration-leaf',
      });
      continue;
    }

    const override = overrides.get(symbol.name);
    const producer = producers.length === 1 ? producers[0]! : override?.producer;
    if (producer === undefined || !producers.includes(producer)) {
      findings.push(
        `ambiguous runtime twin ${symbol.name}: ${producers.join(', ')}${
          override === undefined ? '' : ` (invalid override ${override.producer})`
        }`,
      );
      continue;
    }
    const matchingContracts = twins.filter((contract) => contract.producer === producer);
    classifications.push({
      classification: 'runtime-mirror',
      symbol: symbol.name,
      leaf: symbol.leaf,
      runtimeProducer: producer,
      runtimeSpecifiers: stableUnique(matchingContracts.map((contract) => contract.specifier)),
      admissionSource: 'generated',
    });
    generatedAdmissions.push({
      typeName: symbol.name,
      authority: 'runtime',
      admittedRelation: 'exact',
      spineExpr: symbol.probeExpression,
      runtimeModule: producer,
      runtimeExpr: symbol.probeExpression,
    });
  }

  for (const override of ownerOverrides) {
    if (!analysis.symbols.some((symbol) => symbol.name === override.symbol)) {
      findings.push(`orphan runtime owner override ${override.symbol}`);
    }
  }
  for (const projection of protocolProjections) {
    if (!analysis.symbols.some((symbol) => symbol.leaf === projection.leaf)) {
      findings.push(`orphan protocol projection leaf ${projection.leaf}`);
    }
  }
  const classified = new Set<string>();
  for (const row of classifications) {
    if (classified.has(row.symbol)) findings.push(`duplicate provenance classification ${row.symbol}`);
    classified.add(row.symbol);
  }
  for (const symbol of analysis.symbols) {
    if (!classified.has(symbol.name)) findings.push(`omitted provenance classification ${symbol.name}`);
  }
  return {
    classifications: classifications.sort((left, right) => codeUnitCompare(left.symbol, right.symbol)),
    generatedAdmissions: generatedAdmissions.sort((left, right) => codeUnitCompare(left.typeName, right.typeName)),
    findings: stableUnique(findings),
  };
}

/** Refuse any omitted, duplicate, fake, ambiguous, or stale classification. */
export function assertSpineProvenanceComplete(projection: SpineProvenanceProjection): void {
  if (projection.findings.length === 0) return;
  const bounded = projection.findings.slice(0, 60);
  const suffix =
    projection.findings.length > bounded.length ? `\n  ... ${projection.findings.length - bounded.length} more` : '';
  throw new Error(
    `spine provenance is incomplete (${projection.findings.length}):\n  ${bounded.join('\n  ')}${suffix}`,
  );
}

function singleQuote(value: string): string {
  return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
}

/** Render the host-consumed admission/protocol projection from the exact census. */
export function renderSpineProvenanceProjection(projection: SpineProvenanceProjection): string {
  assertSpineProvenanceComplete(projection);
  const protocols = projection.classifications.filter(
    (row): row is Extract<SpineSymbolProvenance, { classification: 'spine-protocol' | 'protocol-projection' }> =>
      row.classification === 'spine-protocol' || row.classification === 'protocol-projection',
  );
  const lines = [
    '/** Generated spine provenance projection. Do not edit by hand. @module */',
    "import type { SpineTypeAdmission } from '@liteship/audit';",
    '',
    'export type SpineProtocolDeclaration =',
    '  | {',
    "      readonly classification: 'spine-protocol';",
    '      readonly symbol: string;',
    '      readonly leaf: string;',
    "      readonly owner: '@liteship/_spine';",
    "      readonly provenance: 'declaration-leaf';",
    '    }',
    '  | {',
    "      readonly classification: 'protocol-projection';",
    '      readonly symbol: string;',
    '      readonly leaf: string;',
    "      readonly owner: '@liteship/_spine';",
    "      readonly provenance: 'generated-owner-catalog';",
    '      readonly generator: string;',
    '      readonly ownerCatalogs: readonly string[];',
    '    };',
    '',
    '// prettier-ignore',
    'export const GENERATED_LITESHIP_SPINE_ADMISSIONS: readonly SpineTypeAdmission[] = [',
  ];
  for (const admission of projection.generatedAdmissions) {
    lines.push('  {');
    lines.push(`    typeName: ${singleQuote(admission.typeName)},`);
    lines.push("    authority: 'runtime',");
    lines.push("    admittedRelation: 'exact',");
    lines.push(`    spineExpr: ${singleQuote(admission.spineExpr)},`);
    lines.push(`    runtimeModule: ${singleQuote(admission.runtimeModule)},`);
    lines.push(`    runtimeExpr: ${singleQuote(admission.runtimeExpr)},`);
    lines.push('  },');
  }
  lines.push(
    '] as const;',
    '',
    '// prettier-ignore',
    'export const LITESHIP_SPINE_PROTOCOL_DECLARATIONS: readonly SpineProtocolDeclaration[] = [',
  );
  for (const protocol of protocols) {
    if (protocol.classification === 'spine-protocol') {
      lines.push(
        `  { classification: 'spine-protocol', symbol: ${singleQuote(protocol.symbol)}, leaf: ${singleQuote(protocol.leaf)}, owner: '@liteship/_spine', provenance: 'declaration-leaf' },`,
      );
    } else {
      lines.push('  {');
      lines.push("    classification: 'protocol-projection',");
      lines.push(`    symbol: ${singleQuote(protocol.symbol)},`);
      lines.push(`    leaf: ${singleQuote(protocol.leaf)},`);
      lines.push("    owner: '@liteship/_spine',");
      lines.push("    provenance: 'generated-owner-catalog',");
      lines.push(`    generator: ${singleQuote(protocol.generator)},`);
      lines.push(`    ownerCatalogs: [${protocol.ownerCatalogs.map(singleQuote).join(', ')}],`);
      lines.push('  },');
    }
  }
  lines.push('] as const;');
  return `${lines.join('\n')}\n`;
}

/** Discover every authored or generated declaration leaf and analyze its public types. */
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
    (symbol) => `| \`${symbol.name}\` | ${symbol.kind} | \`${symbol.leaf}\` | ${markdownCell(symbol.summary)} |`,
  );
  return [
    '# @liteship/_spine symbol index',
    '',
    'Generated from the live declaration-leaf census. A symbol cannot enter the root barrel unless it has type meaning, one owner, and declaration documentation.',
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
