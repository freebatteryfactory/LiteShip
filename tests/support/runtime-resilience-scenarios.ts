/**
 * Deterministic runtime-resilience schedules for the worker, web, and
 * quantizer public seams.
 *
 * These are test-authority corpus entries, not a second simulation runner.
 * They are executed by the CLI-owned `runSimulationCorpus`, projected through
 * the gauntlet's simulation facts, and therefore retain the same replay seed,
 * fault schedule, recovery observations, and CurePacket-compatible failure
 * shape as the production DST corpus.
 *
 * Keeping the entries at the test composition boundary avoids making the CLI
 * depend on every optional runtime package merely so it can certify them.
 *
 * @module
 */

import { HLC, SSE_BUFFER_SIZE, defineBoundary } from '@liteship/core';
import { consultFault, type SimScenario, type SimStep, type SimWorld } from '@liteship/core/simulation';
import { createQuantizer, defineQuantizer } from '@liteship/quantizer';
import { SSE, Resumption } from '@liteship/web';
import { SPSCRing } from '@liteship/worker';
import { campaignObservation, type RecoveryCorpusEntry } from '../../packages/cli/src/internal/simulation-corpus.js';
import { MockEventSource } from '../helpers/mock-event-source.js';

const WORKER_FAULT_POINT = 'worker.producer-crash';
const WEB_DISCONNECT_POINT = 'web.transport-disconnect';
const WEB_REORDER_POINT = 'web.stale-generation-reorder';
const QUANTIZER_TIME_POINT = 'quantizer.wall-clock-regression';

const workerLifecycleScenario: SimScenario = {
  id: 'worker-spsc-crash-restart-backpressure',
  steps: (world: SimWorld): readonly SimStep[] => {
    const pair = SPSCRing.createPair(3, 1);
    let producer = pair.producer;
    const out = new Float64Array(1);
    let faultActivated = false;
    let saturated = false;
    let recovered = false;

    return [
      {
        label: 'worker.steady',
        act: (): unknown => {
          const pushed = producer.push(Float64Array.of(1));
          const popped = pair.consumer.pop(out);
          return campaignObservation('steady-state', pushed && popped && out[0] === 1);
        },
      },
      {
        label: 'worker.backpressure',
        act: (): unknown => {
          const accepted = [10, 20, 30].map((value) => producer.push(Float64Array.of(value)));
          const overflowAccepted = producer.push(Float64Array.of(40));
          saturated = accepted.every(Boolean) && !overflowAccepted && pair.producer.count === pair.producer.capacity;
          return campaignObservation('degradation', saturated);
        },
      },
      {
        label: 'worker.crash',
        act: (schedulerWorld): unknown => {
          const decision = consultFault(world.faults, WORKER_FAULT_POINT, schedulerWorld.rng);
          faultActivated = decision.fired;
          if (faultActivated) {
            // Dropping the producer handle models a worker generation dying.
            // The shared buffer remains the durable hand-off seam.
            producer = SPSCRing.attachProducer(pair.buffer);
          }
          return campaignObservation('fault-activated', faultActivated, WORKER_FAULT_POINT);
        },
      },
      {
        label: 'worker.restart',
        act: (): unknown => {
          const drained: number[] = [];
          while (pair.consumer.pop(out)) drained.push(out[0]!);
          const acceptedAfterRestart = producer.push(Float64Array.of(50));
          const readAfterRestart = pair.consumer.pop(out);
          recovered =
            faultActivated &&
            saturated &&
            JSON.stringify(drained) === JSON.stringify([10, 20, 30]) &&
            acceptedAfterRestart &&
            readAfterRestart &&
            out[0] === 50;
          return campaignObservation('recovery', recovered);
        },
      },
    ];
  },
};

