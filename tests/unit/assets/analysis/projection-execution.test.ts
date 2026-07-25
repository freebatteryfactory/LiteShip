import { describe, expect, it } from 'vitest';
import {
  AssetRegistry,
  BeatMarkerProjection,
  OnsetProjection,
  WaveformProjection,
  defineAsset,
  type DecodedAudio,
} from '@liteship/assets';

function audioFixture(): DecodedAudio {
  const channels = 2;
  const frames = 4_096;
  const samples = new Float32Array(frames * channels);
  for (let frame = 2_048; frame < frames; frame++) {
    samples[frame * channels] = 1;
    samples[frame * channels + 1] = 1;
  }
  return {
    sampleRate: 48_000,
    channels,
    bitsPerSample: 32,
    sampleCount: frames,
    samples,
    durationMs: (frames / 48_000) * 1_000,
  };
}

describe('asset analysis projection execution', () => {
  it('all three projections execute through the registered custom audio decoder', async () => {
    const decoded = audioFixture();
    let calls = 0;
    const asset = defineAsset({
      id: 'custom-audio',
      source: 'custom.audio',
      kind: 'audio',
      decoder: async () => {
        calls++;
        return decoded;
      },
    });
    const registry = AssetRegistry.make([asset]);
    const bytes = new ArrayBuffer(1);
    const beat = BeatMarkerProjection(registry, 'custom-audio');
    const onset = OnsetProjection(registry, 'custom-audio');
    const waveform = WaveformProjection(registry, 'custom-audio', { bins: 16 });

    expect(beat.derive).toBeTypeOf('function');
    expect(onset.derive).toBeTypeOf('function');
    expect(waveform.derive).toBeTypeOf('function');
    await expect(beat.derive!(bytes)).resolves.toMatchObject({ bpm: expect.any(Number), beats: expect.any(Array) });
    await expect(onset.derive!(bytes)).resolves.toEqual(expect.any(Array));
    await expect(waveform.derive!(bytes)).resolves.toHaveLength(16);
    expect(calls).toBe(3);
  });

  it('refuses registered non-audio assets before constructing an analysis capsule', () => {
    const registry = AssetRegistry.make([defineAsset({ id: 'cover', source: 'cover.png', kind: 'image' })]);
    expect(() => BeatMarkerProjection(registry, 'cover')).toThrow(/requires a registered audio asset/);
    expect(() => OnsetProjection(registry, 'cover')).toThrow(/requires a registered audio asset/);
    expect(() => WaveformProjection(registry, 'cover')).toThrow(/requires a registered audio asset/);
  });
});
