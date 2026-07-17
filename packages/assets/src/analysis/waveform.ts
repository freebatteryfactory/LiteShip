/**
 * WaveformProjection — cachedProjection that emits a downsampled
 * RMS-per-bin waveform from a decoded audio asset. Useful for the
 * dev-mode scrubber and visual waveform displays.
 *
 * @module
 */

import { defineCapsule, S } from '@czap/core';
import type { CapsuleDef } from '@czap/core';
import type { AssetRegistry } from '../contract.js';

/** Compute a normalized RMS-per-bin waveform. */
export function computeWaveform(
  audio: { sampleRate: number; samples: Float32Array | Int16Array },
  opts: { bins?: number } = {},
): readonly number[] {
  const bins = opts.bins ?? 512;
  const out: number[] = new Array(bins).fill(0);
  const stride = Math.max(1, Math.floor(audio.samples.length / bins));
  let maxRms = 0;
  for (let b = 0; b < bins; b++) {
    let sum = 0;
    let count = 0;
    const start = b * stride;
    const end = Math.min(audio.samples.length, start + stride);
    for (let i = start; i < end; i++) {
      const v = typeof audio.samples[i] === 'number' ? Number(audio.samples[i]) : 0;
      sum += v * v;
      count++;
    }
    const rms = count > 0 ? Math.sqrt(sum / count) : 0;
    out[b] = rms;
    if (rms > maxRms) maxRms = rms;
  }
  if (maxRms > 0) for (let b = 0; b < bins; b++) out[b] = out[b]! / maxRms;
  return out;
}

/**
 * Build a WaveformProjection cachedProjection capsule for a named audio asset,
 * validated against the explicit {@link AssetRegistry} the caller assembled.
 */
export function WaveformProjection(
  registry: AssetRegistry,
  audioAssetId: string,
  opts: { bins?: number } = {},
): CapsuleDef<'cachedProjection', unknown, readonly number[], unknown> {
  registry.assertAudioRegistered(audioAssetId, 'WaveformProjection');
  const bins = opts.bins ?? 512;
  return defineCapsule({
    _kind: 'cachedProjection',
    name: `${audioAssetId}:waveform:${bins}`,
    input: S.unknown,
    output: S.array(S.number),
    capabilities: { reads: [`asset:${audioAssetId}`], writes: [] },
    invariants: [
      {
        name: 'bin-count-matches',
        check: (_i, o) => o.length === bins,
        message: `waveform must emit exactly ${bins} bins`,
      },
      {
        name: 'values-normalized',
        check: (_i, o) => o.every((v) => v >= 0 && v <= 1),
        message: 'waveform values must be in [0, 1]',
      },
    ],
    budgets: { p95Ms: 100 },
    site: ['node', 'browser'],
  });
}
