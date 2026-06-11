/**
 * SyncSystem — reads beat markers from the ECS world (entities tagged
 * with a `Beat` component, populated by the `scene.beat-binding`
 * sceneComposition capsule at runtime build time) and computes
 * exponential-decay intensity on each entity matching `SyncAnchor`.
 *
 * Pre-Task-9 this system read a closure-private `_beats` field that
 * was always empty because nothing wired BeatMarkerProjection output
 * into the world. Now: real query, real ECS data flow, no sidecar.
 *
 * **Envelope composition** — an effect track may declare BOTH
 * `syncTo` (→ `SyncAnchor` component) and `envelope` (→ `Envelope`
 * component). The runtime runs EffectSystem before SyncSystem, so a
 * plain overwrite here would clobber the envelope's contribution
 * (Codex P2 finding). Spec 1 §5.4 treats envelopes as automation
 * curves that modulate a value rather than race it, so when the
 * SyncAnchor entity also carries `Envelope` + `FrameRange`, this
 * system composes multiplicatively: **sync sets the base intensity
 * (beat decay), the envelope multiplies it** via
 * {@link envelopeFactor}. Entities without an envelope keep the plain
 * decay write, and an envelope without a `FrameRange` (no span to
 * evaluate against) degrades gracefully to plain decay.
 *
 * @module
 */

import { Effect } from 'effect';
import type { System, World } from '@czap/core';
import type { ResolvedEnvelope } from '../sugar/envelope.js';
import { envelopeFactor } from '../sugar/envelope.js';

/** Decay time-constant in ms — controls how fast intensity falls off after a beat. */
const DECAY_TAU_MS = 250;

/**
 * Build a SyncSystem keyed to a frame index. Resolves the current scene
 * time from `frameIndex / fps`, queries the world for `Beat`-tagged
 * entities, picks the most recent beat at-or-before the current time,
 * and writes `_intensity = exp(-msSinceBeat / 250)` onto every
 * SyncAnchor entity. When the entity also carries `Envelope` +
 * `FrameRange` components (an effect track declaring both `syncTo`
 * and `envelope`), the decay is multiplied by the envelope factor —
 * sync sets the base, the envelope modulates it (see module docblock).
 *
 * @param frameIndex — current frame number, supplied by the runtime per tick
 * @param fps        — scene frames per second; defaults to 60 for parity with VideoSystem
 */
export function SyncSystem(frameIndex: number, fps: number = 60): System {
  return {
    name: 'SyncSystem',
    query: ['SyncAnchor'],
    execute: (entities, world?: World.Shape) =>
      Effect.gen(function* () {
        // Pull beat entities from the world. SyncSystem's contract is
        // "react to beats in the world" — when no world is supplied
        // (legacy callers, isolated unit tests) we degrade gracefully
        // to no decay rather than throw.
        const beatEntities = world !== undefined ? yield* world.query('Beat') : [];

        // Extract beat timestamps in ms. The Beat component is the flat
        // BeatBinding.Component shape ({ kind, timeMs, strength, ... })
        // written by scene.beat-binding — see packages/scene/src/capsules/beat-binding.ts.
        const beatTimesMs: number[] = [];
        for (const e of beatEntities) {
          const beat = e.components.get('Beat');
          if (beat === undefined) continue;
          const t = (beat as { timeMs?: unknown }).timeMs;
          if (typeof t === 'number' && Number.isFinite(t)) beatTimesMs.push(t);
        }
        // Sort ascending — beat-binding preserves input order but a
        // user-provided beat array might not be sorted.
        beatTimesMs.sort((a, b) => a - b);

        const currentTimeMs = (frameIndex / fps) * 1000;
        // Last beat at-or-before now. Linear scan is fine — beat counts
        // are tiny relative to per-frame budget; sorted-binary-search
        // optimization waits for a future ADR-driven hot-path pass.
        let lastBeat = -Infinity;
        for (const t of beatTimesMs) {
          if (t <= currentTimeMs) lastBeat = t;
          else break;
        }
        const msSinceBeat = currentTimeMs - lastBeat;
        const decay = Number.isFinite(msSinceBeat) ? Math.exp(-msSinceBeat / DECAY_TAU_MS) : 0;

        for (const e of entities) {
          // Compose with a declared envelope instead of clobbering it:
          // sync decay is the base intensity, the envelope multiplies
          // it (Spec 1 §5.4 — envelopes modulate, they don't race).
          // Without a FrameRange there is no span to evaluate the
          // envelope against, so we fall back to plain decay.
          const env = e.components.get('Envelope') as ResolvedEnvelope | undefined;
          const range = e.components.get('FrameRange') as { from: number; to: number } | undefined;
          const intensity =
            env !== undefined && range !== undefined ? decay * envelopeFactor(env, frameIndex, range) : decay;
          // Direct property write preserves the legacy in-place mutation
          // path used by some downstream tests; setComponent persists
          // through the canonical world-state map for query consumers.
          (e as unknown as { _intensity: number })._intensity = intensity;
          if (world !== undefined) {
            yield* world.setComponent(e.id, '_intensity', intensity);
          }
        }
      }),
  };
}
