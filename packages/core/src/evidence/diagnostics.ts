/**
 * Diagnostics -- centralized runtime warning/error emission.
 *
 * Provides typed warning/error helpers with a swappable sink so runtime
 * boundaries can emit operator-visible diagnostics without hard-coding
 * console calls throughout the codebase.
 *
 * @module
 */

import { type Clock, wallClock } from '../clock/clock.js';
import type { DiagnosticCode } from '@liteship/error';

/** Severity level for a {@link DiagnosticEvent}. */
export type DiagnosticLevel = 'warn' | 'error';

/**
 * Operator-facing payload shape for a single diagnostic emission: a stable
 * `source`/`code` pair for filtering, a human message, plus optional structured
 * detail and an underlying cause.
 */
export interface DiagnosticPayload {
  readonly source: string;
  /** Local operator code. Stable public identities use the registered-only methods below. */
  readonly code: string;
  readonly message: string;
  readonly cause?: unknown;
  readonly detail?: unknown;
}

/** A diagnostic whose code is a stable identity enrolled in DIAGNOSTIC_REGISTRY. */
export interface RegisteredDiagnosticPayload extends Omit<DiagnosticPayload, 'code'> {
  readonly code: DiagnosticCode;
}

/** A {@link DiagnosticPayload} enriched with severity and an emission timestamp. */
export interface DiagnosticEvent extends DiagnosticPayload {
  readonly level: DiagnosticLevel;
  readonly timestamp: number;
}

/** Swappable transport that receives {@link DiagnosticEvent}s from {@link Diagnostics}. */
export interface DiagnosticsSink {
  emit(event: DiagnosticEvent): void;
}

type ConsoleMethodName = Extract<DiagnosticLevel, 'warn' | 'error'>;

interface ConsoleLike {
  readonly warn?: (...args: readonly unknown[]) => void;
  readonly error?: (...args: readonly unknown[]) => void;
}

function asConsoleLike(value: unknown): ConsoleLike | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  // Require at least one usable method; warn/error may be absent in stripped envs.
  if (typeof v['warn'] !== 'function' && typeof v['error'] !== 'function') return null;
  return value as ConsoleLike;
}

function getConsoleMethod(level: ConsoleMethodName): ((...args: readonly unknown[]) => void) | null {
  const consoleLike = asConsoleLike(globalThis.console);
  const method = consoleLike?.[level];
  return typeof method === 'function' ? method.bind(consoleLike) : null;
}

function formatHeadline(event: DiagnosticEvent): string {
  return `[${event.source}] ${event.code}: ${event.message}`;
}

function toArgs(event: DiagnosticEvent): readonly unknown[] {
  const args: unknown[] = [formatHeadline(event)];

  if (event.detail !== undefined) {
    args.push(event.detail);
  }

  if (event.cause !== undefined) {
    args.push(event.cause);
  }

  return args;
}

const defaultSink: DiagnosticsSink = {
  emit(event) {
    const method = getConsoleMethod(event.level);
    if (method) {
      method(...toArgs(event));
    }
  },
};

let currentSink: DiagnosticsSink = defaultSink;
const onceKeys = new Set<string>();

/**
 * The clock the emission TIMESTAMP is read from. A `DiagnosticEvent.timestamp` is
 * an absolute point in time (epoch ms) — a TIMESTAMP, not a duration — so it
 * defaults to {@link wallClock} (`Date.now`). Swappable via {@link setClock} so a
 * test or deterministic replay can pin every diagnostic's timestamp with a
 * `fixedClock`/`manualClock` (the same cake-and-eat-it discipline as {@link setSink}).
 */
let currentClock: Clock = wallClock;

function toEvent(level: DiagnosticLevel, payload: DiagnosticPayload): DiagnosticEvent {
  return {
    ...payload,
    level,
    timestamp: currentClock.now(),
  };
}

function emit(level: DiagnosticLevel, payload: DiagnosticPayload): DiagnosticEvent {
  const event = toEvent(level, payload);
  currentSink.emit(event);
  return event;
}

