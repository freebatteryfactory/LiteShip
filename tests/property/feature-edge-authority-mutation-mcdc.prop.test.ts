// PROVES: INV-FEATURE-EDGE-PRODUCER, INV-GATE-AUTHORITY-INTEGRITY
/**
 * Real-source mutation and MC/DC qualification for feature-edge authority.
 *
 * The existing audit engines mutate the current production source bytes. An
 * in-process semantic runner executes each covered mutant against model cases;
 * no hand-authored mutant implementation can accidentally diverge from the
 * code CI actually runs.
 */

import { readFileSync } from 'node:fs';
import * as nodeFs from 'node:fs';
import * as nodePath from 'node:path';
import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import * as canonicalModule from '@liteship/canonical';
import * as errorModule from '@liteship/error';
import {
  buildMcdcFacts,
  buildMutationFacts,
  generateConditionMutants,
  generateMutants,
  makeCoverageMap,
  type MutantTestRunner,
} from '@liteship/audit';
import {
  FEATURE_EDGE_ENUMERATORS,
  FEATURE_EDGE_FAMILIES,
  defineGate,
  finding,
  type FeatureEdgeFacts,
  type FeatureEdgeFamily,
  type FeatureEdgeFamilyFacts,
  type Gate,
  type McdcConditionOutcome,
  type MutantOutcome,
} from '@liteship/gauntlet';
import * as gauntletModule from '../../packages/gauntlet/src/index.js';
import * as findingModule from '../../packages/gauntlet/src/finding.js';
import * as authorityModule from '../../packages/gauntlet/src/authority.js';
import * as assuranceModule from '../../packages/gauntlet/src/assurance.js';
import * as assuranceMapModule from '../../packages/gauntlet/src/assurance-map.js';
import * as waiverModule from '../../packages/gauntlet/src/waiver.js';
import * as verdictCacheModule from '../../packages/gauntlet/src/verdict-cache.js';

const FACTS_FILE = 'packages/gauntlet/src/facts/feature-edge-facts.ts';
const CATALOG_FILE = 'packages/audit/src/catalog-feature-edge-census.ts';
const ENGINE_FILE = 'packages/gauntlet/src/engine.ts';
const TEST_ID = 'tests/property/feature-edge-authority-mutation-mcdc.prop.test.ts';
const DIGEST = `sha256:${'a'.repeat(64)}` as const;

interface CoverageModule {
  readonly featureEdgeSubjectCoverage: (facts: FeatureEdgeFacts | undefined) => {
    readonly status: 'complete' | 'opaque';
    readonly reason?: string;
  };
}

interface CatalogModule {
  readonly combineFeatureEdgeFamilies: (families: readonly FeatureEdgeFamilyFacts[]) => FeatureEdgeFacts;
}

interface EngineModule {
  readonly memoryContext: typeof gauntletModule.memoryContext;
  readonly runGates: typeof gauntletModule.runGates;
}

type DependencyMap = Readonly<Record<string, unknown>>;

function executeCommonJs<Exports extends object>(source: string, file: string, dependencies: DependencyMap): Exports {
  const output = ts.transpileModule(source, {
    fileName: file,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    reportDiagnostics: false,
  }).outputText;
  const module = { exports: {} as Exports };
  const localRequire = (specifier: string): unknown => {
    if (Object.hasOwn(dependencies, specifier)) return dependencies[specifier];
    throw new Error(`${file} requested unmodeled dependency ${specifier}`);
  };
  // The source is trusted repository code and the dependency table is closed.
  const evaluate = new Function('require', 'module', 'exports', `'use strict';\n${output}`) as (
    require: (specifier: string) => unknown,
    module: { exports: Exports },
    exports: Exports,
  ) => void;
  evaluate(localRequire, module, module.exports);
  return module.exports;
}

function loadCoverageModule(source: string): CoverageModule {
  return executeCommonJs<CoverageModule>(source, FACTS_FILE, {});
}

function loadCatalogModule(source: string): CatalogModule {
  return executeCommonJs<CatalogModule>(source, CATALOG_FILE, {
    '@liteship/canonical': canonicalModule,
    '@liteship/gauntlet': gauntletModule,
    'node:fs': nodeFs,
    'node:path': nodePath,
    typescript: { __esModule: true, default: ts },
  });
}

