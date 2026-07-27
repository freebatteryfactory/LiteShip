/** Pure completeness law for the composed Node coverage authority. @module */

/** Refuse any missing, duplicate, or foreign shard before coverage merge/floor evaluation. */
export function assertCompleteCoverageShards(shardNames: readonly string[], expectedTotal: number): void {
  if (!Number.isInteger(expectedTotal) || expectedTotal < 1) throw new TypeError('coverage shard total is invalid');
  const expected = Array.from({ length: expectedTotal }, (_, index) => `node-shard-${index + 1}`);
  const actual = [...shardNames].sort();
  if (new Set(actual).size !== actual.length) throw new TypeError('coverage shard set contains duplicates');
  if (actual.length !== expected.length || actual.some((name, index) => name !== expected[index])) {
    throw new TypeError(
      `coverage shard set must be exactly ${expected.join(', ')}, received ${actual.join(', ') || '(none)'}`,
    );
  }
}