const webTransportScenario: SimScenario = {
  id: 'web-sse-disconnect-stale-reorder-backpressure',
  steps: (world: SimWorld): readonly SimStep[] => {
    const sourceOffset = MockEventSource.instances.length;
    const client = SSE.create({
      url: 'http://localhost/events',
      reconnect: { maxAttempts: 0 },
      overflow: 'coalesce-by-id',
    });
    const firstSource = MockEventSource.instances[sourceOffset]!;
    const staleMessage = firstSource.onmessage;
    let disconnectActivated = false;
    let reorderActivated = false;
    let disconnected = false;
    let staleIgnored = false;
    let saturated = false;

    return [
      {
        label: 'web.steady',
        act: (): unknown => {
          firstSource.simulateMessage(JSON.stringify({ type: 'signal', data: { state: 'ready' } }), '1');
          return campaignObservation('steady-state', client.state === 'connected' && client.lastEventId === '1');
        },
      },
      {
        label: 'web.disconnect',
        act: (schedulerWorld): unknown => {
          const decision = consultFault(world.faults, WEB_DISCONNECT_POINT, schedulerWorld.rng);
          disconnectActivated = decision.fired;
          if (disconnectActivated) firstSource.simulateError();
          disconnected = client.state === 'error';
          return campaignObservation('fault-activated', disconnectActivated, WEB_DISCONNECT_POINT);
        },
      },
      {
        label: 'web.degraded',
        act: (): unknown => campaignObservation('degradation', disconnectActivated && disconnected),
      },
      {
        label: 'web.reconnect',
        act: (): unknown => {
          client.reconnect();
          const secondSource = MockEventSource.instances[sourceOffset + 1]!;
          secondSource.simulateMessage(JSON.stringify({ type: 'signal', data: { state: 'live' } }), '2');
          return { state: client.state, cursor: client.lastEventId, source: secondSource.url };
        },
      },
      {
        label: 'web.stale-reorder',
        act: (schedulerWorld): unknown => {
          const decision = consultFault(world.faults, WEB_REORDER_POINT, schedulerWorld.rng);
          reorderActivated = decision.fired;
          if (reorderActivated) {
            staleMessage?.({
              type: 'message',
              data: JSON.stringify({ type: 'signal', data: { state: 'stale' } }),
              lastEventId: '999',
            } as MessageEvent);
          }
          staleIgnored = client.lastEventId === '2';
          return campaignObservation('fault-activated', reorderActivated, WEB_REORDER_POINT);
        },
      },
      {
        label: 'web.backpressure',
        act: (): unknown => {
          const secondSource = MockEventSource.instances[sourceOffset + 1]!;
          for (let index = 0; index <= SSE_BUFFER_SIZE; index += 1) {
            secondSource.simulateMessage(
              JSON.stringify({ type: 'patch', data: { id: `node-${index}`, html: `<b>${index}</b>` } }),
            );
          }
          // The pre-disconnect steady-state signal remains buffered, so the
          // exact eviction count is intentionally derived from occupancy rather
          // than hard-coded. The law is boundedness + explicit shedding.
          saturated = client.backpressure.droppedCount > 0 && client.backpressure.bufferSize === SSE_BUFFER_SIZE;
          return {
            saturated,
            dropped: client.backpressure.droppedCount,
            size: client.backpressure.bufferSize,
          };
        },
      },
      {
        label: 'web.recovered',
        act: async (): Promise<unknown> => {
          const recovered =
            disconnectActivated &&
            reorderActivated &&
            staleIgnored &&
            saturated &&
            client.state === 'connected' &&
            Resumption.canResume(client.lastEventId ?? '', '2');
          await client.dispose();
          return campaignObservation('recovery', recovered);
        },
      },
    ];
  },
};

