/**
 * Allocation bench — the per-op LIVE-allocation measurement for the two
 * "zero-allocation hot path" claims (`@czap/core` compositor compose +
 * token-buffer push/drainInto). Unlike a throughput bench (ops/sec via tinybench),
 * this measures HEAP behaviour: the bytes that SURVIVE a forced `global.gc()` per
 * op. It MUST run under `node --expose-gc`.
 *
 * The measurement lives in `scripts/alloc-gate.ts` (the single source of truth the
 * gate-tests also assert against); this bench is the human-facing runner that
 * prints the report. Its input distribution is DECLARED in
 * `benchmarks/distributions.json` (the perf-contract law: a measured number is
 * uncomparable without its declared size + shape) — every `bench.add(name)` below
 * has a matching declaration the performance-contracts gate cross-checks.
 *
 * Run: `node --expose-gc --import tsx tests/bench/allocation.bench.ts`
 *      (or `pnpm run bench:alloc`).
 */

import { runAllocGate, ALLOC_BATCHES, ALLOC_OPS_PER_BATCH } from '../../scripts/alloc-gate.js';

/** The label each `bench.add` registers, matched to a measured AllocResult by substring. */
interface RegisteredAllocBench {
  readonly name: string;
  readonly match: string;
}

const registered: RegisteredAllocBench[] = [];
/** Minimal registrar — records the governed bench name (the perf-contracts gate
 *  scans these `bench.add('...')` sites and requires each a declared distribution). */
const bench = {
  add(name: string, match: string): void {
    registered.push({ name, match });
  },
};

bench.add('alloc -- compositor compute (selective recompute)', 'compositor');
bench.add('alloc -- token-buffer push+drainInto', 'token-buffer');

function main(): void {
  process.stdout.write(
    `Allocation bench — ${ALLOC_BATCHES} batches × ${ALLOC_OPS_PER_BATCH} ops, forced GC between batches.\n`,
  );
  const results = runAllocGate();
  for (const reg of registered) {
    const r = results.find((res) => res.label.includes(reg.match));
    if (r === undefined) {
      process.stdout.write(`  ${reg.name}: (no measured result)\n`);
      continue;
    }
    process.stdout.write(
      `  ${reg.name}: ${r.liveBytesPerOp.toFixed(4)} live bytes/op ` +
        `(budget ${r.budgetBytesPerOp}) ⇒ ${r.withinBudget ? 'PASS' : 'FAIL'}\n`,
    );
  }
}

main();
