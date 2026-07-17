// @vitest-environment node
import { describe, expect, test } from 'vitest';
import { Cap, DocumentGraphNodeSchema, isWellFormedNode } from '@czap/core';
import type { CapTier } from '@czap/core';

const META = {
  created: { wall_ms: 0, counter: 0, node_id: 't' },
  updated: { wall_ms: 0, counter: 0, node_id: 't' },
  version: 1,
};

const policyNode = (levels: readonly CapTier[]): unknown => ({
  _tag: 'DocGraphPolicyNode',
  _version: 1,
  family: 'policy',
  id: 'fnv1a:test',
  meta: META,
  appliesTo: [],
  requires: 'static',
  grants: { _tag: 'CapSet', levels },
  sites: ['browser'],
});

describe('DocumentGraphNodeSchema Standard Schema V1 interop', () => {
  test('carries the Standard Schema V1 metadata', () => {
    expect('~standard' in DocumentGraphNodeSchema).toBe(true);
    expect(DocumentGraphNodeSchema['~standard'].version).toBe(1);
    // The node schema is now a kernel schema bridged through the kernel's
    // `~standard` conformance layer, so the vendor is LiteShip's, not effect's.
    expect(DocumentGraphNodeSchema['~standard'].vendor).toBe('liteship');
  });

  test('validates a well-formed node through the Standard Schema interface', async () => {
    const value = policyNode(Cap.from(['gpu', 'static']).levels);

    const result = await DocumentGraphNodeSchema['~standard'].validate(value);

    expect(result).toEqual({ value });
    expect('issues' in result ? result.issues : undefined).toBeUndefined();
  });

  test('returns string-message issues for malformed input', async () => {
    const result = await DocumentGraphNodeSchema['~standard'].validate({ _tag: 'garbage' });

    expect('issues' in result && result.issues.length > 0).toBe(true);
    if (!('issues' in result)) throw new Error('expected Standard Schema issues');
    expect(result.issues.every((issue) => typeof issue.message === 'string')).toBe(true);
  });

  test('keeps isWellFormedNode behavior unchanged', () => {
    const valid = policyNode(['static', 'gpu']);
    const invalid = policyNode(['gpu', 'static']);

    expect(isWellFormedNode(valid)).toBe(true);
    expect(isWellFormedNode(invalid)).toBe(false);
  });
});
