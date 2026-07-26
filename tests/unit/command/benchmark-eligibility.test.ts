/** Command catalog to executed benchmark-subject eligibility controls. @module */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { CapsuleCommandDescriptor } from '@liteship/core';
import {
  COMMAND_BENCHMARK_ELIGIBILITY,
  COMMAND_CATALOG,
  commandBenchmarkEligibilityIssues,
  type CommandBenchmarkEligibility,
} from '../../../packages/command/src/catalog.js';
import { buildBenchmarkSubjectFacts } from '../../../packages/audit/src/benchmark-subject-facts.js';
import { benchScriptTargets } from '../../../scripts/bench/contract-coverage.ts';
import { readDistributionRegistry } from '../../../scripts/bench/contracts.ts';
import { repoRoot } from '../../../vitest.shared.ts';

function benchmarkFacts() {
  const registry = readDistributionRegistry(repoRoot);
  if (registry === null) throw new TypeError('benchmark distribution registry must parse');
  return buildBenchmarkSubjectFacts(registry.distributions, (path) => {
    const absolute = resolve(repoRoot, path);
    return existsSync(absolute) ? readFileSync(absolute, 'utf8') : undefined;
  });
}

const plantedCommand: CapsuleCommandDescriptor = {
  name: 'planted.performance-command',
  summary: 'Planted catalog growth control.',
  inputSchema: { type: 'object', properties: {} },
};

describe('command benchmark eligibility relation', () => {
  it('covers the live command catalog with executed parser-qualified SUT subjects', () => {
    expect(
      commandBenchmarkEligibilityIssues(
        COMMAND_CATALOG,
        COMMAND_BENCHMARK_ELIGIBILITY,
        benchmarkFacts(),
        benchScriptTargets(repoRoot),
      ),
    ).toEqual([]);
  });

  it('fails when a command is added without an explicit eligibility row', () => {
    const issues = commandBenchmarkEligibilityIssues(
      [...COMMAND_CATALOG, plantedCommand],
      COMMAND_BENCHMARK_ELIGIBILITY,
      benchmarkFacts(),
      benchScriptTargets(repoRoot),
    );
    expect(issues).toContainEqual(
      expect.objectContaining({ kind: 'missing-classification', command: plantedCommand.name }),
    );
  });

  it('fails an orphan eligibility row that names no catalog command', () => {
    const orphan = { command: 'orphan.command', classification: 'not-performance' } as const;
    const issues = commandBenchmarkEligibilityIssues(
      COMMAND_CATALOG,
      [...COMMAND_BENCHMARK_ELIGIBILITY, orphan],
      benchmarkFacts(),
      benchScriptTargets(repoRoot),
    );
    expect(issues).toContainEqual(expect.objectContaining({ kind: 'orphan-classification', command: orphan.command }));
  });

  it('fails duplicate eligibility rows instead of choosing one by order', () => {
    const check = COMMAND_BENCHMARK_ELIGIBILITY.find((row) => row.command === 'check')!;
    const issues = commandBenchmarkEligibilityIssues(
      COMMAND_CATALOG,
      [...COMMAND_BENCHMARK_ELIGIBILITY, check],
      benchmarkFacts(),
      benchScriptTargets(repoRoot),
    );
    expect(issues).toContainEqual(expect.objectContaining({ kind: 'duplicate-classification', command: 'check' }));
  });

  it('fails when a performance-bearing command loses its exact admitted subject evidence', () => {
    const facts = benchmarkFacts();
    const missing = {
      ...facts,
      distributions: facts.distributions.filter((fact) => fact.name !== 'command planChecks -- release profile'),
    };
    const issues = commandBenchmarkEligibilityIssues(
      COMMAND_CATALOG,
      COMMAND_BENCHMARK_ELIGIBILITY,
      missing,
      benchScriptTargets(repoRoot),
    );
    expect(issues).toContainEqual(expect.objectContaining({ kind: 'missing-evidence', command: 'check' }));
  });

  it('fails when admitted subject evidence is not routed through an executed benchmark lane', () => {
    const issues = commandBenchmarkEligibilityIssues(
      COMMAND_CATALOG,
      COMMAND_BENCHMARK_ELIGIBILITY,
      benchmarkFacts(),
      benchScriptTargets(repoRoot).filter((path) => path !== 'tests/bench/command.bench.ts'),
    );
    expect(issues.filter((issue) => issue.kind === 'unexecuted-evidence' && issue.command === 'check')).toHaveLength(3);
  });

  it('fails an empty performance declaration without treating it as not applicable', () => {
    const empty: CommandBenchmarkEligibility[] = COMMAND_BENCHMARK_ELIGIBILITY.map((row) =>
      row.command === 'check' ? { command: 'check', classification: 'performance-bearing', evidence: [] } : row,
    );
    const issues = commandBenchmarkEligibilityIssues(
      COMMAND_CATALOG,
      empty,
      benchmarkFacts(),
      benchScriptTargets(repoRoot),
    );
    expect(issues).toContainEqual(expect.objectContaining({ kind: 'missing-evidence', command: 'check' }));
  });
});
