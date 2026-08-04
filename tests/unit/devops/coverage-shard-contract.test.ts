import { describe, expect, it } from 'vitest';
import { assertCompleteCoverageShards } from '../../../scripts/lib/coverage-shard-contract.js';

describe('composed coverage shard contract', () => {
  it('accepts every expected shard independent of discovery order', () => {
    expect(() =>
      assertCompleteCoverageShards(['node-shard-4', 'node-shard-1', 'node-shard-3', 'node-shard-2'], 4),
    ).not.toThrow();
  });

  // The case label is the FIRST column so `%s` names the defect under test.
  // With the label second, every title read `rejects a node-shard-1,...
  // receipt set` and the reason never reached the reported name.
  it.each([
    ['missing shard', ['node-shard-1', 'node-shard-2', 'node-shard-4']],
    ['duplicate shard', ['node-shard-1', 'node-shard-2', 'node-shard-3', 'node-shard-3']],
    ['foreign shard', ['node-shard-1', 'node-shard-2', 'node-shard-3', 'node-shard-5']],
  ] as const)('rejects a %s receipt set', (_reason, shards) => {
    expect(() => assertCompleteCoverageShards(shards, 4)).toThrow(/coverage shard/u);
  });
});
