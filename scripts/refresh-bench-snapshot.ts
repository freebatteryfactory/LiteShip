#!/usr/bin/env tsx
/**
 * Distills the verbose gauntlet bench artifacts into the small, committed
 * `benchmarks/readme-snapshot.json` that the README "Latest CI gauntlet run"
 * block renders from. Keeps fresh numbers on the GitHub front page WITHOUT
 * committing the multi-hundred-KB raw artifacts or hand-editing prose.
 *
 * Refresh flow (numbers can only come from a full gauntlet, which runs in CI):
 *   1. Download the `truth-artifacts-linux` artifact from a green `main` CI run
 *      (`gh run download <id> -n truth-artifacts-linux -D <dir>`).
 *   2. `pnpm exec tsx scripts/refresh-bench-snapshot.ts --from <dir>/benchmarks \
 *        --run-id <id> --commit <sha>`
 *   3. `pnpm run docs:gen` to re-render the README block, then commit both.
 *
 * @module
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i < 0) return undefined;
  const value = process.argv[i + 1];
  if (value === undefined || value.startsWith('--')) {
    throw new Error(`${flag} requires a value (got ${value === undefined ? 'nothing' : `the next flag "${value}"`})`);
  }
  return value;
}

const fromDir = arg('--from') ?? 'benchmarks';
const runId = arg('--run-id') ?? null;
const commit = arg('--commit') ?? null;

const gate = JSON.parse(readFileSync(resolve(fromDir, 'directive-gate.json'), 'utf8')) as {
  replicateCount: number;
  summary: { hardGateCount: number; failedHardGates: unknown[] };
  pairs: {
    label: string;
    gate: boolean;
    threshold: number;
    medianDirectiveNs: number;
    medianBaselineNs: number;
    medianOverhead: number;
  }[];
  llmRuntimeSteadySignals: { directiveP99Ns: number; absoluteP99BudgetNs: number; directiveP99ToBaselineP99: number };
};
const timings = JSON.parse(readFileSync(resolve(fromDir, 'gauntlet-phase-timings.json'), 'utf8')) as {
  status: string;
  totalDurationFormatted: string;
  timestamp: string;
  environment: { platform: string; arch: string; nodeVersion: string };
};

const env = timings.environment;
const steady = gate.llmRuntimeSteadySignals;
const snapshot = {
  _tag: 'ReadmeBenchSnapshot',
  _version: 1,
  source: {
    kind: 'ci-truth-linux',
    runId,
    commit,
    capturedAt: timings.timestamp,
    env: `${env.platform} ${env.arch}, Node ${env.nodeVersion.replace(/^v/, '').split('.')[0]}`,
  },
  gauntlet: { status: timings.status, durationFormatted: timings.totalDurationFormatted },
  benchGate: {
    hardGateCount: gate.summary.hardGateCount,
    failedHardGateCount: gate.summary.failedHardGates.length,
    replicateCount: gate.replicateCount,
  },
  hardGatedPairs: gate.pairs
    .filter((p) => p.gate)
    .map((p) => ({
      label: p.label,
      medianDirectiveNs: Math.round(p.medianDirectiveNs),
      medianBaselineNs: Math.round(p.medianBaselineNs),
      medianOverheadPct: +(p.medianOverhead * 100).toFixed(2),
      thresholdPct: +(p.threshold * 100).toFixed(0),
    })),
  diagnosticWatch: {
    label: 'llm-runtime-steady',
    directiveP99Ns: Math.round(steady.directiveP99Ns),
    absoluteP99BudgetNs: steady.absoluteP99BudgetNs,
    pctOfBudget: +((steady.directiveP99Ns / steady.absoluteP99BudgetNs) * 100).toFixed(2),
    p99ToBaselineRatio: +steady.directiveP99ToBaselineP99.toFixed(2),
  },
};

const out = resolve(import.meta.dirname, '..', 'benchmarks', 'readme-snapshot.json');
writeFileSync(out, JSON.stringify(snapshot, null, 2) + '\n');
console.log(`refresh-bench-snapshot — wrote ${out} (gauntlet ${snapshot.gauntlet.status} in ${snapshot.gauntlet.durationFormatted}, ${snapshot.hardGatedPairs.length} hard gates)`);
