import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  defineAsset,
  AssetRef,
  getAssetRegistry,
  builtinDecoderFor,
  builtinDecoderSiteFor,
  resolveAssetDecoder,
  audioDecoder,
  videoDecoder,
  imageDecoder,
  type DecodedAudio,
  type DecodedVideo,
} from '@czap/assets';
import { resetAssetRegistry } from '@czap/assets/testing';

/** Minimal mono PCM16 WAV (2 silent samples at 48 kHz) for decoder routing checks. */
function minimalWav(): ArrayBuffer {
  const bytes = new Uint8Array([
    0x52, 0x49, 0x46, 0x46, // "RIFF"
    0x28, 0x00, 0x00, 0x00, // chunk size
    0x57, 0x41, 0x56, 0x45, // "WAVE"
    0x66, 0x6d, 0x74, 0x20, // "fmt "
    0x10, 0x00, 0x00, 0x00, // subchunk1 size
    0x01, 0x00, 0x01, 0x00, // PCM, mono
    0x80, 0xbb, 0x00, 0x00, // 48000 Hz
    0x00, 0x77, 0x01, 0x00, // byte rate
    0x02, 0x00, 0x10, 0x00, // block align, bits per sample
    0x64, 0x61, 0x74, 0x61, // "data"
    0x04, 0x00, 0x00, 0x00, // data size
    0x00, 0x00, 0x00, 0x00, // 2 silent samples
  ]);
  return bytes.buffer;
}

