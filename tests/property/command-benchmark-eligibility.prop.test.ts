/** Eligibility is a relation over sets, never array order. @module */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { CapsuleCommandDescriptor } from '@liteship/core';
import {
  COMMAND_BENCHMARK_ELIGIBILITY,
  COMMAND_CATALOG,
  commandBenchmarkEligibilityIssues,
  type CommandBenchmarkEligibility,
} from '../../packages/command/src/catalog.js';
import { buildBenchmarkSubjectFacts } from '../../packages/audit/src/benchmark-subject-facts.js';
import { benchScriptTargets } from '../../scripts/bench/contract-coverage.js';
import { readDistributionRegistry } from '../../scripts/bench/contracts.js';
import { repoRoot } from '../../vitest.shared.js';

function rotate<T>(values: readonly T[], amount: number): readonly T[] {
  if (values.length === 0) return values;
  const offset = ((amount % values.length) + values.length) % values.length;
  return [...values.slice(offset), ...values.slice(0, offset)];
}

const registry = readDistributionRegistry(repoRoot);
if (registry === null) throw new TypeError('benchmark distribution registry must parse');
const LIVE_FACTS = buildBenchmarkSubjectFacts(registry.distributions, (path) => {
  const absolute = resolve(repoRoot, path);
  return existsSync(absolute) ? readFileSync(absolute, 'utf8') : undefined;
});
const EXECUTED_BENCHMARK_FILES = benchScriptTargets(repoRoot);

function normalizedIssues(
  catalog: readonly CapsuleCommandDescriptor[],
  eligibility: readonly CommandBenchmarkEligibility[],
  factOffset: number,
  executedOffset: number,
): readonly string[] {
  return commandBenchmarkEligibilityIssues(
    catalog,
    eligibility,
    { ...LIVE_FACTS, distributions: rotate(LIVE_FACTS.distributions, factOffset) },
    rotate(EXECUTED_BENCHMARK_FILES, executedOffset),
  )
    .map((issue) => `${issue.kind}:${issue.command}:${issue.detail}`)
    .sort();
}

describe('command benchmark eligibility relation properties', () => {
  it('is invariant under catalog, classification, fact, and execution-set permutations', () => {
    const check = COMMAND_BENCHMARK_ELIGIBILITY.find((row) => row.command === 'check')!;
    const plantedCatalog = [
      ...COMMAND_CATALOG,
      { name: 'planted.unclassified', summary: 'property control', inputSchema: { type: 'object' as const } },
    ];
    const plantedEligibility = [
      ...COMMAND_BENCHMARK_ELIGIBILITY,
      check,
      { command: 'planted.orphan', classification: 'not-performance' as const },
    ];
    const expected = normalizedIssues(plantedCatalog, plantedEligibility, 0, 0);

    fc.assert(
      fc.property(
        fc.integer(),
        fc.integer(),
        fc.integer(),
        fc.integer(),
        (catalogOffset, rowOffset, factOffset, runOffset) => {
          expect(
            normalizedIssues(
              rotate(plantedCatalog, catalogOffset),
              rotate(plantedEligibility, rowOffset),
              factOffset,
              runOffset,
            ),
          ).toEqual(expected);
        },
      ),
      { numRuns: 50, seed: 0xc0f7 },
    );
  });
});
