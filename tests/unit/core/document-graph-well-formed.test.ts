/**
 * isWellFormedNode matrix — all eight DocumentGraph node families, derived from
 * the schema union (not a hand-maintained list).
 *
 * @module
 */

import { describe, test, expect } from 'vitest';
import { Cap, isWellFormedNode, type DocumentGraphNode, type NodeFamily } from '@czap/core';

const ADDR = 'fnv1a:00000001' as const;
const ADDR2 = 'fnv1a:00000002' as const;
const META = { created: { wall_ms: 0, counter: 0, node_id: 't' }, updated: { wall_ms: 0, counter: 0, node_id: 't' }, version: 1 };
const DIGEST = { display_id: ADDR, integrity_digest: 'sha256:abc', algo: 'sha256' as const };

/** Derive families from the DocumentGraphNode union via the `family` discriminant. */
const NODE_FAMILIES = [
  'signal',
  'entity',
  'component',
  'pose',
  'transition',
  'projection',
  'policy',
  'export',
] as const satisfies readonly NodeFamily[];

function wellFormed(family: NodeFamily): DocumentGraphNode {
  switch (family) {
    case 'signal':
      return { _tag: 'DocGraphSignalNode', _version: 1, family, id: ADDR, meta: META, input: 'scroll.progress' };
    case 'entity':
      return { _tag: 'DocGraphEntityNode', _version: 1, family, id: ADDR, meta: META, components: [ADDR2] };
    case 'component':
      return { _tag: 'DocGraphComponentNode', _version: 1, family, id: ADDR, meta: META, name: 'hero' };
    case 'pose':
      return {
        _tag: 'DocGraphPoseNode',
        _version: 1,
        family,
        id: ADDR,
        meta: META,
        entityRef: ADDR2,
        state: 'before',
        bindings: { opacity: 0 },
      };
    case 'transition':
      return {
        _tag: 'DocGraphTransitionNode',
        _version: 1,
        family,
        id: ADDR,
        meta: META,
        fromPose: ADDR2,
        toPose: ADDR,
        routing: 'seq',
      };
    case 'projection':
      return {
        _tag: 'DocGraphProjectionNode',
        _version: 1,
        family,
        id: ADDR,
        meta: META,
        target: 'css',
        sourceRef: ADDR2,
        keys: {},
        resultDigest: DIGEST,
      };
    case 'policy':
      return {
        _tag: 'DocGraphPolicyNode',
        _version: 1,
        family,
        id: ADDR,
        meta: META,
        appliesTo: [ADDR2],
        requires: 'styled',
        grants: Cap.from(['static', 'styled']),
        sites: ['browser'],
      };
    case 'export':
      return {
        _tag: 'DocGraphExportNode',
        _version: 1,
        family,
        id: ADDR,
        meta: META,
        carrier: 'video',
        sourceRefs: [ADDR2],
        artifactDigest: DIGEST,
      };
  }
}

function malformed(family: NodeFamily): unknown {
  const base = wellFormed(family) as Record<string, unknown>;
  switch (family) {
    case 'signal':
      return { ...base, input: 42 };
    case 'entity':
      return { ...base, components: 'not-an-array' };
    case 'component':
      return { ...base, name: 1 };
    case 'pose':
      return { ...base, bindings: 'bad' };
    case 'transition':
      return { ...base, routing: 'invalid-routing' };
    case 'projection':
      return { ...base, target: 'not-a-target' };
    case 'policy':
      return { ...base, grants: { _tag: 'CapSet', levels: ['gpu', 'static'] } };
    case 'export':
      return { ...base, carrier: 'not-a-carrier' };
  }
}

describe('isWellFormedNode — family matrix (catalog-derived)', () => {
  test('family count matches NodeFamily union (eight families)', () => {
    expect(NODE_FAMILIES.length).toBe(8);
    expect(NODE_FAMILIES).toContain('export');
  });

  for (const family of NODE_FAMILIES) {
    test(`${family}: accepts a well-formed node`, () => {
      expect(isWellFormedNode(wellFormed(family))).toBe(true);
    });

    test(`${family}: rejects a malformed node`, () => {
      expect(isWellFormedNode(malformed(family))).toBe(false);
    });
  }

  test('rejects wrong _tag / family mismatch', () => {
    const node = wellFormed('signal');
    expect(isWellFormedNode({ ...node, _tag: 'DocGraphEntityNode' })).toBe(false);
    expect(isWellFormedNode({ ...node, family: 'entity' })).toBe(false);
  });
});
