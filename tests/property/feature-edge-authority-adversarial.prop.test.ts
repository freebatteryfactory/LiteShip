// PROVES: INV-FEATURE-EDGE-PRODUCER, INV-GATE-AUTHORITY-INTEGRITY
/**
 * Adversarial model proof for fleet feature-edge authority.
 *
 * This packet treats the live owner projections as the model population. It
 * mutates receipts and edges after census construction so the pure authority
 * must catch lies independently of whichever package authored the catalog.
 */

import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  buildCatalogFeatureEdgeFamily,
  buildEcsFeatureEdgeFacts,
  combineFeatureEdgeFamilies,
  type CatalogFeatureEdgeOptions,
  type EcsFeatureEdgeApi,
} from '@liteship/audit';
import {
  FEATURE_EDGE_ENUMERATORS,
  FEATURE_EDGE_FAMILIES,
  decideFeatureEdgeConnectivity,
  defineGate,
  featureEdgeConnectivityGate,
  featureEdgeSubjectCoverage,
  finding,
  memoryContext,
  runGates,
  type FeatureEdgeFacts,
  type FeatureEdgeFamily,
  type FeatureEdgeFamilyFacts,
  type Gate,
} from '@liteship/gauntlet';
import {
  collectEventProtocol,
  renderEventProtocolDts,
  renderEventProtocolHostProjection,
  renderWebEventProjection,
} from '../../scripts/lib/event-protocol-contract.js';
import { buildLiveLiteShipFeatureEdgeFacts } from '../../scripts/lib/feature-edge-profile.js';
import { loadHistoricalDefect } from '../support/historical-defect-corpus.js';

const REPO_ROOT = resolve(import.meta.dirname, '../..');
const DIGEST = `sha256:${'a'.repeat(64)}` as const;
const HISTORICAL_FIXTURE = 'tests/fixtures/cure-packets/motion-program-orphan';
const HISTORICAL_API: EcsFeatureEdgeApi = {
  declarationFile: `${HISTORICAL_FIXTURE}/ecs-api.ts`,
  worldExport: 'World',
  systemExports: ['System', 'DenseSystem'],
  partExport: 'Part',
  denseStoreFactoryExport: 'createDenseStore',
  worldMembers: {
    query: 'query',
    spawn: 'spawn',
    addComponent: 'addComponent',
    setComponent: 'setComponent',
  },
  systemQueryMember: 'query',
  partNameMember: 'name',
};

let cachedLiveFacts: FeatureEdgeFacts | undefined;
function liveFacts(): FeatureEdgeFacts {
  cachedLiveFacts ??= buildLiveLiteShipFeatureEdgeFacts(REPO_ROOT);
  return cachedLiveFacts;
}

function replaceFamily(
  facts: FeatureEdgeFacts,
  family: FeatureEdgeFamily,
  replace: (pack: FeatureEdgeFamilyFacts) => FeatureEdgeFamilyFacts,
): FeatureEdgeFacts {
  return combineFeatureEdgeFamilies(facts.families.map((pack) => (pack.family === family ? replace(pack) : pack)));
}

function connectedSubject(pack: FeatureEdgeFamilyFacts): string {
  const consumers = new Set(pack.observations.filter((row) => row.role === 'consumer').map((row) => row.subject));
  const subject = pack.observations.find((row) => row.role === 'producer' && consumers.has(row.subject))?.subject;
  if (subject === undefined) throw new Error(`${pack.family} has no connected subject in its live owner projection`);
  return subject;
}

function orphanOneSubject(pack: FeatureEdgeFamilyFacts): FeatureEdgeFamilyFacts {
  const subject = connectedSubject(pack);
  return {
    ...pack,
    observations: pack.observations.filter((row) => !(row.subject === subject && row.role === 'producer')),
  };
}

function makeFamilyOpaque(pack: FeatureEdgeFamilyFacts): FeatureEdgeFamilyFacts {
  return {
    ...pack,
    subjectCoverage: {
      status: 'unknown',
      enumerator: pack.subjectCoverage.enumerator,
      enumeratedCount: pack.subjectCoverage.enumeratedCount,
      censusDigest: pack.subjectCoverage.censusDigest,
      opaqueSites: [
        {
          family: pack.family,
          role: 'producer',
          mechanism: pack.observations.find((row) => row.role === 'producer')?.mechanism ?? 'registry-entry',
          file: `fixtures/${pack.family}/dynamic.ts`,
          line: 1,
          reason: 'adversarial dynamic subject hides the producer identity',
        },
      ],
    },
  };
}