const quantizerTimeScenario: SimScenario = {
  id: 'quantizer-clock-regression-hysteresis',
  steps: (world: SimWorld): readonly SimStep[] => {
    world.wallClock.set(1_000);
    const boundary = defineBoundary({
      input: 'runtime.load',
      at: [
        [0, 'low'],
        [100, 'high'],
      ],
      hysteresis: 20,
    });
    const quantizer = createQuantizer(
      defineQuantizer(boundary, {
        outputs: {
          css: {
            low: { opacity: 0.5 },
            high: { opacity: 1 },
          },
        },
      }),
      { clock: world.wallClock, node: 'runtime-resilience' },
    );
    const stamps: string[] = [];
    const unsubscribe = quantizer.changes.subscribe((crossing) => stamps.push(HLC.encode(crossing.timestamp)));
    let regressionActivated = false;
    let degradedSafely = false;

    return [
      {
        label: 'quantizer.steady',
        act: (): unknown => {
          const heldBelow = quantizer.evaluate(99) === 'low';
          const heldAbove = quantizer.evaluate(101) === 'low';
          const crossed = quantizer.evaluate(111) === 'high';
          return campaignObservation('steady-state', heldBelow && heldAbove && crossed && stamps.length === 1);
        },
      },
      {
        label: 'quantizer.clock-regression',
        act: (schedulerWorld): unknown => {
          const decision = consultFault(world.faults, QUANTIZER_TIME_POINT, schedulerWorld.rng);
          regressionActivated = decision.fired;
          if (regressionActivated) world.wallClock.set(900);
          return campaignObservation('fault-activated', regressionActivated, QUANTIZER_TIME_POINT);
        },
      },
      {
        label: 'quantizer.degraded-clock',
        act: (): unknown => {
          const held = quantizer.evaluate(91) === 'high';
          const crossed = quantizer.evaluate(89) === 'low';
          const first = stamps[0] === undefined ? undefined : HLC.decode(stamps[0]);
          const second = stamps[1] === undefined ? undefined : HLC.decode(stamps[1]);
          degradedSafely =
            regressionActivated &&
            held &&
            crossed &&
            first !== undefined &&
            second !== undefined &&
            HLC.compare(first, second) < 0;
          return campaignObservation('degradation', degradedSafely);
        },
      },
      {
        label: 'quantizer.recovered',
        act: async (): Promise<unknown> => {
          world.wallClock.set(1_100);
          const held = quantizer.evaluate(109) === 'low';
          const crossed = quantizer.evaluate(111) === 'high';
          const second = stamps[1] === undefined ? undefined : HLC.decode(stamps[1]);
          const third = stamps[2] === undefined ? undefined : HLC.decode(stamps[2]);
          const recovered =
            degradedSafely &&
            held &&
            crossed &&
            second !== undefined &&
            third !== undefined &&
            HLC.compare(second, third) < 0;
          unsubscribe();
          await quantizer.dispose();
          return campaignObservation('recovery', recovered);
        },
      },
    ];
  },
};

/** Replayable recovery campaigns spanning the three runtime owners. */
export const RUNTIME_RESILIENCE_CORPUS: readonly RecoveryCorpusEntry[] = Object.freeze([
  {
    scenario: workerLifecycleScenario,
    owner: '@liteship/worker',
    invariant:
      'bounded worker transport survives backpressure and a producer-generation restart without loss or reordering',
    seeds: [101, 0xc0ffee],
    faultSchedule: [
      { point: WORKER_FAULT_POINT, kind: 'error', probability: 1, detail: 'terminate the current producer generation' },
    ],
    recoveryExpectation: {
      steadyState: 'the producer and consumer exchange one slot',
      degradation: 'the full ring refuses additional work without overwriting queued slots',
      recovery: 'a reattached producer preserves queued order and accepts new work',
    },
  },
  {
    scenario: webTransportScenario,
    owner: '@liteship/web',
    invariant: 'SSE reconnect ignores stale-generation frames and sheds only bounded idempotent work under pressure',
    seeds: [202, 0xbadc0de],
    faultSchedule: [
      {
        point: WEB_DISCONNECT_POINT,
        kind: 'error',
        probability: 1,
        detail: 'disconnect the active EventSource generation',
      },
      {
        point: WEB_REORDER_POINT,
        kind: 'reorder',
        probability: 1,
        detail: 'deliver one old-generation frame after reconnect',
      },
    ],
    recoveryExpectation: {
      steadyState: 'the live EventSource advances the cursor',
      degradation: 'the disconnect becomes an explicit error state',
      recovery: 'the replacement source resumes, ignores the stale frame, and preserves bounded overflow accounting',
    },
  },
  {
    scenario: quantizerTimeScenario,
    owner: '@liteship/quantizer',
    invariant: 'hysteresis suppresses threshold jitter and crossing HLCs remain monotonic across wall-clock regression',
    seeds: [303, 0xdecaf],
    faultSchedule: [
      {
        point: QUANTIZER_TIME_POINT,
        kind: 'delay',
        probability: 1,
        delayTicks: 100,
        detail: 'move wall time behind the prior crossing',
      },
    ],
    recoveryExpectation: {
      steadyState: 'the quantizer crosses only after clearing the upward dead zone',
      degradation: 'the regressed clock is absorbed while the downward dead zone remains authoritative',
      recovery: 'forward time and a cleared threshold produce a strictly later crossing',
    },
  },
]);
