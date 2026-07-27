/**
 * Cross-host recovery campaigns over the existing deterministic simulation
 * substrate. These scenarios exercise public host seams rather than fixture
 * copies: MCP JSON-RPC dispatch, Astro middleware, Stage motion export, and
 * Remotion frame lookup.
 *
 * Each campaign has an explicit steady state, activated fault, degraded state,
 * and recovery observation. The property layer then varies the same admitted
 * inputs to prove that recovery is a law rather than one lucky example.
 */

import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { StateName } from '@liteship/core/schema';
import type { CompositeState, VideoFrameOutput } from '@liteship/core';
import {
  assertReplayDeterministic,
  consultFault,
  type SimScenario,
  type SimStep,
  type SimWorld,
} from '@liteship/core/simulation';
import type { RuntimeWritePlan } from '@liteship/core/motion';
import { liteshipMiddleware, type LiteshipLocals } from '@liteship/astro';
import {
  JsonRpcServer,
  dispatch,
  listTools,
  type JsonRpcErrorResponse,
  type JsonRpcResponse,
  type JsonRpcSuccess,
} from '@liteship/mcp-server';
import { exportMotionTrack, sampleMotionFrames } from '@liteship/stage';
import { cssVarsFromState, stateAtFrame } from '@liteship/remotion';
import { simulationDeterminismGate, type GateContext, type ScenarioReplayFact } from '@liteship/gauntlet';
import {
  campaignObservation,
  runSimulationCorpus,
  type RecoveryCorpusEntry,
} from '../../packages/cli/src/internal/simulation-corpus.js';

const MCP_MALFORMED_INITIALIZE = 'mcp.malformed-initialize';
const ASTRO_DOWNSTREAM_FAILURE = 'astro.downstream-handler-failure';
const STAGE_INVALID_FRAME_COUNT = 'stage.invalid-frame-count';
const REMOTION_FRAME_OVERFLOW = 'remotion.frame-overflow';

function motionPlan(from = 0, to = 1): RuntimeWritePlan {
  return {
    properties: [{ cssVar: '--host-proof-x', from: { k: 'number', v: from }, to: { k: 'number', v: to } }],
    durationMs: 1_000,
    routing: 'seq',
    fromState: StateName('before'),
    toState: StateName('after'),
    easing: { kind: 'linear' },
  };
}

function isSuccess(response: JsonRpcResponse | null): response is JsonRpcSuccess {
  return response !== null && 'result' in response;
}

function isError(response: JsonRpcResponse | null): response is JsonRpcErrorResponse {
  return response !== null && 'error' in response;
}

function frameOutputs(plan: RuntimeWritePlan, totalFrames: number): readonly VideoFrameOutput[] {
  return sampleMotionFrames(plan, totalFrames).map((sample) => ({
    frame: sample.frame,
    timestamp: sample.t * plan.durationMs,
    progress: sample.t,
    state: {
      discrete: { frame: String(sample.frame) },
      blend: {},
      outputs: { css: sample.css, glsl: {}, wgsl: {}, aria: {} },
    },
  }));
}

function simulationContext(runs: readonly ScenarioReplayFact[]): GateContext {
  return {
    repoRoot: '/host-protocol-recovery',
    readFile: (): undefined => undefined,
    files: (): readonly string[] => [],
    simulation: { runs },
  };
}

