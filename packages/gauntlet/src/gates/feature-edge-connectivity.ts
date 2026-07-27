/**
 * Feature-edge connectivity gate.
 *
 * A host supplies independently enumerated family censuses. This pure FactGate
 * reports every consumed subject with no producer and refuses missing, duplicate,
 * mismatched, or opaque family coverage. Producer-only subjects remain evidence:
 * an output may deliberately cross a host boundary.
 *
 * @module
 */

import { defineFactGate, type FactBundle, type FactGate, type Gate, type GateContext } from '../gate.js';
import { finding, type Finding } from '../finding.js';
import { memoryContext } from '../engine.js';
import {
  FEATURE_EDGE_FAMILIES,
  FEATURE_EDGE_ENUMERATORS,
  featureEdgeSubjectCoverage,
  type FeatureEdgeFacts,
  type FeatureEdgeFamily,
  type FeatureEdgeFamilyFacts,
} from '../facts/feature-edge-facts.js';

const RULE_ID = 'gauntlet/feature-edge-connectivity';

const FAMILY_LABEL: Readonly<Record<FeatureEdgeFamily, string>> = Object.freeze({
  'ecs-component': 'ECS component',
  'lsp-method': 'LSP method',
  'mcp-method': 'MCP method',
  'command-capability': 'command capability',
  command: 'command',
  'mcp-resource': 'MCP resource',
  'mcp-prompt': 'MCP prompt',
  'capsule-kind': 'capsule kind',
  'fleet-event': 'fleet event',
});

function coverageFinding(pack: FeatureEdgeFacts | undefined): Finding {
  const coverage = featureEdgeSubjectCoverage(pack);
  return finding({
    ruleId: `${RULE_ID}/subject-coverage`,
    severity: 'error',
    level: 'L4',
    title: 'Feature-edge subject census is opaque',
    detail:
      coverage.status === 'opaque'
        ? `The ${coverage.enumerator} oracle cannot mint a complete connectivity verdict: ${coverage.reason}. Census ${coverage.censusDigest}.`
        : 'The required feature-edge facts were not supplied by the host.',
    location: { file: 'packages/audit/src/feature-edge-census.ts', line: 1 },
    coverageClass: 'symbol-evidenced',
    remediation: {
      kind: 'instruction',
      description: 'Make every governed feature family statically enumerable.',
      steps: [
        'Restore the missing canonical family projection or route dynamic identity through its typed/catalog owner.',
        'Re-run the feature-edge census; do not exclude opaque or orphaned subjects.',
      ],
    },
  });
}

function orphanFindings(pack: FeatureEdgeFamilyFacts): readonly Finding[] {
  const subjects = new Map<
    string,
    { consumers: FeatureEdgeFamilyFacts['observations']; producers: FeatureEdgeFamilyFacts['observations'] }
  >();
  for (const observation of pack.observations) {
    const row = subjects.get(observation.subject) ?? { consumers: [], producers: [] };
    if (observation.role === 'consumer') row.consumers = [...row.consumers, observation];
    else row.producers = [...row.producers, observation];
    subjects.set(observation.subject, row);
  }

  const findings: Finding[] = [];
  for (const [subject, row] of [...subjects.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    if (row.consumers.length === 0 || row.producers.length > 0) continue;
    const consumer = row.consumers[0]!;
    const label = FAMILY_LABEL[pack.family];
    findings.push(
      finding({
        ruleId: `${RULE_ID}/orphan-consumer`,
        severity: 'error',
        level: 'L4',
        title: `${label} "${subject}" is consumed but never produced`,
        detail: `The complete ${pack.subjectCoverage.enumerator} census found ${row.consumers.length} consumer site(s) for ${pack.family} subject "${subject}" and zero producers among ${pack.subjectCoverage.enumeratedCount} enumerated subjects. A declared endpoint with nothing on the other side is inert machinery, not a completed feature. Census ${pack.subjectCoverage.censusDigest}.`,
        location: { file: consumer.file, line: consumer.line },
        coverageClass: 'symbol-evidenced',
        remediation: {
          kind: 'instruction',
          description: `Connect the ${pack.family} subject through its canonical owner.`,
          steps: [
            `Declare and produce "${subject}" through the canonical ${pack.family} protocol.`,
            'Exercise the producer-to-consumer route end to end; do not delete or exclude the consumer to clear the gate.',
          ],
        },
      }),
    );
  }
  return findings;
}

/** Context-free multi-family feature-edge decision. */
export function decideFeatureEdgeConnectivity(facts: FactBundle): readonly Finding[] {
  const pack = facts.featureEdges;
  const coverage = featureEdgeSubjectCoverage(pack);
  if (coverage.status === 'opaque') return [coverageFinding(pack)];
  return pack!.families.flatMap(orphanFindings);
}

function factContext(featureEdges: FeatureEdgeFacts): GateContext {
  return { ...memoryContext({}), featureEdges };
}

const DIGEST = `sha256:${'a'.repeat(64)}` as const;

function emptyFamily(family: FeatureEdgeFamily): FeatureEdgeFamilyFacts {
  return {
    family,
    observations: [],
    subjectCoverage: {
      status: 'complete',
      enumerator: FEATURE_EDGE_ENUMERATORS[family],
      enumeratedCount: 0,
      censusDigest: DIGEST,
    },
  };
}

function fixtureFacts(connected: boolean): FeatureEdgeFacts {
  const families = FEATURE_EDGE_FAMILIES.map((family) =>
    family !== 'ecs-component'
      ? emptyFamily(family)
      : {
          family,
          observations: [
            {
              family,
              subject: 'MotionProgram',
              role: 'consumer' as const,
              mechanism: 'system-query' as const,
              file: 'fixtures/motion-system.ts',
              line: 7,
            },
            ...(connected
              ? [
                  {
                    family,
                    subject: 'MotionProgram',
                    role: 'producer' as const,
                    mechanism: 'world-spawn' as const,
                    file: 'fixtures/runtime.ts',
                    line: 4,
                  },
                ]
              : []),
          ],
          subjectCoverage: {
            status: 'complete' as const,
            enumerator: 'ts-checker/ecs-component-v1' as const,
            enumeratedCount: 1,
            censusDigest: DIGEST,
          },
        },
  );
  return {
    _tag: 'feature-edge-facts',
    families,
    aggregate: {
      enumerator: 'feature-edge/family-set-v1',
      enumeratedCount: 1,
      censusDigest: DIGEST,
    },
  };
}

const RED_FACTS = fixtureFacts(false);
const GREEN_FACTS = fixtureFacts(true);

/** Blocking feature-edge connectivity authority. */
export const featureEdgeConnectivityGate: FactGate = defineFactGate({
  id: RULE_ID,
  level: 'L4',
  describe:
    'Catalog/checker-backed feature-edge connectivity: every declared consumer resolves to a producer, and every governed family proves complete subject coverage.',
  requires: ['featureEdges'],
  decide: decideFeatureEdgeConnectivity,
  subjectCoverage: (facts) => featureEdgeSubjectCoverage(facts.featureEdges),
  fixtures: {
    red: { name: 'MotionProgram is queried by a System but has no producer', context: factContext(RED_FACTS) },
    green: { name: 'MotionProgram query and spawn producer are connected', context: factContext(GREEN_FACTS) },
    mutation: {
      describe: 'A blind mutant drops the historical orphan finding and fails the red fixture.',
      mutate: (gate: Gate): Gate => {
        const blind = (): readonly Finding[] => [];
        return { ...gate, decide: blind, run: blind };
      },
    },
  },
});
