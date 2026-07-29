// PROVES: INV-FEATURE-EDGE-PRODUCER
/** Algebraic laws for feature consumer/producer connectivity. */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { decideFeatureEdgeConnectivity, type FeatureEdgeFacts } from '@liteship/gauntlet';
import { buildCatalogFeatureEdgeFamily, combineFeatureEdgeFamilies } from '@liteship/audit';
import { FEATURE_EDGE_FAMILIES, FEATURE_EDGE_ENUMERATORS, type FeatureEdgeFamilyFacts } from '@liteship/gauntlet';

const subjectArbitrary = fc
  .tuple(
    fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'),
    fc.array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'), { minLength: 1, maxLength: 10 }),
  )
  .map(([head, tail]) => `${head}${tail.join('')}`);

function facts(consumers: readonly string[], producers: readonly string[]): FeatureEdgeFacts {
  const observations: FeatureEdgeFamilyFacts['observations'][number][] = [];
  for (const [line, subject] of [...consumers].sort().entries()) {
    observations.push({
      family: 'ecs-component',
      subject,
      role: 'consumer',
      mechanism: 'system-query',
      file: 'fixture/consumer.ts',
      line: line + 1,
    });
  }
  for (const [line, subject] of [...producers].sort().entries()) {
    observations.push({
      family: 'ecs-component',
      subject,
      role: 'producer',
      mechanism: 'world-spawn',
      file: 'fixture/producer.ts',
      line: line + 1,
    });
  }
  const ecs: FeatureEdgeFamilyFacts = {
    family: 'ecs-component',
    observations,
    subjectCoverage: {
      status: 'complete',
      enumerator: 'ts-checker/ecs-component-v1',
      enumeratedCount: new Set([...consumers, ...producers]).size,
      censusDigest: `sha256:${'a'.repeat(64)}`,
    },
  };
  const empty = FEATURE_EDGE_FAMILIES.filter((family) => family !== 'ecs-component').map((family) =>
    buildCatalogFeatureEdgeFamily({
      family,
      declarations: [],
      producers: [],
      sourceImage: [{ owner: FEATURE_EDGE_ENUMERATORS[family], value: [] }],
    }),
  );
  return combineFeatureEdgeFamilies([ecs, ...empty]);
}

function orphanSubjects(featureEdges: FeatureEdgeFacts): readonly string[] {
  return decideFeatureEdgeConnectivity({ featureEdges })
    .map((finding) => /^ECS component "(.+)" is consumed but never produced$/u.exec(finding.title)?.[1])
    .filter((subject): subject is string => subject !== undefined)
    .sort();
}

describe('feature-edge connectivity algebra', () => {
  it('orphans are exactly consumers minus producers, independent of observation order', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(subjectArbitrary, { maxLength: 12 }),
        fc.uniqueArray(subjectArbitrary, { maxLength: 12 }),
        (consumers, producers) => {
          const expected = consumers.filter((subject) => !producers.includes(subject)).sort();
          const forward = facts(consumers, producers);
          const reverse: FeatureEdgeFacts = {
            ...forward,
            families: forward.families.map((family) =>
              family.family === 'ecs-component'
                ? { ...family, observations: [...family.observations].reverse() }
                : family,
            ),
          };
          expect(orphanSubjects(forward)).toEqual(expected);
          expect(orphanSubjects(reverse)).toEqual(expected);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('producer-only subjects never become false-positive orphan consumers', () => {
    fc.assert(
      fc.property(fc.uniqueArray(subjectArbitrary, { minLength: 1, maxLength: 12 }), (producers) => {
        expect(orphanSubjects(facts([], producers))).toEqual([]);
      }),
      { numRuns: 60 },
    );
  });
});