const mcpProtocolRecoveryScenario: SimScenario = {
  id: 'mcp-malformed-request-recovery',
  steps: (world: SimWorld): readonly SimStep[] => {
    let faultActivated = false;
    let malformedRefused = false;
    let recovered = false;

    return [
      {
        label: 'mcp.steady',
        act: async (): Promise<unknown> => {
          const parsed = JsonRpcServer.parse(
            JSON.stringify({
              jsonrpc: '2.0',
              id: 'initialize-steady',
              method: 'initialize',
              params: { protocolVersion: '2025-03-26' },
            }),
          );
          if (parsed.kind !== 'request') return campaignObservation('steady-state', false);
          const response = await dispatch(parsed.message);
          return campaignObservation('steady-state', isSuccess(response) && response.id === 'initialize-steady');
        },
      },
      {
        label: 'mcp.activate-malformed-initialize',
        act: (schedulerWorld): unknown => {
          faultActivated = consultFault(world.faults, MCP_MALFORMED_INITIALIZE, schedulerWorld.rng).fired;
          return campaignObservation('fault-activated', faultActivated, MCP_MALFORMED_INITIALIZE);
        },
      },
      {
        label: 'mcp.refuse-malformed-initialize',
        act: async (): Promise<unknown> => {
          if (!faultActivated) return campaignObservation('degradation', false);
          const parsed = JsonRpcServer.parse(
            JSON.stringify({ jsonrpc: '2.0', id: 17, method: 'initialize', params: { protocolVersion: 42 } }),
          );
          if (parsed.kind !== 'request') return campaignObservation('degradation', false);
          const response = await dispatch(parsed.message);
          malformedRefused = isError(response) && response.id === 17 && response.error.code === -32602;
          return campaignObservation('degradation', malformedRefused);
        },
      },
      {
        label: 'mcp.recover-next-request',
        act: async (): Promise<unknown> => {
          const parsed = JsonRpcServer.parse(
            JSON.stringify({ jsonrpc: '2.0', id: 'after-fault', method: 'tools/list', params: {} }),
          );
          if (parsed.kind !== 'request') return campaignObservation('recovery', false);
          const response = await dispatch(parsed.message);
          recovered =
            malformedRefused &&
            isSuccess(response) &&
            response.id === 'after-fault' &&
            Array.isArray((response.result as { tools?: unknown }).tools) &&
            (response.result as { tools: readonly unknown[] }).tools.length === listTools().length;
          return campaignObservation('recovery', recovered);
        },
      },
    ];
  },
};

const astroMiddlewareRecoveryScenario: SimScenario = {
  id: 'astro-downstream-failure-request-isolation',
  steps: (world: SimWorld): readonly SimStep[] => {
    const middleware = liteshipMiddleware({ workers: { enabled: true } });
    let faultActivated = false;
    let failureObserved = false;
    let firstLocals: LiteshipLocals | undefined;
    let firstSnapshot = '';

    const context = (saveData: boolean): { request: Request; locals: Record<string, unknown> } => ({
      request: new Request('https://host-proof.test/page', {
        headers: {
          'sec-ch-ua-mobile': '?0',
          'sec-ch-prefers-reduced-motion': 'no-preference',
          'sec-ch-dpr': saveData ? '1' : '2',
          'save-data': saveData ? 'on' : 'off',
        },
      }),
      locals: {},
    });

    return [
      {
        label: 'astro.steady',
        act: async (): Promise<unknown> => {
          const current = context(false);
          const response = await middleware(
            current,
            async () => new Response('steady', { headers: { Vary: 'Cookie' } }),
          );
          firstLocals = current.locals['liteship'] as LiteshipLocals;
          firstSnapshot = JSON.stringify(firstLocals);
          const vary = response.headers.get('vary') ?? '';
          return campaignObservation(
            'steady-state',
            response.status === 200 &&
              vary.includes('Cookie') &&
              vary.includes('Save-Data') &&
              firstLocals !== undefined,
          );
        },
      },
      {
        label: 'astro.activate-downstream-failure',
        act: (schedulerWorld): unknown => {
          faultActivated = consultFault(world.faults, ASTRO_DOWNSTREAM_FAILURE, schedulerWorld.rng).fired;
          return campaignObservation('fault-activated', faultActivated, ASTRO_DOWNSTREAM_FAILURE);
        },
      },
      {
        label: 'astro.downstream-fails',
        act: async (): Promise<unknown> => {
          const current = context(true);
          try {
            await middleware(current, async () => {
              if (faultActivated) throw new Error('ASTRO_DOWNSTREAM_FAILURE seed=host-proof');
              return new Response('not-faulted');
            });
          } catch (error) {
            failureObserved = error instanceof Error && error.message.includes('ASTRO_DOWNSTREAM_FAILURE');
          }
          const failedLocals = current.locals['liteship'] as LiteshipLocals | undefined;
          return campaignObservation('degradation', failureObserved && failedLocals !== undefined);
        },
      },
      {
        label: 'astro.recover-isolated-request',
        act: async (): Promise<unknown> => {
          const current = context(true);
          const response = await middleware(
            current,
            async () => new Response('recovered', { status: 202, headers: { Vary: 'Accept-Encoding' } }),
          );
          const recoveredLocals = current.locals['liteship'] as LiteshipLocals | undefined;
          const vary = response.headers.get('vary') ?? '';
          const recovered =
            failureObserved &&
            response.status === 202 &&
            recoveredLocals !== undefined &&
            recoveredLocals !== firstLocals &&
            JSON.stringify(firstLocals) === firstSnapshot &&
            recoveredLocals.capabilities.connection?.saveData === true &&
            vary.includes('Accept-Encoding') &&
            vary.includes('Save-Data');
          return campaignObservation('recovery', recovered);
        },
      },
    ];
  },
};

