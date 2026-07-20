import { describe, expect, test } from 'vitest';
import {
  DEFAULT_GATE_REPLICATES,
  DIRECTIVE_BENCH_PAIRS,
  DIRECTIVE_BENCH_TASKS,
  HARD_GATE_OVERHEAD_THRESHOLD,
  WORKER_STARTUP_BREAKDOWN_STAGES,
  applyInterleavedGateOverrides,
  buildDirectiveBenchConfig,
  collectBenchResults,
  measurePairedOverhead,
  evaluateBenchPairsAcrossReplicates,
  formatDiagnosticWatchReport,
  formatPairReport,
  formatWorkerStartupSeamReport,
  measureWorkerStartupBreakdown,
  summarizeLLMRuntimeSteadySignals,
  summarizeWorkerStartupSplit,
  type BenchPair,
  type BenchResult,
  type PairEvaluation,
  type ReplicateResult,
} from '../../../scripts/bench/directive-suite.ts';
import { LLM_STEADY_REPLICATE_EXCEEDANCE_MAX } from '../../../scripts/bench/flex-policy.ts';
import { scaledTimeout } from '../../../vitest.shared.js';

function makeBenchResult(name: string, meanNs: number): BenchResult {
  return {
    name,
    opsPerSec: meanNs === 0 ? 0 : 1_000_000_000 / meanNs,
    meanNs,
    p75Ns: meanNs,
    p99Ns: meanNs,
    latencyTier: 'moderate',
  };
}

function makePairEvaluation(pair: BenchPair, overhead: number | null): PairEvaluation {
  if (overhead === null) {
    return {
      ...pair,
      directiveResult: undefined,
      baselineResult: undefined,
      overhead: null,
      missing: true,
      pass: false,
    };
  }

  const baselineResult = makeBenchResult(pair.baseline, 100);
  const directiveResult = makeBenchResult(pair.directive, 100 * (1 + overhead));

  return {
    ...pair,
    directiveResult,
    baselineResult,
    overhead,
    missing: false,
    pass: overhead <= pair.threshold,
  };
}

function makeReplicates(pair: BenchPair, overheads: readonly (number | null)[]): ReplicateResult[] {
  return overheads.map((overhead, replicate) => ({
    replicate,
    results:
      overhead === null
        ? []
        : [makeBenchResult(pair.directive, 100 * (1 + overhead)), makeBenchResult(pair.baseline, 100)],
    pairs: [makePairEvaluation(pair, overhead)],
    startupBreakdown: [],
    workerStartupAudit: {
      posture: 'accept-honest-residual',
      conclusion: 'fixture',
      dominantStage: 'state-delivery:message-receipt',
      rows: [],
    },
    workerStartupSplit: {
      visibleFirstPaintMeanNs: 1000,
      workerTakeoverMeanNs: 2000,
      shared: {
        label: 'worker-runtime-startup-shared',
        supportMeanNs: 6000,
        parityMeanNs: 5000,
        residualMeanNs: 1000,
        overheadPct: 20,
        thresholdPct: 25,
        conclusion: 'fixture',
      },
      seam: {
        label: 'worker-runtime-startup-seam',
        absoluteMeanNs: 2500,
        derivedPct: 10,
        dominantStage: 'state-delivery:message-receipt',
        messageReceiptResidualNs: 1500,
        dispatchSendResidualNs: 500,
        messageReceiptSharePct: 60,
        dispatchSendSharePct: 20,
        sharedResidualSharePct: 20,
        toBrowserStartupMedianPct: null,
        tailRatioP99ToMedian: 1.4,
        conclusion: 'fixture',
        components: [
          {
            stage: 'state-delivery:message-receipt',
            label: 'worker message receipt latency',
            kind: 'worker-only',
            residualMeanNs: 1500,
          },
        ],
      },
    },
    canaryContext: {
      tasks: [],
      ambientSpreadMeanNs: null,
      ambientSpreadPct: null,
    },
  }));
}