function loadEngineModule(source: string): EngineModule {
  return executeCommonJs<EngineModule>(source, ENGINE_FILE, {
    '@liteship/error': errorModule,
    './finding.js': findingModule,
    './authority.js': authorityModule,
    './assurance.js': assuranceModule,
    './assurance-map.js': assuranceMapModule,
    './waiver.js': waiverModule,
    './verdict-cache.js': verdictCacheModule,
  });
}

function familyFacts(family: FeatureEdgeFamily, subject = `${family}/subject`): FeatureEdgeFamilyFacts {
  return {
    family,
    observations: [
      {
        family,
        subject,
        role: 'consumer',
        mechanism: family === 'ecs-component' ? 'system-query' : 'protocol-declaration',
        file: `fixture/${family}/consumer.ts`,
        line: 1,
      },
      {
        family,
        subject,
        role: 'producer',
        mechanism: family === 'ecs-component' ? 'world-spawn' : 'registry-entry',
        file: `fixture/${family}/producer.ts`,
        line: 1,
      },
    ],
    subjectCoverage: {
      status: 'complete',
      enumerator: FEATURE_EDGE_ENUMERATORS[family],
      enumeratedCount: 1,
      censusDigest: DIGEST,
    },
  };
}

function exactFacts(families = FEATURE_EDGE_FAMILIES.map((family) => familyFacts(family))): FeatureEdgeFacts {
  return {
    _tag: 'feature-edge-facts',
    families,
    aggregate: {
      enumerator: 'feature-edge/family-set-v1',
      enumeratedCount: families.length,
      censusDigest: DIGEST,
    },
  };
}

function coverageModelPasses(module: CoverageModule): boolean {
  const base = exactFacts();
  if (module.featureEdgeSubjectCoverage(base).status !== 'complete') return false;

  const replace = (
    family: FeatureEdgeFamily,
    transform: (pack: FeatureEdgeFamilyFacts) => FeatureEdgeFamilyFacts,
  ): FeatureEdgeFacts => ({
    ...base,
    families: base.families.map((pack) => (pack.family === family ? transform(pack) : pack)),
  });
  const first = FEATURE_EDGE_FAMILIES[0];
  const second = FEATURE_EDGE_FAMILIES[1];
  const mismatched = replace(first, (pack) => ({
    ...pack,
    subjectCoverage: { ...pack.subjectCoverage, enumerator: FEATURE_EDGE_ENUMERATORS[second] },
  }));
  const countMismatch = replace(first, (pack) => ({
    ...pack,
    subjectCoverage: { ...pack.subjectCoverage, enumeratedCount: 2 },
  }));
  const opaque = replace(first, (pack) => ({
    ...pack,
    subjectCoverage: {
      status: 'unknown',
      enumerator: pack.subjectCoverage.enumerator,
      enumeratedCount: pack.subjectCoverage.enumeratedCount,
      censusDigest: pack.subjectCoverage.censusDigest,
      opaqueSites: [
        {
          family: first,
          role: 'producer',
          mechanism: 'registry-entry',
          file: 'fixture/dynamic.ts',
          line: 1,
          reason: 'dynamic identity',
        },
      ],
    },
  }));
  const missingFamilies = base.families.slice(1);
  const missing = { ...base, families: missingFamilies, aggregate: { ...base.aggregate, enumeratedCount: 8 } };
  const duplicateFamilies = [...base.families, base.families[0]!];
  const duplicate = { ...base, families: duplicateFamilies, aggregate: { ...base.aggregate, enumeratedCount: 10 } };
  const aggregateMismatch = { ...base, aggregate: { ...base.aggregate, enumeratedCount: 8 } };

  return [mismatched, countMismatch, opaque, missing, duplicate, aggregateMismatch].every(
    (facts) => module.featureEdgeSubjectCoverage(facts).status === 'opaque',
  );
}