const stageFrameAdmissionScenario: SimScenario = {
  id: 'stage-invalid-frame-count-refusal-recovery',
  steps: (world: SimWorld): readonly SimStep[] => {
    const plan = motionPlan(-10, 10);
    const cleanFrameCount = 3 + Math.floor(world.rng.next() * 8);
    let faultActivated = false;
    let invalidRefused = false;
    let cleanDigest = '';

    return [
      {
        label: 'stage.steady',
        act: (): unknown => {
          const exported = exportMotionTrack(plan, cleanFrameCount);
          cleanDigest = exported.artifactDigest.integrity_digest;
          return campaignObservation(
            'steady-state',
            exported.frames.length === cleanFrameCount &&
              exported.frames[0]?.t === 0 &&
              exported.frames.at(-1)?.t === 1,
          );
        },
      },
      {
        label: 'stage.activate-invalid-frame-count',
        act: (schedulerWorld): unknown => {
          faultActivated = consultFault(world.faults, STAGE_INVALID_FRAME_COUNT, schedulerWorld.rng).fired;
          return campaignObservation('fault-activated', faultActivated, STAGE_INVALID_FRAME_COUNT);
        },
      },
      {
        label: 'stage.refuse-invalid-frame-count',
        act: (): unknown => {
          try {
            sampleMotionFrames(plan, faultActivated ? -1.5 : cleanFrameCount);
          } catch (error) {
            invalidRefused = error instanceof Error && error.message.includes('non-negative safe integer');
          }
          return campaignObservation('degradation', faultActivated && invalidRefused);
        },
      },
      {
        label: 'stage.recover-valid-export',
        act: (): unknown => {
          const replayed = exportMotionTrack(plan, cleanFrameCount);
          return campaignObservation(
            'recovery',
            invalidRefused &&
              replayed.frames.length === cleanFrameCount &&
              replayed.artifactDigest.integrity_digest === cleanDigest,
          );
        },
      },
    ];
  },
};

const remotionFrameRecoveryScenario: SimScenario = {
  id: 'remotion-frame-overflow-clamp-recovery',
  steps: (world: SimWorld): readonly SimStep[] => {
    const plan = motionPlan(2, 8);
    const totalFrames = 2 + Math.floor(world.rng.next() * 10);
    const frames = frameOutputs(plan, totalFrames);
    let faultActivated = false;
    let clamped = false;

    return [
      {
        label: 'remotion.steady',
        act: (): unknown => {
          const selected = stateAtFrame(frames, 0);
          return campaignObservation(
            'steady-state',
            selected === frames[0]!.state && cssVarsFromState(selected)['--host-proof-x'] === '2',
          );
        },
      },
      {
        label: 'remotion.activate-overflow',
        act: (schedulerWorld): unknown => {
          faultActivated = consultFault(world.faults, REMOTION_FRAME_OVERFLOW, schedulerWorld.rng).fired;
          return campaignObservation('fault-activated', faultActivated, REMOTION_FRAME_OVERFLOW);
        },
      },
      {
        label: 'remotion.clamp-overflow',
        act: (): unknown => {
          const selected = stateAtFrame(frames, faultActivated ? totalFrames + 1_000 : 0);
          clamped = faultActivated && selected === frames.at(-1)!.state;
          return campaignObservation('degradation', clamped);
        },
      },
      {
        label: 'remotion.resume-in-range',
        act: (): unknown => {
          const index = Math.floor(totalFrames / 2);
          const selected = stateAtFrame(frames, index);
          return campaignObservation(
            'recovery',
            clamped && selected === frames[index]!.state && cssVarsFromState(selected)['--host-proof-x'] !== undefined,
          );
        },
      },
    ];
  },
};