function buildOnceKey(payload: DiagnosticPayload): string {
  return `${payload.source}:${payload.code}:${payload.message}`;
}

function warn(payload: DiagnosticPayload): DiagnosticEvent {
  return emit('warn', payload);
}

function error(payload: DiagnosticPayload): DiagnosticEvent {
  return emit('error', payload);
}

function warnOnce(payload: DiagnosticPayload): DiagnosticEvent | null {
  const key = buildOnceKey(payload);
  if (onceKeys.has(key)) {
    return null;
  }

  onceKeys.add(key);
  return warn(payload);
}

function warnRegistered(payload: RegisteredDiagnosticPayload): DiagnosticEvent {
  return warn(payload);
}

function errorRegistered(payload: RegisteredDiagnosticPayload): DiagnosticEvent {
  return error(payload);
}

function warnOnceRegistered(payload: RegisteredDiagnosticPayload): DiagnosticEvent | null {
  return warnOnce(payload);
}

function setSink(sink: DiagnosticsSink): DiagnosticsSink {
  const previous = currentSink;
  currentSink = sink;
  return previous;
}

function resetSink(): void {
  currentSink = defaultSink;
}

function setClock(clock: Clock): Clock {
  const previous = currentClock;
  currentClock = clock;
  return previous;
}

function resetClock(): void {
  currentClock = wallClock;
}

function clearOnce(): void {
  onceKeys.clear();
}

function reset(): void {
  resetSink();
  resetClock();
  clearOnce();
}

function createBufferSink(): { readonly sink: DiagnosticsSink; readonly events: DiagnosticEvent[] } {
  const events: DiagnosticEvent[] = [];
  return {
    sink: {
      emit(event) {
        events.push(event);
      },
    },
    events,
  };
}

/**
 * Diagnostics facade — runtime boundaries call {@link Diagnostics.warn} / {@link Diagnostics.error}
 * instead of `console.*` so hosts can redirect or capture every diagnostic via {@link Diagnostics.setSink}.
 */
export const Diagnostics = {
  /** Emit a `warn`-level {@link DiagnosticEvent} to the current sink. */
  warn,
  /** Emit an `error`-level {@link DiagnosticEvent} to the current sink. */
  error,
  /** {@link Diagnostics.warn}, but deduplicated by `source:code:message`. */
  warnOnce,
  /** Emit a warning whose stable code must be enrolled in DIAGNOSTIC_REGISTRY. */
  warnRegistered,
  /** Emit an error whose stable code must be enrolled in DIAGNOSTIC_REGISTRY. */
  errorRegistered,
  /** Deduplicated registered warning. */
  warnOnceRegistered,
  /** Replace the active sink (e.g. for tests or hosted environments). */
  setSink,
  /** Restore the default sink that writes through `console`. */
  resetSink,
  /**
   * Replace the clock the emission `timestamp` (a wall-clock TIMESTAMP) is read
   * from; returns the previous clock. Pass a `fixedClock`/`manualClock` for
   * deterministic, replayable diagnostic timestamps.
   */
  setClock,
  /** Restore the default {@link wallClock} timestamp source. */
  resetClock,
  /** Clear the deduplication set used by {@link Diagnostics.warnOnce}. */
  clearOnce,
  /** Convenience for `resetSink()` + `clearOnce()` — mostly for test teardown. */
  reset,
  /** Build an in-memory sink that collects events into an array — useful for tests. */
  createBufferSink,
} as const;

export declare namespace Diagnostics {
  /** Alias for {@link DiagnosticPayload}. */
  export type Payload = DiagnosticPayload;
  /** Payload accepted by the registered-only diagnostic emitters. */
  export type RegisteredPayload = RegisteredDiagnosticPayload;
  /** Alias for {@link DiagnosticEvent}. */
  export type Event = DiagnosticEvent;
  /** Alias for {@link DiagnosticLevel}. */
  export type Level = DiagnosticLevel;
  /** Alias for {@link DiagnosticsSink}. */
  export type Sink = DiagnosticsSink;
}