describe('Asset capsule', () => {
  beforeEach(() => resetAssetRegistry());

  it('defineAsset registers an audio asset as a cachedProjection', () => {
    const a = defineAsset({
      id: 'intro-bed-test',
      source: 'intro-bed.wav',
      kind: 'audio',
      budgets: { decodeP95Ms: 50, memoryMb: 30 },
      invariants: [],
      attribution: { license: 'CC-BY-4.0', author: 'Test' },
    });
    expect(a._kind).toBe('cachedProjection');
    expect(a.name).toBe('intro-bed-test');
    expect(getAssetRegistry().has('intro-bed-test')).toBe(true);
  });

  it('AssetRef resolves to a registered id', () => {
    defineAsset({
      id: 'test-img',
      source: 'test.png',
      kind: 'image',
      budgets: { decodeP95Ms: 20 },
      invariants: [],
    });
    expect(AssetRef('test-img')).toBe('test-img');
  });

  it('AssetRef throws on unregistered id', () => {
    expect(() => AssetRef('nonexistent-123')).toThrow(/not registered/);
  });

  it('builtinDecoderFor maps media kinds to their decoders and analysis kinds to undefined', () => {
    expect(builtinDecoderFor('audio')).toBe(audioDecoder);
    expect(builtinDecoderFor('video')).toBe(videoDecoder);
    expect(builtinDecoderFor('image')).toBe(imageDecoder);
    expect(builtinDecoderFor('beat-markers')).toBeUndefined();
    expect(builtinDecoderFor('onsets')).toBeUndefined();
    expect(builtinDecoderFor('waveform')).toBeUndefined();
  });

  it('defineAsset wires the audio built-in as the derive handler when no decoder is declared', async () => {
    const a = defineAsset({
      id: 'default-audio-asset',
      source: 'default.wav',
      kind: 'audio',
      budgets: { decodeP95Ms: 50 },
      invariants: [],
    });
    expect(a.derive).toBeDefined();
    const decoded = (await a.derive!(minimalWav())) as DecodedAudio;
    expect(decoded.sampleRate).toBe(48000);
    expect(decoded.sampleCount).toBe(2);
  });

  it('defineAsset prefers a declared custom decoder over the kind built-in', async () => {
    const marker: DecodedAudio = {
      sampleRate: 1,
      channels: 1,
      bitsPerSample: 16,
      sampleCount: 0,
      samples: new Int16Array(0),
      durationMs: 0,
    };
    const a = defineAsset({
      id: 'custom-decoder-asset',
      source: 'custom.wav',
      kind: 'audio',
      decoder: async () => marker,
      budgets: { decodeP95Ms: 50 },
      invariants: [],
    });
    // An empty ArrayBuffer would make audioDecoder throw (no RIFF header) —
    // resolution to the marker proves the asset's OWN decoder ran.
    await expect(a.derive!(new ArrayBuffer(0))).resolves.toBe(marker);
  });

  it('defineAsset leaves derive undefined for analysis kinds (no built-in byte decoder)', () => {
    const a = defineAsset({
      id: 'analysis-kind-asset',
      source: 'beats.json',
      kind: 'beat-markers',
      budgets: { decodeP95Ms: 10 },
      invariants: [],
    });
    expect(a.derive).toBeUndefined();
  });

  it('declared site matches the built-in decoder runtime: builtin video is node-only', () => {
    // The video built-in shells out to ffprobe via node:child_process — a
    // capsule advertising 'browser' for it would lie to bundlers/routers.
    const v = defineAsset({
      id: 'builtin-video-asset',
      source: 'clip.mp4',
      kind: 'video',
      budgets: { decodeP95Ms: 100 },
      invariants: [],
    });
    expect(v.site).toEqual(['node']);
    expect(builtinDecoderSiteFor('video')).toEqual(['node']);
  });

  it('builtin audio/image decoders are byte-level, so their capsules keep browser in site', () => {
    const a = defineAsset({
      id: 'builtin-audio-site',
      source: 'bed.wav',
      kind: 'audio',
      budgets: { decodeP95Ms: 50 },
      invariants: [],
    });
    const i = defineAsset({
      id: 'builtin-image-site',
      source: 'cover.png',
      kind: 'image',
      budgets: { decodeP95Ms: 20 },
      invariants: [],
    });
    expect(a.site).toEqual(['node', 'browser']);
    expect(i.site).toEqual(['node', 'browser']);
    expect(builtinDecoderSiteFor('audio')).toEqual(['node', 'browser']);
    expect(builtinDecoderSiteFor('image')).toEqual(['node', 'browser']);
  });

  it('a custom video decoder keeps the permissive site — the declarer owns its runtime safety', () => {
    const decoded: DecodedVideo = { container: 'mp4' };
    const v = defineAsset({
      id: 'custom-video-site',
      source: 'clip.mp4',
      kind: 'video',
      decoder: async () => decoded,
      budgets: { decodeP95Ms: 100 },
      invariants: [],
    });
    expect(v.site).toEqual(['node', 'browser']);
  });

  it('video decoder module keeps node-only imports lazy (no top-level node: import)', () => {
    // Browser bundles reach decoders/video.ts through the package index; a
    // top-level `import ... from 'node:*'` would break them even when no
    // video asset is ever decoded. The node deps must load inside
    // videoDecoder() only.
    const src = readFileSync(
      resolve('packages/assets/src/decoders/video.ts'),
      'utf8',
    );
    expect(src).not.toMatch(/^import\s[^;]*['"]node:/m);
  });

  it('resolveAssetDecoder returns the registered capsule decoder and falls back to the audio built-in', async () => {
    const marker: DecodedAudio = {
      sampleRate: 2,
      channels: 1,
      bitsPerSample: 16,
      sampleCount: 0,
      samples: new Int16Array(0),
      durationMs: 0,
    };
    defineAsset({
      id: 'resolvable-asset',
      source: 'resolvable.wav',
      kind: 'audio',
      decoder: async () => marker,
      budgets: { decodeP95Ms: 50 },
      invariants: [],
    });
    await expect(resolveAssetDecoder('resolvable-asset')(new ArrayBuffer(0))).resolves.toBe(marker);
    // Unregistered id → audio built-in (the CLI's manifest-only processes
    // never import the scene's asset module, so this is today's behavior).
    const fallbackDecoded = (await resolveAssetDecoder('never-registered')(minimalWav())) as DecodedAudio;
    expect(fallbackDecoded.sampleRate).toBe(48000);
  });
});
