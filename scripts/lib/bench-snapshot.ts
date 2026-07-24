/**
 * Renders the README "Latest CI gauntlet run" block from the committed
 * `benchmarks/readme-snapshot.json` (distilled from a green CI run by
 * `scripts/refresh-bench-snapshot.ts`). The numbers live in the JSON; this file
 * owns only their prose shape. Consumed by `scripts/gen-docs.ts` and pinned by
 * the doc-registry drift test.
 *
 * @module
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SNAPSHOT_PATH = resolve(import.meta.dirname, '..', '..', 'benchmarks', 'readme-snapshot.json');

interface Snapshot {
  source: { runId: string | null; commit: string | null; capturedAt: string; env: string };
  gauntlet: { status: string; durationFormatted: string };
  benchGate: { hardGateCount: number; failedHardGateCount: number; replicateCount: number };
  hardGatedPairs: { label: string; medianDirectiveNs: number; medianBaselineNs: number; medianOverheadPct: number; thresholdPct: number }[];
  diagnosticWatch: { label: string; directiveP99Ns: number; absoluteP99BudgetNs: number; pctOfBudget: number; p99ToBaselineRatio: number };
}

/** README-friendly display name for each hard-gated bench pair. */
const PAIR_DISPLAY: Record<string, string> = {
  adaptive: '`adaptive` hot path',
  stream: '`stream` parse + patch',
  llm: '`llm` text chunk parse',
  worker: '`worker` fallback eval',
  'llm-startup-shared': '`llm-startup-shared`',
  'llm-promoted-startup-shared': '`llm-promoted-startup-shared`',
  'worker-runtime-startup-shared': '`worker-runtime-startup-shared`',
};

const ns = (n: number): string => `${n.toLocaleString('en-US')}ns`;
const pct = (n: number): string => `${n.toFixed(2)}%`;

/** Render the README bench/timing block from the committed snapshot. */
export function renderBenchBlock(): string {
  const s = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8')) as Snapshot;
  const date = s.source.capturedAt.slice(0, 10);
  const prov = s.source.runId
    ? `[CI run ${s.source.runId}](https://github.com/freebatteryfactory/LiteShip/actions/runs/${s.source.runId})`
    : 'a CI run';
  const commit = s.source.commit ? ` (commit \`${s.source.commit.slice(0, 7)}\`)` : '';

  const head = [
    `Pulled from the \`truth-artifacts-linux\` artifact of ${prov}${commit} on ${date} (${s.source.env}). Refresh with \`pnpm exec tsx scripts/refresh-bench-snapshot.ts\` against a newer artifact, then \`pnpm run docs:gen\`.`,
    '',
    `- \`pnpm run gauntlet:full\` ${s.gauntlet.status} end-to-end in ${s.gauntlet.durationFormatted} under CI conditions.`,
    `- \`bench:gate\` passed: ${s.benchGate.hardGateCount} hard gates, ${s.benchGate.failedHardGateCount} failed, ${s.benchGate.replicateCount} replicates.`,
    '- `package:smoke` passed for every publishable `@liteship/*` scope.',
    '',
    '| Hard-gated pair | Median directive | Median baseline | Median overhead | Threshold |',
    '| --- | ---: | ---: | ---: | ---: |',
  ];
  const rows = s.hardGatedPairs.map(
    (p) =>
      `| ${PAIR_DISPLAY[p.label] ?? `\`${p.label}\``} | ${ns(p.medianDirectiveNs)} | ${ns(p.medianBaselineNs)} | ${pct(p.medianOverheadPct)} | ${p.thresholdPct}% |`,
  );
  const w = s.diagnosticWatch;
  const tail = [
    '',
    `Diagnostic watch, not a release gate: \`${w.label}\` runs above its relative baseline (p99 ratio ${w.p99ToBaselineRatio.toFixed(2)}x), but the absolute directive p99 is ${ns(w.directiveP99Ns)} against a ${ns(w.absoluteP99BudgetNs)} steady-state budget — ~${w.pctOfBudget.toFixed(1)}% of budget, headroom not panic. The live ledger is the \`truth-artifacts-linux\` CI artifact (\`benchmarks/directive-gate.json\`, \`gauntlet-phase-timings.json\`); see [STATUS.md](./STATUS.md) for the operator view.`,
  ];
  return [...head, ...rows, ...tail].join('\n');
}
