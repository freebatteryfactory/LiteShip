/**
 * The worker→host message protocol, expressed as a pure
 * `reduce(state, msg) → effects` machine plus a thin effect executor.
 *
 * `reduceWorkerMessage` folds an inbound {@link FromWorkerMessage} into the
 * explicit {@link CompositorWorkerRuntimeState} record (runtime
 * application, mode-flag transitions, last-observed telemetry) and returns
 * an ordered list of {@link ProtocolEffect}s describing the host-facing
 * outcomes — state deliveries, ack deliveries, metrics deliveries, and
 * diagnostic samples. `applyProtocolEffects` performs the actual listener
 * fan-out and `Diagnostics` emission.
 *
 * Splitting the reducer (decision) from the executor (fan-out/IO) keeps
 * the message-handling logic inspectable and free of captured mutable
 * flags: every state mutation is visible on the passed record, and every
 * side effect is a value before it is performed.
 *
 * @module
 */

import { Diagnostics } from '@liteship/core';
import type { FromWorkerMessage } from './messages.js';
import type {
  CompositorWorkerState,
  ResolvedStateAckPayload,
  CompositorWorkerStartupDiagnosticStage,
  WorkerMetrics,
} from './compositor-types.js';
import {
  currentTimeNs,
  recordStartupDiagnosticStage,
  notifyResolvedStateSettled,
  toResolvedStateEntriesFromAck,
} from './compositor-startup.js';
import type { CompositorWorkerRuntimeState } from './compositor-state.js';

// ---------------------------------------------------------------------------
// Effects
// ---------------------------------------------------------------------------

/** Emit a diagnostic stage sample to the telemetry sink. */
interface DiagnosticStageEffect {
  readonly _tag: 'diagnostic-stage';
  readonly stage: CompositorWorkerStartupDiagnosticStage;
  readonly durationNs: number;
}

/** Deliver a composite-state snapshot to every state listener. */
interface DeliverStateEffect {
  readonly _tag: 'deliver-state';
  readonly state: CompositorWorkerState;
}

/** Notify telemetry the worker settled a resolved-state hydration. */
interface ResolvedStateSettledEffect {
  readonly _tag: 'resolved-state-settled';
  readonly ack: ResolvedStateAckPayload;
}

/** Deliver a resolved-state ack to every ack listener. */
interface DeliverAckEffect {
  readonly _tag: 'deliver-ack';
  readonly ack: ResolvedStateAckPayload;
}

/** Deliver a metrics sample to every metrics listener. */
interface DeliverMetricsEffect {
  readonly _tag: 'deliver-metrics';
  readonly metrics: WorkerMetrics;
}

/** Route a worker-reported error through `Diagnostics`. */
interface WorkerErrorEffect {
  readonly _tag: 'worker-error';
  readonly code?: string;
  readonly message: string;
  readonly hint?: string;
  readonly context?: string;
}

/** A host-facing outcome produced by folding one worker→host message. */
export type ProtocolEffect =
  | DiagnosticStageEffect
  | DeliverStateEffect
  | ResolvedStateSettledEffect
  | DeliverAckEffect
  | DeliverMetricsEffect
  | WorkerErrorEffect;

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

/**
 * Fold an inbound worker→host message into the state record, returning the
 * ordered host-facing effects. The returned effects are executed by
 * {@link applyProtocolEffects}; this function performs only state
 * application (runtime + mode + last-observed telemetry).
 */
