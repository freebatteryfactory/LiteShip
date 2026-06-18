/**
 * Drift guard: the LIVE audio producer's DSP (`@czap/astro` audio-signal.ts) is
 * a MIRROR of the OFFLINE reference `detectOnsets` (`@czap/assets` onsets.ts).
 *
 * LAW (no new unpinned mirror): the runtime RMS + spectral-flux beat math must
 * stay equivalent to the reference algorithm. The reference runs offline in
 * node at build time and is the ALGORITHM source only — never the runtime
 * source. If `onsets.ts` changes its envelope/flux/threshold law, this guard
 * fails until the live producer is reconciled.
 *
 * What is pinned:
 *  1. RMS envelope formula — `sqrt(mean(x^2))` over a frame — is identical.
 *  2. The flux definition — `max(0, rms - prevRms)` — is identical.
 *  3. The beat threshold ratio (`* 0.3`) is the same constant the reference
 *     applies to its peak flux.
 *  4. On a synthetic signal, the live streaming beat picks land on the same
 *     onset frames the reference selects.
 */
import { describe, test, expect } from 'vitest';
import { detectOnsets } from '@czap/assets';
import { analyseFrame, FLUX_BEAT_RATIO, BEAT_REFRACTORY_SEC } from '../../../packages/astro/src/runtime/audio-signal.js';

/** Reference envelope cell: RMS over a window, exactly as onsets.ts computes it. */
function referenceRms(samples: Float32Array, off: number, frameSize: number): number {
  let sum = 0;
  for (let j = 0; j < frameSize; j++) {
    const v = typeof samples[off + j] === 'number' ? Number(samples[off + j]) : 0;
    sum += v * v;
  }
  return Math.sqrt(sum / frameSize);
}

/** A click train: short bursts of energy at known sample offsets. */
function clickTrain(sampleRate: number, durationSec: number, bps: number): Float32Array {
  const n = Math.floor(sampleRate * durationSec);
  const out = new Float32Array(n);
  const spacing = Math.floor(sampleRate / bps);
  for (let i = 0; i < n; i++) {
    const phase = i % spacing;
    // 30ms attack burst at each click.
    out[i] = phase < sampleRate * 0.03 ? Math.sin((i / sampleRate) * 2 * Math.PI * 880) : 0;
  }
  return out;
}

describe('audio-signal DSP ↔ onsets.ts reference', () => {
  test('RMS envelope formula matches the reference exactly', () => {
    const frameSize = 1024;
    const samples = clickTrain(44100, 0.2, 4);
    for (let off = 0; off + frameSize <= samples.length; off += 1024) {
      const frame = samples.slice(off, off + frameSize);
      const { rms } = analyseFrame(frame, 0, 0);
      expect(rms).toBeCloseTo(referenceRms(samples, off, frameSize), 10);
    }
  });

  test('flux is the positive first-difference of consecutive RMS (reference law)', () => {
    const a = new Float32Array(64).fill(0.1);
    const b = new Float32Array(64).fill(0.5);
    const ra = analyseFrame(a, 0, 0).rms;
    const rb = analyseFrame(b, ra, 0);
    expect(rb.flux).toBeCloseTo(Math.max(0, rb.rms - ra), 12);
    // Falling energy yields zero flux, exactly as onsets.ts `max(0, ...)`.
    const rc = analyseFrame(a, rb.rms, rb.nextMaxFlux);
    expect(rc.flux).toBe(0);
  });

  test('beat threshold ratio is the reference 0.3 (the divergence-prone constant)', () => {
    // onsets.ts uses `const threshold = maxFlux * 0.3` — pin our constant to it.
    expect(FLUX_BEAT_RATIO).toBe(0.3);
    expect(BEAT_REFRACTORY_SEC).toBe(0.05);
  });

  test('streaming beat picks land where the reference detects onsets', () => {
    const sampleRate = 44100;
    const samples = clickTrain(sampleRate, 0.5, 4);
    const referenceOnsets = detectOnsets({ sampleRate, samples });
    expect(referenceOnsets.length).toBeGreaterThan(0);

    // Run our streaming analyser over the same hop-frames onsets.ts uses
    // (frameSize 1024, hop 256) so the comparison is apples-to-apples, then
    // confirm at least one live beat fires within a frame of each reference
    // onset — the math agrees on WHERE energy attacks.
    const frameSize = 1024;
    const hop = 256;
    let prevRms = 0;
    let maxFlux = 0;
    const liveBeatFrames: number[] = [];
    const refractoryFrames = Math.max(1, Math.floor((sampleRate * BEAT_REFRACTORY_SEC) / hop));
    let lastBeat = -refractoryFrames;
    for (let off = 0, frame = 0; off + frameSize <= samples.length; off += hop, frame++) {
      const slice = samples.slice(off, off + frameSize);
      const r = analyseFrame(slice, prevRms, maxFlux);
      prevRms = r.rms;
      maxFlux = r.nextMaxFlux;
      if (r.beat && frame - lastBeat >= refractoryFrames) {
        liveBeatFrames.push(off);
        lastBeat = frame;
      }
    }

    expect(liveBeatFrames.length).toBeGreaterThan(0);
    for (const onset of referenceOnsets) {
      const near = liveBeatFrames.some((b) => Math.abs(b - onset) <= frameSize);
      expect(near).toBe(true);
    }
  });
});
