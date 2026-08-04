import { describe, it, expect } from 'vitest';
import { computeWaveform, WaveformProjection, defineAsset, AssetRegistry } from '@liteship/assets';

const registry = AssetRegistry.make([defineAsset({ id: 'intro-bed', source: 'intro-bed.wav', kind: 'audio' })]);

/**
 * The projection invariants under test bind their input as `_i` — every one
 * reads ONLY the output. An empty buffer is therefore a faithful stand-in for
 * "the input is irrelevant here", and unlike `undefined` it is a value the
 * declared `ArrayBuffer` input can actually hold.
 */
const UNREAD_INPUT = new ArrayBuffer(0);

describe('WaveformProjection', () => {
  it('computeWaveform returns a normalized downsampled array', () => {
    const sampleRate = 48000;
    const samples = new Float32Array(sampleRate);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.sin((i / sampleRate) * 2 * Math.PI * 440) * 0.5;
    const wave = computeWaveform({ sampleRate, samples }, { bins: 100 });
    expect(wave.length).toBe(100);
    for (const v of wave) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('handles Int16Array sample buffers', () => {
    const sampleRate = 48000;
    const samples = new Int16Array(sampleRate);
    for (let i = 0; i < samples.length; i++) samples[i] = 10000;
    const wave = computeWaveform({ sampleRate, samples }, { bins: 16 });
    expect(wave.length).toBe(16);
  });

  it('returns all-zero bins for a silent buffer (max-RMS short circuit)', () => {
    const samples = new Float32Array(48000);
    const wave = computeWaveform({ sampleRate: 48000, samples }, { bins: 32 });
    expect(wave.length).toBe(32);
    // No normalization should run when maxRms === 0.
    for (const v of wave) expect(v).toBe(0);
  });

  it('clamps stride to 1 when bins exceed sample count', () => {
    const samples = new Float32Array(8);
    samples[0] = 1;
    samples[1] = -1;
    const wave = computeWaveform({ sampleRate: 48000, samples }, { bins: 64 });
    expect(wave.length).toBe(64);
  });

  it('WaveformProjection defaults to 512 bins when opts omitted', () => {
    const cap = WaveformProjection(registry, 'intro-bed');
    expect(cap.name).toBe('intro-bed:waveform:512');
  });

  it('computeWaveform defaults to 512 bins', () => {
    const samples = new Float32Array(1024);
    samples[0] = 1;
    const wave = computeWaveform({ sampleRate: 48000, samples });
    expect(wave.length).toBe(512);
  });

  it('WaveformProjection is a cachedProjection capsule with bin suffix in name', () => {
    const cap = WaveformProjection(registry, 'intro-bed', { bins: 512 });
    expect(cap._kind).toBe('cachedProjection');
    expect(cap.name).toBe('intro-bed:waveform:512');
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
    'refuses invalid bins %s before consulting the registry or minting a capsule',
    (bins) => {
      const untouched = {
        assertAudioRegistered: () => {
          throw new Error('registry must not run');
        },
      } as unknown as AssetRegistry;
      expect(() => WaveformProjection(untouched, 'missing', { bins })).toThrow(/positive safe integer/u);
    },
  );

  it('WaveformProjection invariants reject malformed output', () => {
    const cap = WaveformProjection(registry, 'intro-bed', { bins: 4 });
    const binInv = cap.invariants.find((i) => i.name === 'bin-count-matches');
    const normInv = cap.invariants.find((i) => i.name === 'values-normalized');
    expect(binInv).toBeDefined();
    expect(normInv).toBeDefined();
    expect(binInv!.check(UNREAD_INPUT, [0, 0, 0])).toBe(false);
    expect(binInv!.check(UNREAD_INPUT, [0, 0, 0, 0])).toBe(true);
    expect(normInv!.check(UNREAD_INPUT, [0, 0.5, 1, 1.5])).toBe(false);
    expect(normInv!.check(UNREAD_INPUT, [0, 0.5, 1, 0.25])).toBe(true);
  });
});