function qualificationGate(
  redCaught: boolean,
  greenClean: boolean,
  mutationKilled: boolean,
  coverageComplete: boolean,
): Gate {
  const semanticRun: Gate['run'] = (context) =>
    context.readFile('fixture.ts') === 'bad'
      ? [
          finding({
            ruleId: 'test/feature-edge-four-axis',
            severity: 'error',
            level: 'L4',
            title: 'Bad edge fixture',
            detail: 'The edge fixture is disconnected.',
          }),
        ]
      : [];
  return defineGate({
    id: 'test/feature-edge-four-axis',
    extension: { namespace: 'test', owner: 'feature-edge adversarial proof' },
    level: 'L4',
    describe: 'Requires fixture qualification and complete subject enumeration.',
    run: semanticRun,
    subjectCoverage: () =>
      coverageComplete
        ? {
            status: 'complete',
            enumerator: 'test/feature-edge-subjects-v1',
            enumeratedCount: 1,
            censusDigest: DIGEST,
          }
        : {
            status: 'opaque',
            enumerator: 'test/feature-edge-subjects-v1',
            enumeratedCount: 0,
            censusDigest: DIGEST,
            reason: 'the test producer identity is dynamic',
          },
    fixtures: {
      red: {
        name: 'disconnected edge',
        context: memoryContext({ 'fixture.ts': redCaught ? 'bad' : 'good' }, '/red'),
      },
      green: {
        name: 'connected edge',
        context: memoryContext({ 'fixture.ts': greenClean ? 'good' : 'bad' }, '/green'),
      },
      mutation: {
        describe: mutationKilled ? 'blind the detector' : 'preserve fixture outcomes',
        mutate: (gate) => ({
          ...gate,
          run: mutationKilled
            ? () => []
            : (context) =>
                context.repoRoot === '/red'
                  ? [
                      finding({
                        ruleId: gate.id,
                        severity: 'error',
                        level: gate.level,
                        title: 'Fixture-shaped mutant',
                        detail: 'The mutant preserves both fixture outcomes.',
                      }),
                    ]
                  : [],
        }),
      },
    },
  });
}