const HOST_RECOVERY_CORPUS: readonly RecoveryCorpusEntry[] = Object.freeze([
  {
    scenario: mcpProtocolRecoveryScenario,
    owner: '@liteship/mcp-server',
    invariant: 'a malformed MCP request is refused without poisoning the next valid request',
    seeds: [0x4d43_5001, 0x4d43_5002],
    faultSchedule: [
      {
        point: MCP_MALFORMED_INITIALIZE,
        kind: 'error',
        probability: 1,
        detail: 'replace protocolVersion with a number',
      },
    ],
    recoveryExpectation: {
      steadyState: 'a valid initialize request receives its own id and capabilities',
      degradation: 'the malformed request receives InvalidParams under its own id',
      recovery: 'the following tools/list request returns the live catalog',
    },
  },
  {
    scenario: astroMiddlewareRecoveryScenario,
    owner: '@liteship/astro',
    invariant: 'one downstream Astro handler failure cannot poison later request locals or response headers',
    seeds: [0xa57_0001, 0xa57_0002],
    faultSchedule: [
      { point: ASTRO_DOWNSTREAM_FAILURE, kind: 'error', probability: 1, detail: 'reject one downstream next() call' },
    ],
    recoveryExpectation: {
      steadyState: 'middleware projects request-local evidence and merges Vary',
      degradation: 'the downstream rejection remains observable after request-local projection',
      recovery: 'a later request gets independent locals and a successful response',
    },
  },
  {
    scenario: stageFrameAdmissionScenario,
    owner: '@liteship/stage',
    invariant: 'Stage refuses malformed frame counts and a later valid export reproduces the same addressed track',
    seeds: [0x57a6_0001, 0x57a6_0002],
    faultSchedule: [
      {
        point: STAGE_INVALID_FRAME_COUNT,
        kind: 'error',
        probability: 1,
        detail: 'supply a negative fractional frame count',
      },
    ],
    recoveryExpectation: {
      steadyState: 'a valid count produces endpoint-inclusive motion frames',
      degradation: 'the malformed count is rejected before a partial stream can exist',
      recovery: 'the valid count reproduces the same artifact digest',
    },
  },
  {
    scenario: remotionFrameRecoveryScenario,
    owner: '@liteship/remotion',
    invariant: 'Remotion clamps an overflow without mutating the precomputed stream and resumes in-range lookup',
    seeds: [0x8e10_0001, 0x8e10_0002],
    faultSchedule: [
      {
        point: REMOTION_FRAME_OVERFLOW,
        kind: 'error',
        probability: 1,
        detail: 'request a frame past the precomputed stream',
      },
    ],
    recoveryExpectation: {
      steadyState: 'the first Stage-derived frame projects the authored CSS value',
      degradation: 'an overflow resolves to the last available frame',
      recovery: 'the next in-range lookup resolves the exact requested frame',
    },
  },
]);

