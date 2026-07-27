/**
 * Graph-native stream gap recovery (#133 interim slice).
 *
 * The discrete/continuous law is the replay discriminator: only discrete
 * crossings are replayable graph events; continuous transients must NOT replay.
 * Recovery paths type-refuse continuous cells — widening the SSE replay payload
 * with signals is intentionally uncompilable.
 *
 * @module
 */

import type { StateCell, StateCellKind } from './state-cell.js';
import { StateCell as StateCellOps } from './state-cell.js';
import type { SignalSource } from './signal.js';
import { inputToSource } from './signal-input.js';

/** Only discrete/replayable cells may enter graph-native recovery paths (#133). */
export type ReplayableRecoveryCell = StateCell & { readonly replayable: true; readonly kind: 'discrete' };

/** Narrow a {@link StateCell} to a replayable recovery entry, or `undefined`. */
export const asReplayableRecoveryCell = (cell: StateCell): ReplayableRecoveryCell | undefined =>
  StateCellOps.isReplayable(cell) ? (cell as ReplayableRecoveryCell) : undefined;

/**
 * Classify a canonical {@link SignalSource} by the discrete/continuous replay law
 * (ADR-0035 / ROADMAP Epic 9).
 */
export function signalSourceKind(source: SignalSource): StateCellKind {
  switch (source.type) {
    case 'scroll':
    case 'pointer':
    case 'time':
    case 'viewport':
      return 'continuous';
    case 'audio':
      return source.mode === 'amplitude' || source.mode === 'beat' ? 'continuous' : 'discrete';
    case 'media':
    case 'custom':
      return 'discrete';
  }
}

/**
 * Classify an SSE signal frame payload (often ad-hoc, not a full {@link SignalSource}).
 */
export function signalPayloadKind(payload: unknown): StateCellKind {
  if (payload === null || typeof payload !== 'object') {
    return 'discrete';
  }

  const record = payload as Record<string, unknown>;

  if ('type' in record && record.type === 'signal' && 'data' in record) {
    return signalPayloadKind(record.data);
  }

  if ('state' in record && typeof record.state === 'string') {
    return 'discrete';
  }

  for (const key of Object.keys(record)) {
    const source = inputToSource(key);
    if (source) {
      return signalSourceKind(source);
    }
    if (key === 'width' || key === 'height' || key === 'viewport' || key === 'progress') {
      return 'continuous';
    }
  }

  return 'discrete';
}

/** Whether a replay patch entry is morphable HTML (not a signal frame). */
export function isReplayHtmlPatch(patch: unknown): boolean {
  if (typeof patch === 'string') {
    return true;
  }

  if (patch !== null && typeof patch === 'object') {
    const record = patch as Record<string, unknown>;
    if ('html' in record && typeof record.html === 'string') {
      return true;
    }
    if ('type' in record) {
      const type = record.type;
      if (type === 'signal') {
        return false;
      }
      if (type === 'patch' || type === 'batch' || type === 'snapshot') {
        return true;
      }
    }
    if ('data' in record && typeof record.data === 'string' && record.type !== 'signal') {
      return true;
    }
  }

  return false;
}

/** True when the replay array carries signal frames that need snapshot supplement. */
export const replayDroppedSignals = (patches: readonly unknown[]): boolean =>
  patches.some(
    (patch) => patch !== null && typeof patch === 'object' && (patch as Record<string, unknown>).type === 'signal',
  );

/** Unwrap SSE-frame-shaped snapshot entries before discrete/continuous classification. */
function unwrapSnapshotSignalEntry(entry: unknown): unknown {
  if (entry !== null && typeof entry === 'object' && !Array.isArray(entry)) {
    const record = entry as Record<string, unknown>;
    if (record.type === 'signal' && 'data' in record) {
      return record.data;
    }
  }
  return entry;
}

/** Extract discrete keys from a snapshot signal record — continuous keys are stripped. */
function discreteKeysFromRecord(record: Record<string, unknown>): Record<string, unknown> {
  const discrete: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    const source = inputToSource(key);
    const kind = source ? signalSourceKind(source) : signalPayloadKind({ [key]: value });
    if (kind === 'discrete') {
      discrete[key] = value;
    }
  }
  return discrete;
}

/** Extract replayable discrete signal payloads from a snapshot `signals` field. */
export function filterDiscreteSnapshotSignals(signals: unknown): readonly unknown[] {
  if (signals === null || signals === undefined) {
    return [];
  }

  if (Array.isArray(signals)) {
    const discrete: unknown[] = [];
    for (const rawEntry of signals) {
      const entry = unwrapSnapshotSignalEntry(rawEntry);
      if (entry !== null && typeof entry === 'object' && !Array.isArray(entry)) {
        const stripped = discreteKeysFromRecord(entry as Record<string, unknown>);
        if (Object.keys(stripped).length > 0) {
          discrete.push(stripped);
        }
        continue;
      }
      if (signalPayloadKind(entry) === 'discrete') {
        discrete.push(entry);
      }
    }
    return discrete;
  }

  if (typeof signals === 'object') {
    const discrete: unknown[] = [];
    for (const [key, value] of Object.entries(signals as Record<string, unknown>)) {
      const source = inputToSource(key);
      const kind = source ? signalSourceKind(source) : signalPayloadKind({ [key]: value });
      if (kind === 'discrete') {
        discrete.push({ [key]: value });
      }
    }
    return discrete;
  }

  return signalPayloadKind(signals) === 'discrete' ? [signals] : [];
}

/**
 * Validate the snapshot `signals` field before graph-native recovery applies HTML.
 * Returns an error message when the field is missing or not an object/array.
 */
export function validateSnapshotSignalsField(signals: unknown): string | null {
  if (signals === undefined || signals === null) {
    return 'snapshot response missing required signals field';
  }
  if (typeof signals !== 'object') {
    return 'snapshot response signals must be an object or array';
  }
  return null;
}
