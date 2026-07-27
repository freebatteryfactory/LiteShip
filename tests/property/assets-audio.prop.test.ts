import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { audioDecoder, computeWaveform, detectBeats, detectOnsets } from '@liteship/assets';
import { buildRawWav, buildSampleWav, encodeWavSamples, makeRiffChunk } from '../support/wav-fixtures.js';
import type { SupportedSampleEncoding } from '../support/wav-fixtures.js';

const encodings: readonly SupportedSampleEncoding[] = ['pcm8', 'pcm16', 'pcm24', 'pcm32', 'float32'];

function deterministicSamples(count: number): readonly number[] {
  return Array.from({ length: count }, (_, index) => (((index * 37 + 11) % 199) - 99) / 100);
}

function toleranceFor(encoding: SupportedSampleEncoding): number {
  switch (encoding) {
    case 'pcm8':
      return 1 / 64;
    case 'pcm16':
      return 1 / 16_000;
    case 'pcm24':
      return 1 / 4_000_000;
    case 'pcm32':
      return 1 / 1_000_000;
    case 'float32':
      return 1 / 1_000_000;
  }
}

describe('asset audio laws', () => {
  it('round-trips every supported encoding across generated channel/frame shapes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...encodings),
        fc.integer({ min: 1, max: 4 }),
        fc.integer({ min: 0, max: 64 }),
        fc.integer({ min: 8_000, max: 192_000 }),
        async (encoding, channels, frames, sampleRate) => {
          const expected = deterministicSamples(channels * frames);
          const decoded = await audioDecoder(buildSampleWav(encoding, expected, { channels, sampleRate }));
          expect(decoded.channels).toBe(channels);
          expect(decoded.sampleRate).toBe(sampleRate);
          expect(decoded.sampleCount).toBe(frames);
          expect(decoded.samples).toHaveLength(expected.length);
          expect(decoded.durationMs).toBeCloseTo((frames / sampleRate) * 1_000, 8);
          const tolerance = toleranceFor(encoding);
          for (let index = 0; index < expected.length; index++) {
            const actual = Number(decoded.samples[index]);
            const normalized = decoded.samples instanceof Int16Array ? actual / 0x8000 : actual;
            expect(Math.abs(normalized - (expected[index] ?? 0))).toBeLessThanOrEqual(tolerance);
          }
        },
      ),
      { numRuns: 250 },
    );
  });

  it('unknown aligned chunks and their ordering do not change decoded PCM semantics', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uint8Array({ maxLength: 31 }),
        fc.uint8Array({ maxLength: 31 }),
        async (beforeFormat, beforeData) => {
          const data = encodeWavSamples('pcm16', deterministicSamples(16));
          const plain = await audioDecoder(buildRawWav({ data }));
          const reordered = await audioDecoder(
            buildRawWav({
              data,
              chunksBeforeFormat: [makeRiffChunk('JUNK', beforeFormat)],
              chunksBeforeData: [makeRiffChunk('NOTE', beforeData)],
            }),
          );
          expect(reordered.sampleRate).toBe(plain.sampleRate);
          expect(reordered.channels).toBe(plain.channels);
          expect([...reordered.samples]).toEqual([...plain.samples]);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('waveform normalization is sign-invariant and covers remainder samples', () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: -1, max: 1, noNaN: true }), { minLength: 1, maxLength: 2_048 }),
        (values) => {
          const samples = Float32Array.from(values);
          const negated = Float32Array.from(values, (value) => -value);
          const bins = Math.min(64, samples.length);
          expect(computeWaveform({ sampleRate: 48_000, samples }, { bins })).toEqual(
            computeWaveform({ sampleRate: 48_000, samples: negated }, { bins }),
          );
        },
      ),
      { numRuns: 250 },
    );

    const remainder = new Float32Array(10);
    remainder[9] = 1;
    expect(computeWaveform({ sampleRate: 48_000, samples: remainder }, { bins: 4 }).at(-1)).toBe(1);
  });

  it('analysis kernels are deterministic, bounded, and silent input stays silent', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 32_768 }), (length) => {
        const samples = new Float32Array(length);
        expect(detectOnsets({ sampleRate: 48_000, samples })).toEqual([]);
        expect(detectBeats({ sampleRate: 48_000, samples })).toEqual({ bpm: 0, beats: [] });
        const waveform = computeWaveform({ sampleRate: 48_000, samples }, { bins: 32 });
        expect(waveform).toHaveLength(32);
        expect(waveform.every((value) => value === 0)).toBe(true);
      }),
      { numRuns: 200 },
    );
  });

  it('keeps detected pulse BPM inside the capsule invariant across supported sample rates', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(8_000, 11_025, 16_000, 22_050, 44_100, 48_000, 96_000),
        fc.constantFrom(60, 90, 120, 180),
        (sampleRate, targetBpm) => {
          const spacing = Math.round((sampleRate * 60) / targetBpm);
          const pulseWidth = Math.max(1, Math.floor(sampleRate * 0.04));
          const samples = new Float32Array(sampleRate * 8);
          for (let index = 0; index < samples.length; index += 1) {
            samples[index] = index % spacing < pulseWidth ? 0.9 : 0.01;
          }
          const result = detectBeats({ sampleRate, samples });
          expect(result.beats.length).toBeGreaterThan(0);
          expect(result.bpm).toBeGreaterThanOrEqual(40);
          expect(result.bpm).toBeLessThanOrEqual(240);
        },
      ),
      { numRuns: 80, seed: 0x41535345 },
    );
  });

  it('interleaved identical channels preserve the mono frame-domain result', () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: -1, max: 1, noNaN: true }), { minLength: 1_024, maxLength: 4_096 }),
        (values) => {
          const mono = Float32Array.from(values);
          const stereo = new Float32Array(mono.length * 2);
          for (let frame = 0; frame < mono.length; frame++) {
            stereo[frame * 2] = mono[frame]!;
            stereo[frame * 2 + 1] = mono[frame]!;
          }
          expect(computeWaveform({ sampleRate: 48_000, samples: mono }, { bins: 32 })).toEqual(
            computeWaveform({ sampleRate: 48_000, channels: 2, samples: stereo }, { bins: 32 }),
          );
          expect(detectOnsets({ sampleRate: 48_000, samples: mono })).toEqual(
            detectOnsets({ sampleRate: 48_000, channels: 2, samples: stereo }),
          );
          expect(detectBeats({ sampleRate: 48_000, samples: mono })).toEqual(
            detectBeats({ sampleRate: 48_000, channels: 2, samples: stereo }),
          );
        },
      ),
      { numRuns: 50 },
    );
  });
});
