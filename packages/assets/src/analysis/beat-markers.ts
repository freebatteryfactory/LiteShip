/**
 * BeatMarkerProjection — cachedProjection capsule deriving beat markers
 * from a decoded audio asset via autocorrelation on the short-time
 * energy envelope. Reference implementation — users can plug in a more
 * sophisticated analyzer by defining their own cachedProjection capsule
 * with the same input/output shape.
 *
 * @module
 */

import { Schema } from 'effect';
import { defineCapsule } from '@czap/core';
import type { CapsuleDef } from '@czap/core';
import { AssetBytes, type AssetRegistry } from '../contract.js';
import { audioDecoder } from '../decoders/audio.js';
import type { BeatMarkerSet as _BeatMarkerSet } from '@czap/_spine';

/**
 * Detected beat markers + overall BPM estimate — the raw asset/sample-space
 * projection carried by the `asset:beats` capability. Aliased to the canonical
 * spine contract (CUT A5) so the shape lives in exactly one place; `@czap/scene`
 * consumes the same family via {@link BeatMarkerSet}'s sibling `BeatComponent`.
 */
export type BeatMarkerSet = _BeatMarkerSet;

/** Detect downbeats on a decoded audio buffer. */
export function detectBeats(audio: { sampleRate: number; samples: Float32Array | Int16Array }): BeatMarkerSet {
  const frameSize = 1024;
  const hop = 256;
  // Clamp to zero for clips shorter than one frame so we return an empty
  // result instead of throwing on a negative typed-array length.
  const envLen = Math.max(0, Math.floor((audio.samples.length - frameSize) / hop));
  if (envLen === 0) return { bpm: 0, beats: [] };
  const envelope = new Float32Array(envLen);
  for (let i = 0; i < envLen; i++) {
    let sum = 0;
    const off = i * hop;
    for (let j = 0; j < frameSize; j++) {
      const v = typeof audio.samples[off + j] === 'number' ? Number(audio.samples[off + j]) : 0;
      sum += v * v;
    }
    envelope[i] = Math.sqrt(sum / frameSize);
  }

  const minLag = Math.max(1, Math.floor((audio.sampleRate * 60) / 200 / hop));
  const maxLag = Math.floor((audio.sampleRate * 60) / 60 / hop);
  let bestLag = minLag;
  let bestCorr = 0;
  for (let lag = minLag; lag < maxLag && lag < envelope.length; lag++) {
    let corr = 0;
    for (let i = 0; i + lag < envelope.length; i++) corr += envelope[i]! * envelope[i + lag]!;
    if (corr > bestCorr) {
      bestCorr = corr;
      bestLag = lag;
    }
  }

  const bpm = (audio.sampleRate * 60) / (bestLag * hop);
  const beatSpacing = bestLag * hop;
  const beats: number[] = [];
  const maxEnv = envelopeMax(envelope);
  const threshold = maxEnv * 0.4;
  for (let i = 0; i < audio.samples.length; i += beatSpacing) {
    const envIdx = Math.floor(i / hop);
    if (envIdx < envelope.length && envelope[envIdx]! >= threshold) beats.push(i);
  }
  return { bpm, beats };
}

function envelopeMax(env: Float32Array): number {
  let m = 0;
  for (let i = 0; i < env.length; i++) if (env[i]! > m) m = env[i]!;
  return m;
}

const BeatMarkerSetSchema = Schema.Struct({
  bpm: Schema.Number,
  beats: Schema.Array(Schema.Number),
});

/**
 * Build a BeatMarkerProjection cachedProjection capsule for a named audio
 * asset, validated against the explicit {@link AssetRegistry} the caller
 * assembled (no module-global lookup).
 */
export function BeatMarkerProjection(
  registry: AssetRegistry,
  audioAssetId: string,
): CapsuleDef<'cachedProjection', ArrayBuffer, BeatMarkerSet, unknown> {
  registry.assertAudioRegistered(audioAssetId, 'BeatMarkerProjection');
  return defineCapsule({
    _kind: 'cachedProjection',
    name: `${audioAssetId}:beats`,
    // Derives from the asset's raw WAV bytes: decode to samples (audioDecoder)
    // then autocorrelate the energy envelope (detectBeats). Both steps are
    // pure and deterministic over identical bytes, so the content-addressed
    // cache-hit / invalidation probes hold. Declaration-tagged byte schema
    // (shared with the asset decl) — random-source property test self-skips
    // honestly; the canonical `.wav` fixture drives the real derive.
    input: AssetBytes as unknown as Schema.Schema<ArrayBuffer>,
    output: BeatMarkerSetSchema,
    derive: async (bytes: ArrayBuffer): Promise<BeatMarkerSet> => detectBeats(await audioDecoder(bytes)),
    capabilities: { reads: [`asset:${audioAssetId}`], writes: [] },
    invariants: [
      {
        name: 'beats-ordered',
        check: (_i, o) => {
          const set = o as BeatMarkerSet;
          for (let i = 1; i < set.beats.length; i++) if (set.beats[i]! <= set.beats[i - 1]!) return false;
          return true;
        },
        message: 'beats must be strictly increasing sample indices',
      },
      {
        name: 'bpm-in-range',
        check: (_i, o) => {
          const set = o as BeatMarkerSet;
          if (set.beats.length === 0) return set.bpm === 0;
          return set.bpm >= 40 && set.bpm <= 240;
        },
        message: 'empty beat sets must report BPM 0; non-empty detected BPM must lie in [40, 240]',
      },
    ],
    budgets: { p95Ms: 200 },
    site: ['node'],
  });
}