describe('feature-edge authority adversarial model', () => {
  it.each(FEATURE_EDGE_FAMILIES)('detects a producer erasure in the live %s owner projection', (family) => {
    const facts = liveFacts();
    const pack = facts.families.find((candidate) => candidate.family === family)!;
    const subject = connectedSubject(pack);
    const mutated = replaceFamily(facts, family, orphanOneSubject);
    const findings = decideFeatureEdgeConnectivity({ featureEdges: mutated });

    expect(featureEdgeSubjectCoverage(mutated)).toMatchObject({ status: 'complete' });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      ruleId: 'gauntlet/feature-edge-connectivity/orphan-consumer',
      severity: 'error',
      title: expect.stringContaining(`"${subject}"`),
    });
  });

  it.each(FEATURE_EDGE_FAMILIES)(
    'turns %s complete-to-opaque drift into unwaivable required-gate failure',
    (family) => {
      const mutated = replaceFamily(liveFacts(), family, makeFamilyOpaque);
      const coverage = featureEdgeSubjectCoverage(mutated);
      expect(coverage).toMatchObject({ status: 'opaque' });
      if (coverage.status === 'opaque') expect(coverage.reason).toContain(`${family} is opaque`);

      const result = runGates(
        [featureEdgeConnectivityGate],
        { ...memoryContext({}), featureEdges: mutated },
        {
          waivers: [
            {
              ruleId: 'gauntlet/authority-integrity',
              owner: 'adversarial-test',
              reason: 'engine-owned authority integrity must bypass this attempted waiver',
              expires: '2999-01-01',
              blastRadius: family,
              debtScore: 0,
            },
          ],
        },
      );

      expect(result.blocked).toBe(true);
      expect(result.outcomes[0]).toMatchObject({
        authority: 'advisory',
        proof: { subjectCoverage: { status: 'opaque' }, selfProven: false },
      });
      expect(result.findings).toContainEqual(
        expect.objectContaining({
          ruleId: 'gauntlet/authority-integrity',
          severity: 'error',
        }),
      );
      expect(result.outcomes[0]!.waived).toEqual([]);
    },
  );

  it.each(FEATURE_EDGE_FAMILIES)('refuses %s catalog/enumerator projection drift', (family) => {
    const facts = liveFacts();
    const otherFamily = FEATURE_EDGE_FAMILIES.find((candidate) => candidate !== family)!;
    const mutated = replaceFamily(facts, family, (pack) => ({
      ...pack,
      subjectCoverage: {
        ...pack.subjectCoverage,
        enumerator: FEATURE_EDGE_ENUMERATORS[otherFamily],
      },
    }));
    const coverage = featureEdgeSubjectCoverage(mutated);
    expect(coverage).toMatchObject({ status: 'opaque' });
    if (coverage.status === 'opaque') expect(coverage.reason).toContain(`${family} uses enumerator`);
  });

  it('is canonical under family, declaration, producer, consumer, and source-image permutations', () => {
    const live = liveFacts();
    fc.assert(
      fc.property(
        fc.shuffledSubarray([...live.families], {
          minLength: live.families.length,
          maxLength: live.families.length,
        }),
        (families) => {
          expect(combineFeatureEdgeFamilies(families)).toEqual(live);
        },
      ),
      { numRuns: 40 },
    );

    const declarations = ['alpha', 'beta', 'gamma'].map((subject, index) => ({
      subject,
      mechanism: 'registry-entry' as const,
      file: 'fixture/catalog.ts',
      line: index + 1,
    }));
    const producers = declarations.map((row) => ({ ...row, mechanism: 'command-handler' as const }));
    const consumers = declarations.map((row) => ({ ...row, mechanism: 'cli-executor' as const }));
    const sourceImage = [
      { owner: 'catalog', value: declarations.map((row) => row.subject) },
      { owner: 'handlers', value: producers.map((row) => row.subject) },
    ];
    const canonical = buildCatalogFeatureEdgeFamily({
      family: 'command',
      declarations,
      producers,
      consumers,
      sourceImage,
    });
    fc.assert(
      fc.property(
        fc.shuffledSubarray(declarations, { minLength: 3, maxLength: 3 }),
        fc.shuffledSubarray(producers, { minLength: 3, maxLength: 3 }),
        fc.shuffledSubarray(consumers, { minLength: 3, maxLength: 3 }),
        fc.shuffledSubarray(sourceImage, { minLength: 2, maxLength: 2 }),
        (declarationOrder, producerOrder, consumerOrder, sourceOrder) => {
          expect(
            buildCatalogFeatureEdgeFamily({
              family: 'command',
              declarations: declarationOrder,
              producers: producerOrder,
              consumers: consumerOrder,
              sourceImage: sourceOrder,
            }),
          ).toEqual(canonical);
        },
      ),
      { numRuns: 60 },
    );
  });

  it('changes family and aggregate digests when semantic owner evidence changes', () => {
    const options: CatalogFeatureEdgeOptions = {
      family: 'command',
      declarations: [{ subject: 'alpha', mechanism: 'registry-entry', file: 'fixture/catalog.ts', line: 1 }],
      producers: [{ subject: 'alpha', mechanism: 'command-handler', file: 'fixture/handler.ts', line: 1 }],
      sourceImage: [{ owner: 'command-catalog', value: ['alpha'] }],
    };
    const before = buildCatalogFeatureEdgeFamily(options);
    const after = buildCatalogFeatureEdgeFamily({
      ...options,
      producers: [{ ...options.producers[0]!, file: 'fixture/new-handler.ts' }],
    });
    expect(after.subjectCoverage.censusDigest).not.toBe(before.subjectCoverage.censusDigest);

    const live = liveFacts();
    const beforeAggregate = combineFeatureEdgeFamilies(
      live.families.map((pack) => (pack.family === 'command' ? before : pack)),
    );
    const afterAggregate = combineFeatureEdgeFamilies(
      live.families.map((pack) => (pack.family === 'command' ? after : pack)),
    );
    expect(afterAggregate.aggregate.censusDigest).not.toBe(beforeAggregate.aggregate.censusDigest);
  });

  it('rejects fabricated catalog subjects and makes event projection drift observable in every consumer image', () => {
    const declaration = {
      subject: 'alpha',
      mechanism: 'registry-entry' as const,
      file: 'fixture/catalog.ts',
      line: 1,
    };
    expect(() =>
      buildCatalogFeatureEdgeFamily({
        family: 'command',
        declarations: [declaration],
        producers: [
          {
            ...declaration,
            subject: 'fabricated',
            mechanism: 'command-handler',
          },
        ],
      }),
    ).toThrow(/producer names undeclared subject "fabricated"/u);

    const records = collectEventProtocol(REPO_ROOT);
    const [first, ...rest] = records;
    expect(first).toBeDefined();
    const drifted = [
      {
        ...first!,
        owner: `${first!.owner}-drift`,
        channel: first!.channel === 'dom' ? ('vite-hmr' as const) : ('dom' as const),
        detail: '{ readonly drift: true }',
        producers: [...first!.producers, 'packages/fabricated/producer.ts'],
        description: `${first!.description} drift`,
      },
      ...rest,
    ];
    expect(renderEventProtocolDts(drifted)).not.toBe(renderEventProtocolDts(records));
    expect(renderWebEventProjection(drifted)).not.toBe(renderWebEventProjection(records));
    expect(renderEventProtocolHostProjection(drifted)).not.toBe(renderEventProtocolHostProjection(records));
  });

  it('blocks iff any of the four current-head qualification axes fails, despite an integrity waiver', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        (redCaught, greenClean, mutationKilled, coverageComplete) => {
          const result = runGates(
            [qualificationGate(redCaught, greenClean, mutationKilled, coverageComplete)],
            memoryContext({ 'fixture.ts': 'good' }, '/real'),
            {
              waivers: [
                {
                  ruleId: 'gauntlet/authority-integrity',
                  owner: 'adversarial-test',
                  reason: 'qualification defects are engine-owned and unwaivable',
                  expires: '2999-01-01',
                  blastRadius: 'test-only',
                  debtScore: 0,
                },
              ],
            },
          );
          const qualified = redCaught && greenClean && mutationKilled && coverageComplete;
          expect(result.blocked).toBe(!qualified);
          expect(result.findings.filter((row) => row.ruleId === 'gauntlet/authority-integrity')).toHaveLength(
            qualified ? 0 : 1,
          );
          expect(result.outcomes[0]!.waived).toEqual([]);
          if (!qualified) {
            const integrity = result.findings.find((row) => row.ruleId === 'gauntlet/authority-integrity')!;
            expect(integrity.detail.includes('red fixture did not prove detection')).toBe(!redCaught);
            expect(integrity.detail.includes('green fixture was not clean')).toBe(!greenClean);
            expect(integrity.detail.includes('mutation survived')).toBe(!mutationKilled);
            expect(integrity.detail.includes('subject population is opaque')).toBe(!coverageComplete);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('retains the escaped MotionProgram RED while the live typed Scene projection precludes it', () => {
    const defect = loadHistoricalDefect(REPO_ROOT, HISTORICAL_FIXTURE);
    const historical = buildEcsFeatureEdgeFacts({
      repoRoot: REPO_ROOT,
      sourceFiles: defect.sourceFiles,
      api: { ...HISTORICAL_API, declarationFile: defect.apiDeclarationFile },
    });
    const historicalFacts = combineFeatureEdgeFamilies(
      liveFacts().families.map((pack) => (pack.family === 'ecs-component' ? historical : pack)),
    );
    expect(decideFeatureEdgeConnectivity({ featureEdges: historicalFacts })).toContainEqual(
      expect.objectContaining({
        ruleId: 'gauntlet/feature-edge-connectivity/orphan-consumer',
        title: 'ECS component "MotionProgram" is consumed but never produced',
      }),
    );

    const liveEcs = liveFacts().families.find((pack) => pack.family === 'ecs-component')!;
    expect(liveEcs.observations.some((row) => row.subject === 'MotionProgram')).toBe(false);
    expect(
      liveEcs.observations
        .filter((row) => row.subject === 'RuntimeWritePlan')
        .map((row) => row.role)
        .sort(),
    ).toEqual(['consumer', 'producer']);
  });
});