function catalogModelPasses(module: CatalogModule): boolean {
  const families = FEATURE_EDGE_FAMILIES.map((family) => familyFacts(family));
  const forward = module.combineFeatureEdgeFamilies(families);
  const reverse = module.combineFeatureEdgeFamilies([...families].reverse());
  if (JSON.stringify(forward) !== JSON.stringify(reverse)) return false;
  if (forward.families.map((pack) => pack.family).join('|') !== FEATURE_EDGE_FAMILIES.join('|')) return false;
  if (forward.aggregate.enumeratedCount !== FEATURE_EDGE_FAMILIES.length) return false;
  if (!/^sha256:[0-9a-f]{64}$/u.test(forward.aggregate.censusDigest)) return false;

  const changed = families.map((pack, index) =>
    index === 0
      ? {
          ...pack,
          subjectCoverage: { ...pack.subjectCoverage, censusDigest: `sha256:${'b'.repeat(64)}` as const },
        }
      : pack,
  );
  if (module.combineFeatureEdgeFamilies(changed).aggregate.censusDigest === forward.aggregate.censusDigest)
    return false;

  try {
    module.combineFeatureEdgeFamilies(families.slice(1));
    return false;
  } catch (error) {
    if (!String(error).includes('missing families')) return false;
  }
  try {
    module.combineFeatureEdgeFamilies([...families, families[0]!]);
    return false;
  } catch (error) {
    if (!String(error).includes('repeats family')) return false;
  }
  return true;
}

function authorityGate(module: EngineModule): Gate {
  return defineGate({
    id: 'test/engine-integrity-mutation',
    extension: { namespace: 'test', owner: 'feature-edge mutation proof' },
    level: 'L4',
    describe: 'Exercises semantic waivers separately from engine-owned integrity.',
    run: (gateContext) =>
      gateContext.readFile('real.ts') === 'bad'
        ? [
            finding({
              ruleId: 'test/engine-integrity-mutation',
              severity: 'error',
              level: 'L4',
              title: 'Semantic defect',
              detail: 'The semantic subject is bad.',
            }),
          ]
        : [],
    subjectCoverage: (gateContext) =>
      gateContext.readFile('opaque') === undefined
        ? { status: 'complete', enumerator: 'test/engine-subjects-v1', enumeratedCount: 1, censusDigest: DIGEST }
        : {
            status: 'opaque',
            enumerator: 'test/engine-subjects-v1',
            enumeratedCount: 0,
            censusDigest: DIGEST,
            reason: 'dynamic subject escaped enumeration',
          },
    fixtures: {
      red: { name: 'semantic red', context: module.memoryContext({ 'real.ts': 'bad' }, '/red') },
      green: { name: 'semantic green', context: module.memoryContext({ 'real.ts': 'good' }, '/green') },
      mutation: { describe: 'blind semantic fold', mutate: (gate) => ({ ...gate, run: () => [] }) },
    },
  });
}

function engineModelPasses(module: EngineModule): boolean {
  const integrityWaiver = {
    ruleId: 'gauntlet/authority-integrity',
    owner: 'adversarial-test',
    reason: 'must never suppress engine-owned qualification integrity',
    expires: '2999-01-01',
    blastRadius: 'test',
    debtScore: 0,
  } as const;
  const semanticWaiver = { ...integrityWaiver, ruleId: 'test/engine-integrity-mutation' };

  const opaqueGate = authorityGate(module);
  const opaqueContext = module.memoryContext({ 'real.ts': 'good', opaque: 'yes' });
  const opaque = module.runGates([opaqueGate], opaqueContext, { waivers: [integrityWaiver] });
  if (!opaque.blocked) return false;
  if (!opaque.findings.some((row) => row.ruleId === 'gauntlet/authority-integrity')) return false;
  if (opaque.outcomes[0]?.waived.length !== 0) return false;

  const greenGate = authorityGate(module);
  const green = module.runGates([greenGate], module.memoryContext({ 'real.ts': 'good' }));
  if (green.blocked || green.findings.length !== 0) return false;

  const semanticGate = authorityGate(module);
  const semantic = module.runGates([semanticGate], module.memoryContext({ 'real.ts': 'bad' }), {
    waivers: [semanticWaiver],
  });
  if (semantic.blocked || semantic.findings.length !== 0 || semantic.outcomes[0]?.waived.length !== 1) return false;

  const reservedNameGate = defineGate({
    id: 'test/reserved-name-is-not-integrity',
    extension: { namespace: 'test', owner: 'feature-edge mutation proof' },
    level: 'L4',
    describe: 'An advisory semantic finding cannot impersonate engine-owned integrity by rule id alone.',
    run: (context) =>
      context.readFile('real.ts') === 'bad'
        ? [
            finding({
              ruleId: 'gauntlet/authority-integrity',
              severity: 'advisory',
              level: 'L4',
              title: 'Reserved name spoof',
              detail: 'This is semantic output, not an engine qualification error.',
            }),
          ]
        : [],
    fixtures: {
      red: { name: 'spoof red', context: module.memoryContext({ 'real.ts': 'bad' }, '/red') },
      green: { name: 'spoof green', context: module.memoryContext({ 'real.ts': 'good' }, '/green') },
      mutation: { describe: 'blind spoof fold', mutate: (gate) => ({ ...gate, run: () => [] }) },
    },
  });
  const reserved = module.runGates([reservedNameGate], module.memoryContext({ 'real.ts': 'bad' }));
  return !reserved.blocked && reserved.findings.length === 1 && reserved.findings[0]?.severity === 'advisory';
}