describe('directive benchmark suite', () => {
  test('declares the expected benchmark tasks and pairs', () => {
    const taskNames = DIRECTIVE_BENCH_TASKS.map((task) => task.name);

    expect(taskNames).toContain('[DIRECTIVE] adaptive -- evaluate + state string (hot path)');
    expect(taskNames).toContain('[MANUAL] stream -- direct JSON.parse');
    expect(taskNames).toContain('[DIRECTIVE] llm -- parse tool delta');
    expect(taskNames).toContain('[DIRECTIVE] worker -- shared evaluate + composite build');
    expect(taskNames).toContain('[MANUAL] worker -- Boundary.evaluateWithHysteresis + composite build');
    expect(taskNames).toContain('[DIAGNOSTIC] worker -- state envelope structured clone');
    expect(taskNames).toContain('[BASELINE] worker -- state payload structured clone');
    expect(taskNames).toContain('[GATE] llm-startup-shared -- first token boundary');
    expect(taskNames).toContain('[BASELINE] llm-startup-shared -- node first token boundary');
    expect(taskNames).toContain('[GATE] llm-promoted-startup-shared -- second token boundary');
    expect(taskNames).toContain('[BASELINE] llm-promoted-startup-shared -- node second token boundary');
    expect(taskNames).toContain('[DIAGNOSTIC] llm-runtime-steady -- live session frame scheduling');
    expect(taskNames).toContain('[BASELINE] llm-runtime-steady -- parse and accumulate text');
    expect(taskNames).toContain('[DIAGNOSTIC] edge-request -- shared adapter resolve');
    expect(taskNames).toContain('[BASELINE] edge-request -- direct hints + tier + theme');
    expect(taskNames).toContain('[DIAGNOSTIC] worker-runtime-startup -- host bootstrap + first compute');
    expect(taskNames).toContain('[BASELINE] worker-runtime-startup -- in-process parity bootstrap');
    expect(taskNames).toContain('[DIAGNOSTIC] worker-runtime-steady -- live runtime coordinator update');
    expect(taskNames).toContain('[BASELINE] worker-runtime-steady -- shared evaluate only');
    expect(taskNames).toContain('[CANARY] bench -- integer accumulator');
    expect(taskNames).toContain('[CANARY] bench -- stable JSON encode');
    expect(DEFAULT_GATE_REPLICATES).toBe(5);

    for (const pair of DIRECTIVE_BENCH_PAIRS) {
      if (pair.label === 'worker-runtime-startup-shared') {
        continue;
      }
      expect(taskNames).toContain(pair.directive);
      expect(taskNames).toContain(pair.baseline);
    }

    expect(DIRECTIVE_BENCH_PAIRS.some((pair) => pair.label === 'worker-runtime-startup-shared')).toBe(true);
  });

  test('publishes stable bench config metadata for artifact provenance', () => {
    expect(buildDirectiveBenchConfig()).toEqual({
      warmupIterations: 200,
      iterations: 1000,
      replicateCount: 5,
      hotLoopRepeat: 250,
      startupBreakdownIterations: 40,
      canaryTaskNames: ['[CANARY] bench -- integer accumulator', '[CANARY] bench -- stable JSON encode'],
    });
  });

  test('collects latency and throughput summaries from tinybench tasks', () => {
    const results = collectBenchResults({
      tasks: [
        {
          name: '[DIRECTIVE] adaptive -- evaluate + state string (hot path)',
          result: {
            latency: { mean: 0.0002, p75: 0.0003, p99: 0.0004 },
            throughput: { mean: 2_000_000 },
          },
        },
      ],
    } as never);

    expect(results).toEqual([
      {
        name: '[DIRECTIVE] adaptive -- evaluate + state string (hot path)',
        opsPerSec: 2_000_000,
        meanNs: 200,
        p75Ns: 300,
        p99Ns: 400,
        latencyTier: 'moderate',
      },
    ]);
  });

  test('flags stable hard-gate regressions and leaves diagnostic-only pairs non-blocking', () => {
    const adaptivePair = DIRECTIVE_BENCH_PAIRS.find((pair) => pair.label === 'adaptive')!;
    const workerPair = DIRECTIVE_BENCH_PAIRS.find((pair) => pair.label === 'worker')!;
    const workerEnvelopePair = DIRECTIVE_BENCH_PAIRS.find((pair) => pair.label === 'worker-envelope')!;
    const [adaptive] = evaluateBenchPairsAcrossReplicates(
      makeReplicates(adaptivePair, [0.18, 0.19, 0.17, 0.2, 0.12]),
      [adaptivePair],
    );
    const [worker] = evaluateBenchPairsAcrossReplicates(makeReplicates(workerPair, [0.3, 0.28, 0.27, 0.31, 0.29]), [
      workerPair,
    ]);
    const [workerEnvelope] = evaluateBenchPairsAcrossReplicates(
      makeReplicates(workerEnvelopePair, [0.3, 0.28, 0.27, 0.31, 0.29]),
      [workerEnvelopePair],
    );

    expect(adaptive.threshold).toBe(HARD_GATE_OVERHEAD_THRESHOLD);
    expect(adaptive.pass).toBe(false);
    expect(adaptive.gate).toBe(true);
    expect(adaptive.exceedances).toBe(4);
    expect(worker.threshold).toBe(HARD_GATE_OVERHEAD_THRESHOLD);
    expect(worker.pass).toBe(false);
    expect(worker.gate).toBe(true);
    expect(worker.warning).toBe(false);
    expect(workerEnvelope.pass).toBe(true);
    expect(workerEnvelope.gate).toBe(false);
    expect(workerEnvelope.warning).toBe(true);
    expect(workerEnvelope.watch).toBe(true);
  });

  test('does not fail a hard gate on a noisy minority of regressions', () => {
    const adaptivePair = DIRECTIVE_BENCH_PAIRS.find((pair) => pair.label === 'adaptive')!;
    const [adaptive] = evaluateBenchPairsAcrossReplicates(makeReplicates(adaptivePair, [0.2, 0.2, 0.2, 0.05, 0.05]), [
      adaptivePair,
    ]);

    expect(adaptive.medianOverhead).toBe(0.2);
    expect(adaptive.exceedances).toBe(3);
    expect(adaptive.requiredExceedances).toBe(4);
    expect(adaptive.pass).toBe(true);
  });

  test('fails closed when a required pair is missing in any replicate', () => {
    const streamPair = DIRECTIVE_BENCH_PAIRS.find((pair) => pair.label === 'stream')!;
    const [stream] = evaluateBenchPairsAcrossReplicates(makeReplicates(streamPair, [0.01, 0.02, null, 0.03, 0.01]), [
      streamPair,
    ]);

    expect(stream.missing).toBe(true);
    expect(stream.missingReplicates).toBe(1);
    expect(stream.pass).toBe(false);
  });

  test('keeps broader runtime diagnostics non-blocking', () => {
    const llmRuntimePair = DIRECTIVE_BENCH_PAIRS.find((pair) => pair.label === 'llm-runtime-steady')!;
    const edgeRequestPair = DIRECTIVE_BENCH_PAIRS.find((pair) => pair.label === 'edge-request')!;
    const workerRuntimeStartupPair = DIRECTIVE_BENCH_PAIRS.find((pair) => pair.label === 'worker-runtime-startup')!;

    expect(llmRuntimePair.gate).toBe(false);
    expect(edgeRequestPair.gate).toBe(false);
    expect(llmRuntimePair.runtimeClass).toBe('steady-state');
    expect(edgeRequestPair.runtimeClass).toBe('steady-state');
    expect(workerRuntimeStartupPair.rationale).toContain('in-process parity bootstrap');

    const [llmRuntime] = evaluateBenchPairsAcrossReplicates(
      makeReplicates(llmRuntimePair, [0.4, 0.35, 0.3, 0.33, 0.31]),
      [llmRuntimePair],
    );
    const [edgeRequest] = evaluateBenchPairsAcrossReplicates(
      makeReplicates(edgeRequestPair, [0.2, 0.25, 0.19, 0.24, 0.18]),
      [edgeRequestPair],
    );

    expect(llmRuntime.pass).toBe(true);
    expect(llmRuntime.warning).toBe(true);
    expect(llmRuntime.watch).toBe(true);
    expect(edgeRequest.pass).toBe(true);
    expect(edgeRequest.warning).toBe(false);
    expect(edgeRequest.watch).toBe(true);
  });

  test('formats diagnostic watch output without changing gate semantics', () => {
    const workerEnvelopePair = DIRECTIVE_BENCH_PAIRS.find((pair) => pair.label === 'worker-envelope')!;
    const edgeRequestPair = DIRECTIVE_BENCH_PAIRS.find((pair) => pair.label === 'edge-request')!;
    const [workerEnvelope] = evaluateBenchPairsAcrossReplicates(
      makeReplicates(workerEnvelopePair, [0.24, 0.26, 0.25, 0.27, 0.23]),
      [workerEnvelopePair],
    );
    const [edgeRequest] = evaluateBenchPairsAcrossReplicates(
      makeReplicates(edgeRequestPair, [0.2, 0.25, 0.19, 0.24, 0.18]),
      [edgeRequestPair],
    );

    const lines = formatDiagnosticWatchReport([workerEnvelope, edgeRequest]);

    expect(workerEnvelope.pass).toBe(true);
    expect(workerEnvelope.watch).toBe(true);
    expect(edgeRequest.pass).toBe(true);
    expect(edgeRequest.watch).toBe(true);
    expect(lines).toEqual(
      expect.arrayContaining([expect.stringContaining('worker-envelope'), expect.stringContaining('edge-request')]),
    );
  });

  test('adds a margin note for hard-gated pairs that are close to threshold', () => {
    const adaptivePair = DIRECTIVE_BENCH_PAIRS.find((pair) => pair.label === 'adaptive')!;
    const [adaptive] = evaluateBenchPairsAcrossReplicates(
      makeReplicates(adaptivePair, [0.129, 0.131, 0.13, 0.128, 0.127]),
      [adaptivePair],
    );

    const lines = formatPairReport(adaptive);

    expect(lines).toEqual(expect.arrayContaining([expect.stringContaining('margin to threshold')]));
  });

  test('formats worker startup seam context for operator-facing output', () => {
    const lines = formatWorkerStartupSeamReport(
      makeReplicates(DIRECTIVE_BENCH_PAIRS[0]!, [0.1])[0]!.workerStartupSplit,
    );

    expect(lines).toEqual([
      '        dominant seam: state-delivery:message-receipt',
      '        worker-only share: 80.0%',
      '        shared residual share: 20.0%',
    ]);
  });

  test('emits stable worker startup breakdown stages without replacing the continuity metric', async () => {
    const workerRuntimeStartupPair = DIRECTIVE_BENCH_PAIRS.find((pair) => pair.label === 'worker-runtime-startup')!;
    const breakdown = await measureWorkerStartupBreakdown(2);

    expect(workerRuntimeStartupPair.directive).toBe(
      '[DIAGNOSTIC] worker-runtime-startup -- host bootstrap + first compute',
    );
    expect(workerRuntimeStartupPair.baseline).toBe('[BASELINE] worker-runtime-startup -- in-process parity bootstrap');
    expect(breakdown.map((entry) => ({ stage: entry.stage, label: entry.label }))).toEqual(
      WORKER_STARTUP_BREAKDOWN_STAGES,
    );
    expect(breakdown.every((entry) => entry.modeled)).toBe(true);
    expect(
      breakdown.every(
        (entry) =>
          Number.isFinite(entry.meanNs) &&
          Number.isFinite(entry.p75Ns) &&
          Number.isFinite(entry.p95Ns) &&
          Number.isFinite(entry.p99Ns),
      ),
    ).toBe(true);
  });

  test('summarizes worker seam shares and llm steady early-warning signals', () => {
    const llmRuntimePair = DIRECTIVE_BENCH_PAIRS.find((pair) => pair.label === 'llm-runtime-steady')!;
    const replicates = makeReplicates(llmRuntimePair, [0.1, 0.12, 0.08, 0.09, 0.11]).map((replicate, index) => ({
      ...replicate,
      results: [
        makeBenchResult('[DIAGNOSTIC] llm-runtime-steady -- live session frame scheduling', 110 + index),
        makeBenchResult('[BASELINE] llm-runtime-steady -- parse and accumulate text', 100),
      ],
    }));

    const workerSplit = summarizeWorkerStartupSplit(replicates);
    const llmSignals = summarizeLLMRuntimeSteadySignals(replicates);

    expect(workerSplit.seam.messageReceiptSharePct).toBe(60);
    expect(workerSplit.seam.dispatchSendSharePct).toBe(20);
    expect(workerSplit.seam.tailRatioP99ToMedian).toBe(1.4);
    expect(llmSignals.label).toBe('llm-runtime-steady');
    expect(llmSignals.replicateExceedanceRate).toBe(0);
    expect(llmSignals.directiveP99ToBaselineP99).toBeGreaterThan(1);
    expect(llmSignals.directiveP75ToBaselineP75).toBeGreaterThan(1);
  });

  test('flex LLM steady exceedance policy matches directive-suite (> max elevated, <= max ok)', () => {
    const steadyPair = DIRECTIVE_BENCH_PAIRS.find((pair) => pair.label === 'llm-runtime-steady')!;
    const atCeiling = summarizeLLMRuntimeSteadySignals(makeReplicates(steadyPair, [0.26, 0.1, 0.1, 0.1, 0.1]));
    expect(atCeiling.replicateExceedanceRate).toBe(0.2);
    expect(atCeiling.replicateExceedanceRate <= LLM_STEADY_REPLICATE_EXCEEDANCE_MAX).toBe(true);
    expect(atCeiling.conclusion.includes('threshold flirtation')).toBe(false);

    const elevated = summarizeLLMRuntimeSteadySignals(makeReplicates(steadyPair, [0.26, 0.26, 0.1, 0.1, 0.1]));
    expect(elevated.replicateExceedanceRate).toBe(0.4);
    expect(elevated.replicateExceedanceRate > LLM_STEADY_REPLICATE_EXCEEDANCE_MAX).toBe(true);
    expect(elevated.conclusion.includes('threshold flirtation')).toBe(true);
  });
});