export function reduceWorkerMessage(
  state: CompositorWorkerRuntimeState,
  msg: FromWorkerMessage,
): readonly ProtocolEffect[] {
  switch (msg.type) {
    case 'ready':
      return [];

    case 'state': {
      const effects: ProtocolEffect[] = [];
      const startupReplyMode = state.mode._tag === 'steady' && state.mode.firstStatePending ? state.mode : null;
      const eventStartNs = currentTimeNs();

      if (startupReplyMode) {
        effects.push({
          _tag: 'diagnostic-stage',
          stage: 'state-delivery:message-receipt',
          durationNs: eventStartNs - startupReplyMode.firstStateDispatchCompletedNs!,
        });
      }

      for (const [name, discreteState] of Object.entries(msg.state.discrete ?? {})) {
        state.runtime.applyState(name, discreteState);
      }

      const callbackStartNs = currentTimeNs();
      if (startupReplyMode) {
        effects.push({
          _tag: 'diagnostic-stage',
          stage: 'state-delivery:callback-queue-turn',
          durationNs: callbackStartNs - eventStartNs,
        });
      }

      effects.push({
        _tag: 'deliver-state',
        state: { ...msg.state, resolvedStateGenerations: msg.resolvedStateGenerations },
      });

      if (startupReplyMode) {
        effects.push({
          _tag: 'diagnostic-stage',
          stage: 'state-delivery:host-callback-delivery',
          durationNs: currentTimeNs() - callbackStartNs,
        });
        // The startup reply is settled; clear the in-flight markers.
        startupReplyMode.firstStatePending = false;
        startupReplyMode.firstStateDispatchCompletedNs = null;
      }

      return effects;
    }

    case 'resolved-state-ack': {
      const ackOutstanding =
        state.mode._tag === 'steady' &&
        state.mode.resolvedStateAckPending &&
        state.mode.resolvedStateDispatchCompletedNs !== null;

      if (!ackOutstanding) {
        return [{ _tag: 'resolved-state-settled', ack: msg }];
      }

      const effects: ProtocolEffect[] = [];
      const dispatchCompletedNs = state.mode._tag === 'steady' ? state.mode.resolvedStateDispatchCompletedNs! : 0;
      const eventStartNs = currentTimeNs();
      effects.push({
        _tag: 'diagnostic-stage',
        stage: 'state-delivery:message-receipt',
        durationNs: eventStartNs - dispatchCompletedNs,
      });
      const callbackStartNs = currentTimeNs();
      effects.push({
        _tag: 'diagnostic-stage',
        stage: 'state-delivery:callback-queue-turn',
        durationNs: callbackStartNs - eventStartNs,
      });
      effects.push({ _tag: 'resolved-state-settled', ack: msg });

      if (state.resolvedStateAckListeners.size > 0) {
        effects.push({ _tag: 'deliver-ack', ack: msg });
        effects.push({
          _tag: 'diagnostic-stage',
          stage: 'state-delivery:host-callback-delivery',
          durationNs: currentTimeNs() - callbackStartNs,
        });
      } else {
        effects.push({
          _tag: 'diagnostic-stage',
          stage: 'state-delivery:host-callback-delivery',
          durationNs: 0,
        });
      }

      if (state.mode._tag === 'steady') {
        state.mode.resolvedStateAckPending = false;
        state.mode.resolvedStateDispatchCompletedNs = null;
      }

      return effects;
    }

    case 'metrics': {
      const metrics: WorkerMetrics = { type: 'metrics', fps: msg.fps, budgetUsed: msg.budgetUsed };
      state.lastMetrics = metrics;
      return [{ _tag: 'deliver-metrics', metrics }];
    }

    case 'error':
      state.lastWorkerError = msg.message;
      return [
        {
          _tag: 'worker-error',
          code: msg.code,
          message: msg.message,
          hint: msg.hint,
          context: msg.context,
        },
      ];

    default:
      // frame / render-complete are render-worker messages; the compositor
      // host ignores them.
      return [];
  }
}

// ---------------------------------------------------------------------------
// Executor
// ---------------------------------------------------------------------------

/** Perform the host-facing IO described by a list of {@link ProtocolEffect}s. */
export function applyProtocolEffects(state: CompositorWorkerRuntimeState, effects: readonly ProtocolEffect[]): void {
  for (const effect of effects) {
    switch (effect._tag) {
      case 'diagnostic-stage':
        recordStartupDiagnosticStage(state.startupTelemetry, effect.stage, effect.durationNs);
        break;
      case 'deliver-state':
        for (const cb of state.stateListeners) cb(effect.state);
        break;
      case 'resolved-state-settled':
        notifyResolvedStateSettled(state.startupTelemetry, toResolvedStateEntriesFromAck(effect.ack));
        break;
      case 'deliver-ack':
        for (const cb of state.resolvedStateAckListeners) cb(effect.ack);
        break;
      case 'deliver-metrics':
        for (const cb of state.metricsListeners) cb(effect.metrics);
        break;
      case 'worker-error':
        Diagnostics.error({
          source: 'liteship/worker.compositor-worker',
          code: 'worker-message-error',
          // Both worker-side catch sites wrap compute(), where the
          // dominant failure is a registration whose thresholds do not
          // line up with its states — hedged because other causes exist.
          message:
            effect.context !== undefined
              ? `Compositor worker failed while handling "${effect.context}". Most often a registration whose thresholds do not line up with its states (thresholds[i] is the lower bound of states[i]).`
              : 'Compositor worker reported an error.',
          detail: { code: effect.code, message: effect.message, hint: effect.hint, context: effect.context },
        });
        break;
    }
  }
}
