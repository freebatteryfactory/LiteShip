/**
 * Feature-edge connectivity facts produced by host-side semantic oracles.
 *
 * The gauntlet deliberately carries no parser or TypeScript dependency. Hosts
 * enumerate each canonical subject family, attach a deterministic census
 * receipt, and hand the immutable facts to the pure connectivity fold.
 *
 * @module
 */

import type { GateSubjectCoverage } from '../gate.js';

/** Every feature-edge family governed by the fleet-wide connectivity law. */
export const FEATURE_EDGE_FAMILIES = Object.freeze([
  'ecs-component',
  'lsp-method',
  'mcp-method',
  'command-capability',
  'command',
  'mcp-resource',
  'mcp-prompt',
  'capsule-kind',
  'fleet-event',
] as const);

/** One governed producer/consumer identity domain in the complete feature-edge census. */
export type FeatureEdgeFamily = (typeof FEATURE_EDGE_FAMILIES)[number];

/** Stable semantic-oracle identities. A version change denotes a changed census law. */
export type FeatureEdgeEnumerator =
  | 'ts-checker/ecs-component-v1'
  | 'catalog/lsp-method-v1'
  | 'catalog/mcp-method-v1'
  | 'catalog/command-capability-v1'
  | 'registry/command-v1'
  | 'registry/mcp-resource-v1'
  | 'registry/mcp-prompt-v1'
  | 'catalog/capsule-kind-v1'
  | 'catalog/liteship-event-v1';

/** One-to-one family/enumerator law used by hosts and fact validation. */
export const FEATURE_EDGE_ENUMERATORS: Readonly<Record<FeatureEdgeFamily, FeatureEdgeEnumerator>> = Object.freeze({
  'ecs-component': 'ts-checker/ecs-component-v1',
  'lsp-method': 'catalog/lsp-method-v1',
  'mcp-method': 'catalog/mcp-method-v1',
  'command-capability': 'catalog/command-capability-v1',
  command: 'registry/command-v1',
  'mcp-resource': 'registry/mcp-resource-v1',
  'mcp-prompt': 'registry/mcp-prompt-v1',
  'capsule-kind': 'catalog/capsule-kind-v1',
  'fleet-event': 'catalog/liteship-event-v1',
});

/** The concrete relation by which a subject is consumed or produced. */
export type FeatureEdgeMechanism =
  | 'system-query'
  | 'world-query'
  | 'world-spawn'
  | 'world-set-component'
  | 'world-add-component'
  | 'dense-store'
  | 'protocol-declaration'
  | 'request-route'
  | 'notification-emitter'
  | 'capability-advertisement'
  | 'rpc-handler'
  | 'context-declaration'
  | 'command-requirement'
  | 'host-provider'
  | 'modeled-degradation'
  | 'registry-entry'
  | 'command-handler'
  | 'cli-executor'
  | 'resource-reader'
  | 'prompt-resolver'
  | 'capsule-validator'
  | 'capsule-compiler'
  | 'event-dispatch'
  | 'event-listener';

/** One statically evidenced endpoint of a named feature edge. */
export interface FeatureEdgeObservation {
  readonly family: FeatureEdgeFamily;
  readonly subject: string;
  readonly role: 'consumer' | 'producer';
  readonly mechanism: FeatureEdgeMechanism;
  readonly file: string;
  readonly line: number;
}

/** One location whose dynamic shape prevented exact subject enumeration. */
export interface OpaqueFeatureEdgeSite {
  readonly family: FeatureEdgeFamily;
  readonly role: 'consumer' | 'producer';
  readonly mechanism: FeatureEdgeMechanism;
  readonly file: string;
  readonly line: number;
  readonly reason: string;
}

/** Exact subject-coverage receipt for one governed family. */
export type FeatureEdgeSubjectCoverage =
  | {
      readonly status: 'complete';
      readonly enumerator: FeatureEdgeEnumerator;
      /** Number of distinct subjects, never the number of scanned files. */
      readonly enumeratedCount: number;
      readonly censusDigest: `sha256:${string}`;
    }
  | {
      readonly status: 'unknown';
      readonly enumerator: FeatureEdgeEnumerator;
      /** Number of distinct statically enumerated subjects before opacity was found. */
      readonly enumeratedCount: number;
      readonly censusDigest: `sha256:${string}`;
      readonly opaqueSites: readonly OpaqueFeatureEdgeSite[];
    };