describe('interleaved paired measurement — window-invariant hot-path ratio (CI flake cure)', () => {
  // The hot-path ratio pairs flaked on contended CI runners because the directive and baseline were
  // timed in SEPARATE windows. measurePairedOverhead times them ADJACENTLY per sample (alternating
  // order). These pin the two halves of the contract: it does NOT invent overhead on identical work,
  // and — the load-bearing one — it STILL reports a real regression (it is not blind).
  let sink = 0;
  const work = (units: number) => () => {
    for (let i = 0; i < units; i++) sink += Math.sqrt(i + 1);
  };

  test('identical work measures ~0 overhead — no false positive (stays under the hard-gate threshold)', () => {
    const fn = work(400);
    const { overhead } = measurePairedOverhead(fn, fn);
    expect(Math.abs(overhead)).toBeLessThan(HARD_GATE_OVERHEAD_THRESHOLD);
  });

  test('a genuinely slower directive STILL exceeds the threshold — the method is not blind', () => {
    // 3x the work: a real abstraction-tax regression must surface as a real ratio, paired method or not.
    const { overhead } = measurePairedOverhead(work(1200), work(400));
    expect(overhead).toBeGreaterThan(HARD_GATE_OVERHEAD_THRESHOLD);
    expect(sink).toBeGreaterThan(0); // guard against dead-code elimination of the measured work
  });

  test(
    'applyInterleavedGateOverrides re-measures an interleaved pair, leaves a non-interleaved one untouched',
    () => {
      // Use ONE light interleaved pair (adaptive) + one non-interleaved pair — measuring all four real
      // pairs (stream runs 5000 inner iters/call) would blow the test timeout for no extra coverage.
      const adaptive = DIRECTIVE_BENCH_PAIRS.find((pair) => pair.label === 'adaptive')!;
      const nonInterleaved = DIRECTIVE_BENCH_PAIRS.find(
        (pair) => !['adaptive', 'stream', 'llm', 'worker'].includes(pair.label),
      )!;
      const sentinelOverhead = Number.POSITIVE_INFINITY;
      const inputs = [
        makePairEvaluation(adaptive, sentinelOverhead),
        makePairEvaluation(nonInterleaved, sentinelOverhead),
      ];
      const [adaptiveOut, otherOut] = applyInterleavedGateOverrides(inputs);
      // The interleaved pair is re-measured live (sentinel replaced by a real, finite paired ratio).
      expect(adaptiveOut!.overhead).not.toBe(sentinelOverhead);
      expect(Number.isFinite(adaptiveOut!.overhead)).toBe(true);
      // The non-interleaved pair is returned untouched — same reference, sentinel intact.
      expect(otherOut).toBe(inputs[1]);
      expect(otherOut!.overhead).toBe(sentinelOverhead);
    },
    scaledTimeout(15000),
  );

  test('a MISSING interleaved pair stays missing — fail-closed, never re-measured into a false pass', () => {
    const adaptive = DIRECTIVE_BENCH_PAIRS.find((pair) => pair.label === 'adaptive')!;
    const missingPair = makePairEvaluation(adaptive, null); // directiveResult/baselineResult undefined, missing: true
    const [out] = applyInterleavedGateOverrides([missingPair]);
    expect(out!.missing).toBe(true); // NOT flipped to false
    expect(out).toBe(missingPair); // returned untouched — no deref of the absent results
  });
});
