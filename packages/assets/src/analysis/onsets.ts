/**
 * OnsetProjection — cachedProjection that detects note-attack onsets
 * in a decoded audio asset via positive energy-envelope flux peaks.
 * Reference implementation; this is deliberately not a spectral transform.
 *
 * @module
 */

import { defineCapsule, schema } from '@liteship/core';
import type { CapsuleDef } from '@liteship/core';
import { AssetBytes, type AssetRegistry } from '../contract.js';
import { analysisFrames } from './audio-input.js';

/** Detect note-attack onsets as an ordered array of sample indices. */
export function detectOnsets(audio: {
  sampleRate: number;
  channels?: number;
  samples: Float32Array | Int16Array;
}): readonly number[] {
  const samples = analysisFrames(audio, 'detectOnsets');
  const frameSize = 1024;
  const hop = 256;
  // Clamp to zero for clips shorter than one frame.
  const envLen = samples.length < frameSize ? 0 : Math.floor((samples.length - frameSize) / hop) + 1;
  if (envLen === 0) return [];
  const envelope = new Float32Array(envLen);
  for (let i = 0; i < envLen; i++) {
    let sum = 0;
    const off = i * hop;
    for (let j = 0; j < frameSize; j++) {
      const v = Number(samples[off + j]);
      sum += v * v;
    }
    envelope[i] = Math.sqrt(sum / frameSize);
  }

  const flux = new Float32Array(envLen);
  for (let i = 1; i < envLen; i++) {
    flux[i] = Math.max(0, envelope[i]! - envelope[i - 1]!);
  }

  let maxFlux = 0;
  for (let i = 0; i < envLen; i++) if (flux[i]! > maxFlux) maxFlux = flux[i]!;
  if (maxFlux <= 0) return [];
  const threshold = maxFlux * 0.3;

  const onsets: number[] = [];
  const refractory = Math.max(1, Math.floor((audio.sampleRate * 0.05) / hop));
  let lastOnsetFrame = -refractory;
  for (let i = 0; i < envLen; i++) {
    if (flux[i]! >= threshold && i - lastOnsetFrame >= refractory) {
      onsets.push(i * hop);
      lastOnsetFrame = i;
    }
  }
  return onsets;
}

/**
 * Build an OnsetProjection cachedProjection capsule for a named audio asset,
 * validated against the explicit {@link AssetRegistry} the caller assembled.
 */
export function OnsetProjection(
  registry: AssetRegistry,
  audioAssetId: string,
): CapsuleDef<'cachedProjection', ArrayBuffer, readonly number[], unknown> {
  registry.assertAudioRegistered(audioAssetId, 'OnsetProjection');
  const decode = registry.resolveAudioDecoder(audioAssetId);
  return defineCapsule({
    _kind: 'cachedProjection',
    name: `${audioAssetId}:onsets`,
    input: AssetBytes,
    output: schema.array(schema.number),
    derive: async (bytes: ArrayBuffer): Promise<readonly number[]> => detectOnsets(await decode(bytes)),
    capabilities: { reads: [`asset:${audioAssetId}`], writes: [] },
    invariants: [
      {
        name: 'onsets-ordered',
        check: (_i, o) => {
          for (let i = 1; i < o.length; i++) if (o[i]! <= o[i - 1]!) return false;
          return true;
        },
        message: 'onsets must be strictly increasing',
      },
    ],
    budgets: { p95Ms: 200 },
    site: ['node'],
  });
}