/** One independently enumerated feature family. */
export interface FeatureEdgeFamilyFacts {
  readonly family: FeatureEdgeFamily;
  readonly observations: readonly FeatureEdgeObservation[];
  readonly subjectCoverage: FeatureEdgeSubjectCoverage;
}

/** Aggregate integrity receipt minted by the host over the ordered family packs. */
export interface FeatureEdgeAggregateReceipt {
  readonly enumerator: 'feature-edge/family-set-v1';
  readonly enumeratedCount: number;
  readonly censusDigest: `sha256:${string}`;
}

/** The complete multi-family fact pack folded by feature-edge authority. */
export interface FeatureEdgeFacts {
  readonly _tag: 'feature-edge-facts';
  readonly families: readonly FeatureEdgeFamilyFacts[];
  readonly aggregate: FeatureEdgeAggregateReceipt;
}

/**
 * Project the family receipts into the gauntlet's generic qualification axis.
 *
 * Missing, duplicated, mismatched, or opaque families make the whole claim
 * opaque. The aggregate SHA is host-minted over ordered family ids + receipts;
 * gauntlet checks its structural invariants without taking a hashing dependency.
 */
export function featureEdgeSubjectCoverage(facts: FeatureEdgeFacts | undefined): GateSubjectCoverage {
  const zero = `sha256:${'0'.repeat(64)}` as const;
  if (facts === undefined) {
    return {
      status: 'opaque',
      enumerator: 'feature-edge/family-set-v1',
      enumeratedCount: 0,
      censusDigest: zero,
      reason: 'the required feature-edge fact pack was not supplied by the host',
    };
  }

  const expected = new Set<FeatureEdgeFamily>(FEATURE_EDGE_FAMILIES);
  const seen = new Set<FeatureEdgeFamily>();
  const problems: string[] = [];
  let enumeratedCount = 0;
  for (const pack of facts.families) {
    if (seen.has(pack.family)) problems.push(`duplicate family ${pack.family}`);
    seen.add(pack.family);
    expected.delete(pack.family);
    const expectedEnumerator = FEATURE_EDGE_ENUMERATORS[pack.family];
    if (pack.subjectCoverage.enumerator !== expectedEnumerator) {
      problems.push(
        `${pack.family} uses enumerator ${pack.subjectCoverage.enumerator} instead of ${expectedEnumerator}`,
      );
    }
    const actualSubjects = new Set(pack.observations.map((observation) => observation.subject)).size;
    if (pack.subjectCoverage.enumeratedCount !== actualSubjects) {
      problems.push(
        `${pack.family} receipt counts ${pack.subjectCoverage.enumeratedCount} subjects but observations name ${actualSubjects}`,
      );
    }
    enumeratedCount += actualSubjects;
    if (pack.subjectCoverage.status === 'unknown') {
      const first = pack.subjectCoverage.opaqueSites[0];
      problems.push(
        `${pack.family} is opaque at ${first?.file ?? '<unknown>'}:${first?.line ?? 1} (${first?.reason ?? 'no site supplied'})`,
      );
    }
    if (pack.observations.some((observation) => observation.family !== pack.family)) {
      problems.push(`${pack.family} contains an observation from another family`);
    }
  }
  if (expected.size > 0) problems.push(`missing families: ${[...expected].sort().join(', ')}`);
  if (facts.aggregate.enumeratedCount !== enumeratedCount) {
    problems.push(
      `aggregate receipt counts ${facts.aggregate.enumeratedCount} subjects but family receipts name ${enumeratedCount}`,
    );
  }

  return problems.length === 0
    ? {
        status: 'complete',
        enumerator: facts.aggregate.enumerator,
        enumeratedCount,
        censusDigest: facts.aggregate.censusDigest,
      }
    : {
        status: 'opaque',
        enumerator: facts.aggregate.enumerator,
        enumeratedCount,
        censusDigest: facts.aggregate.censusDigest,
        reason: problems.join('; '),
      };
}