function parse(file: string, source: string): ts.SourceFile {
  return ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

type MutationTarget =
  { readonly kind: 'condition'; readonly expression: string } | { readonly kind: 'variable'; readonly name: string };

function mutationTargetLines(sourceFile: ts.SourceFile, targets: readonly MutationTarget[]): ReadonlySet<number> {
  const matched = new Set<number>();
  const printer = ts.createPrinter({ removeComments: true });
  const conditionTargets = new Set(
    targets.filter((target) => target.kind === 'condition').map((target) => target.expression),
  );
  const variableTargets = new Set(targets.filter((target) => target.kind === 'variable').map((target) => target.name));
  const lineOf = (node: ts.Node): number =>
    sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
  const visit = (node: ts.Node): void => {
    if (ts.isIfStatement(node)) {
      const expression = printer.printNode(ts.EmitHint.Expression, node.expression, sourceFile);
      if (conditionTargets.has(expression)) matched.add(lineOf(node.expression));
    }
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && variableTargets.has(node.name.text)) {
      matched.add(lineOf(node));
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  expect(matched.size).toBe(targets.length);
  return matched;
}

function mutationEvidence(
  file: string,
  source: string,
  targets: readonly MutationTarget[],
  runner: MutantTestRunner,
): readonly MutantOutcome[] {
  const sourceFile = parse(file, source);
  const targetLines = mutationTargetLines(sourceFile, targets);
  const mutants = generateMutants(sourceFile, { file }).filter((mutant) => targetLines.has(mutant.line));
  expect(new Set(mutants.map((mutant) => mutant.line))).toEqual(targetLines);
  const coverage = makeCoverageMap(mutants.map((mutant) => ({ file, line: mutant.line, testId: TEST_ID })));
  const facts = buildMutationFacts([{ file, text: source }], { runner, coverage });
  return facts.outcomes.filter((outcome) => targetLines.has(outcome.line) && outcome.operator !== 'string-literal');
}

function mcdcEvidence(
  file: string,
  source: string,
  conditionSnippets: readonly string[],
  runner: MutantTestRunner,
): readonly McdcConditionOutcome[] {
  const conditions = new Set(conditionSnippets);
  const pins = generateConditionMutants(parse(file, source), { file }).filter((pin) => conditions.has(pin.condition));
  expect(new Set(pins.map((pin) => pin.condition))).toEqual(conditions);
  const coverage = makeCoverageMap(pins.map((pin) => ({ file, line: pin.line, testId: TEST_ID })));
  const facts = buildMcdcFacts([{ file, text: source }], { runner, coverage });
  return facts.conditions.filter((condition) => conditions.has(condition.condition));
}

function expectKilled(outcomes: readonly MutantOutcome[]): void {
  expect(outcomes.length).toBeGreaterThan(0);
  expect(outcomes.filter((outcome) => outcome.verdict !== 'killed')).toEqual([]);
  expect(outcomes.every((outcome) => outcome.coveringTests.includes(TEST_ID))).toBe(true);
}

function expectMcdcCovered(outcomes: readonly McdcConditionOutcome[]): void {
  expect(outcomes.length).toBeGreaterThan(0);
  for (const outcome of outcomes) {
    expect(outcome.forceTrueVerdict, outcome.condition).toBe('killed');
    expect(outcome.forceFalseVerdict, outcome.condition).toBe('killed');
    expect(outcome.coveringTests).toContain(TEST_ID);
  }
}

describe('feature-edge authority real-source mutation and MC/DC', () => {
  it('kills classic mutants for enumerator, duplicate, opacity, missing-family, and aggregate-count decisions', () => {
    const source = readFileSync(FACTS_FILE, 'utf8');
    const outcomes = mutationEvidence(
      FACTS_FILE,
      source,
      [
        { kind: 'condition', expression: 'pack.subjectCoverage.enumerator !== expectedEnumerator' },
        { kind: 'condition', expression: "pack.subjectCoverage.status === 'unknown'" },
        { kind: 'condition', expression: 'expected.size > 0' },
        { kind: 'condition', expression: 'facts.aggregate.enumeratedCount !== enumeratedCount' },
      ],
      (mutated) => {
        try {
          return { failed: !coverageModelPasses(loadCoverageModule(mutated)) };
        } catch {
          return { failed: true };
        }
      },
    );
    expectKilled(outcomes);
  });

  it('proves independent true/false effect for every feature-edge coverage decision', () => {
    const source = readFileSync(FACTS_FILE, 'utf8');
    const outcomes = mcdcEvidence(
      FACTS_FILE,
      source,
      [
        'seen.has(pack.family)',
        'pack.subjectCoverage.enumerator !== expectedEnumerator',
        "pack.subjectCoverage.status === 'unknown'",
        'expected.size > 0',
        'facts.aggregate.enumeratedCount !== enumeratedCount',
      ],
      (mutated) => {
        try {
          return { failed: !coverageModelPasses(loadCoverageModule(mutated)) };
        } catch {
          return { failed: true };
        }
      },
    );
    expectMcdcCovered(outcomes);
  });

  it('kills the aggregate family-set/order/digest and missing/duplicate-family mutants', () => {
    const source = readFileSync(CATALOG_FILE, 'utf8');
    const outcomes = mutationEvidence(
      CATALOG_FILE,
      source,
      [
        { kind: 'condition', expression: 'missing.length > 0' },
        { kind: 'variable', name: 'enumeratedCount' },
      ],
      (mutated) => {
        try {
          return { failed: !catalogModelPasses(loadCatalogModule(mutated)) };
        } catch {
          return { failed: true };
        }
      },
    );
    expectKilled(outcomes);
  });

  it('proves independent missing and duplicate family refusal in the aggregate builder', () => {
    const source = readFileSync(CATALOG_FILE, 'utf8');
    const outcomes = mcdcEvidence(
      CATALOG_FILE,
      source,
      ['byFamily.has(pack.family)', 'missing.length > 0'],
      (mutated) => {
        try {
          return { failed: !catalogModelPasses(loadCatalogModule(mutated)) };
        } catch {
          return { failed: true };
        }
      },
    );
    expectMcdcCovered(outcomes);
  });

  it('kills mutants that route engine-owned integrity through waivers or stop it from blocking', () => {
    const source = readFileSync(ENGINE_FILE, 'utf8');
    const outcomes = mutationEvidence(
      ENGINE_FILE,
      source,
      [
        { kind: 'variable', name: 'gateWaivers' },
        { kind: 'variable', name: 'keptWithIntegrity' },
        { kind: 'variable', name: 'isAuthorityIntegrityError' },
      ],
      (mutated) => {
        try {
          return { failed: !engineModelPasses(loadEngineModule(mutated)) };
        } catch {
          return { failed: true };
        }
      },
    );
    expectKilled(outcomes);
  });

  it('proves waiver filtering and unwaivable authority-integrity affect the engine verdict independently', () => {
    const source = readFileSync(ENGINE_FILE, 'utf8');
    const outcomes = mcdcEvidence(
      ENGINE_FILE,
      source,
      ['integrityFinding === undefined', 'isAuthorityIntegrityError'],
      (mutated) => {
        try {
          return { failed: !engineModelPasses(loadEngineModule(mutated)) };
        } catch {
          return { failed: true };
        }
      },
    );
    expectMcdcCovered(outcomes);
  });
});
