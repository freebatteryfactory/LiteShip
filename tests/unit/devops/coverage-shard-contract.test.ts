import { describe, expect, it } from 'vitest';
import { assertCompleteCoverageShards } from '../../../scripts/lib/coverage-shard-contract.js';

describe('composed coverage shard contract', () => {
  it('accepts every expected shard independent of discovery order', () => {
    expect(() =>
      assertCompleteCoverageShards(['node-shard-4', 'node-shard-1', 'node-shard-3', 'node-shard-2'], 4),
    ).not.toThrow();
  });

  it.each([
    [['node-shard-1', 'node-shard-2', 'node-shard-4'], 'missing shard'],
    [['node-shard-1', 'node-shard-2', 'node-shard-3', 'node-shard-3'], 'duplicate shard'],
    [['node-shard-1', 'node-shard-2', 'node-shard-3', 'node-shard-5'], 'foreign shard'],
  ] as const)('rejects a %s receipt set', (shards) => {
    expect(() => assertCompleteCoverageShards(shards, 4)).toThrow(/coverage shard/u);
  });
});