describe('cross-host protocol and lifecycle chaos simulation', () => {
  test('every committed fault schedule replays byte-exact and satisfies recovery', async () => {
    const facts = await runSimulationCorpus(HOST_RECOVERY_CORPUS);
    const runs = facts.runs ?? [];
    expect(runs).toHaveLength(HOST_RECOVERY_CORPUS.length * 2);
    expect(new Set(runs.map((run) => run.owner))).toEqual(
      new Set(['@liteship/mcp-server', '@liteship/astro', '@liteship/stage', '@liteship/remotion']),
    );
    for (const run of runs) {
      expect(run.firstDigest).toBe(run.secondDigest);
      expect(run.divergence).toBeUndefined();
      expect(run.recoveryObservation).toEqual({
        steadyStateObserved: true,
        activatedFaultPoints: [...new Set(run.faultSchedule.map((fault) => fault.point))].sort(),
        degradationObserved: true,
        recoveryObserved: true,
      });
    }
    expect(simulationDeterminismGate.run(simulationContext(runs))).toEqual([]);
  });

  test('MCP error envelopes preserve ids and never poison a following valid request', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(fc.string({ maxLength: 32 }), fc.integer(), fc.constant(null)),
        fc.oneof(fc.integer(), fc.boolean(), fc.constant(null)),
        async (id, malformedVersion) => {
          const malformed = JsonRpcServer.parse(
            JSON.stringify({ jsonrpc: '2.0', id, method: 'initialize', params: { protocolVersion: malformedVersion } }),
          );
          expect(malformed.kind).toBe('request');
          if (malformed.kind !== 'request') return;
          const refused = await dispatch(malformed.message);
          expect(isError(refused) && refused.id === id && refused.error.code === -32602).toBe(true);

          const next = JsonRpcServer.parse(
            JSON.stringify({ jsonrpc: '2.0', id: `next-${String(id)}`, method: 'tools/list', params: {} }),
          );
          expect(next.kind).toBe('request');
          if (next.kind !== 'request') return;
          const recovered = await dispatch(next.message);
          expect(isSuccess(recovered)).toBe(true);
          expect((recovered as JsonRpcSuccess).id).toBe(`next-${String(id)}`);
        },
      ),
      { seed: 0x4d43_50ff, numRuns: 100 },
    );
  });

  test('Astro request failures do not leak locals or Vary state across later requests', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(fc.boolean(), { minLength: 2, maxLength: 12 }), async (failures) => {
        const middleware = liteshipMiddleware({ workers: { enabled: true } });
        const successfulLocals: LiteshipLocals[] = [];
        for (const [index, fail] of failures.entries()) {
          const current = {
            request: new Request(`https://host-proof.test/${index}`, {
              headers: { 'save-data': index % 2 === 0 ? 'on' : 'off', 'sec-ch-dpr': String((index % 3) + 1) },
            }),
            locals: {} as Record<string, unknown>,
          };
          try {
            const response = await middleware(current, async () => {
              if (fail) throw new Error(`downstream-${index}`);
              return new Response(String(index), { headers: { Vary: `X-Request-${index}` } });
            });
            expect(response.headers.get('vary')).toContain(`X-Request-${index}`);
            expect(response.headers.get('vary')).toContain('Save-Data');
            successfulLocals.push(current.locals['liteship'] as LiteshipLocals);
          } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect((error as Error).message).toBe(`downstream-${index}`);
          }
          expect(current.locals['liteship']).toBeDefined();
        }
        expect(new Set(successfulLocals).size).toBe(successfulLocals.length);
      }),
      { seed: 0xa57_00ff, numRuns: 60 },
    );
  });

  test('Stage and Remotion agree on every admitted frame and recover from arbitrary overflow indices', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 120 }),
        fc.integer({ min: 0, max: 10_000 }),
        fc.double({ min: -100, max: 100, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: -100, max: 100, noNaN: true, noDefaultInfinity: true }),
        (totalFrames, overflow, from, to) => {
          const plan = motionPlan(from, to);
          const stage = exportMotionTrack(plan, totalFrames);
          const remotion = frameOutputs(plan, totalFrames);
          expect(stage.frames).toHaveLength(totalFrames);
          expect(remotion).toHaveLength(totalFrames);

          for (let frame = 0; frame < totalFrames; frame += 1) {
            expect(cssVarsFromState(stateAtFrame(remotion, frame))).toEqual(stage.frames[frame]!.css);
          }

          const before = JSON.stringify(remotion);
          expect(stateAtFrame(remotion, totalFrames + overflow)).toBe(remotion.at(-1)!.state);
          expect(stateAtFrame(remotion, Math.floor(totalFrames / 2))).toBe(
            remotion[Math.floor(totalFrames / 2)]!.state,
          );
          expect(JSON.stringify(remotion)).toBe(before);
          expect(exportMotionTrack(plan, totalFrames).artifactDigest).toEqual(stage.artifactDigest);
        },
      ),
      { seed: 0x57a6_8e10, numRuns: 80 },
    );
  });

  test('frame-count owners refuse every negative, fractional, non-finite, or unsafe count', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer({ max: -1 }),
          fc
            .double({ min: -1_000, max: 1_000, noNaN: true, noDefaultInfinity: true })
            .filter(Number.isFinite)
            .filter((value) => !Number.isInteger(value)),
          fc.constantFrom(Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.MAX_VALUE),
        ),
        (invalidCount) => {
          expect(() => sampleMotionFrames(motionPlan(), invalidCount)).toThrow(/non-negative safe integer/);
        },
      ),
      { seed: 0x57a6_bad, numRuns: 100 },
    );
  });

  test('individual campaign replays retain fault and recovery observations', async () => {
    for (const entry of HOST_RECOVERY_CORPUS) {
      for (const seed of entry.seeds) {
        const replay = await assertReplayDeterministic(seed, entry.scenario, { faults: entry.faultSchedule });
        expect(replay.deterministic).toBe(true);
        expect(replay.firstDigest).toBe(replay.secondDigest);
        expect(replay.first.entries.map((trace) => trace.label)).toEqual(
          replay.second.entries.map((trace) => trace.label),
        );
      }
    }
  });
});
