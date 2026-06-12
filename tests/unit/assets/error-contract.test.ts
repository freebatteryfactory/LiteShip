/**
 * @czap/assets error contract — registry misses, decoder failures, and RIFF
 * walker diagnostics name the subject and the literal next step.
 *
 * @module
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  defineAsset,
  AssetRef,
  audioDecoder,
  videoDecoder,
  walkRiff,
  BeatMarkerProjection,
  OnsetProjection,
  WaveformProjection,
  WavMetadataProjection,
  defaultDecodeP95MsFor,
} from '@czap/assets';
import { resetAssetRegistry } from '@czap/assets/testing';

function registerIntroBed(): void {
  defineAsset({
    id: 'intro-bed',
    source: 'examples/scenes/intro-bed.wav',
    kind: 'audio',
  });
}

describe('registry-miss (#160, #158)', () => {
  beforeEach(() => resetAssetRegistry());

  it('AssetRef lists sorted registered ids and an import-order hint', () => {
    defineAsset({ id: 'zebra', source: 'z.wav', kind: 'audio' });
    defineAsset({ id: 'alpha', source: 'a.wav', kind: 'audio' });
    expect(() => AssetRef('missing-id')).toThrow(
      /registry-miss.*missing-id.*Registered ids: alpha, zebra.*defineAsset\('missing-id'/s,
    );
  });

  it('BeatMarkerProjection throws registry-miss when the audio asset is not registered', () => {
    expect(() => BeatMarkerProjection('intro-bed')).toThrow(/registry-miss.*intro-bed.*Registered ids: \(none\)/);
    registerIntroBed();
    expect(() => BeatMarkerProjection('intro-bed')).not.toThrow();
  });

  it('OnsetProjection, WaveformProjection, and WavMetadataProjection validate at construction', () => {
    expect(() => OnsetProjection('x')).toThrow(/registry-miss/);
    expect(() => WaveformProjection('x')).toThrow(/registry-miss/);
    expect(() => WavMetadataProjection('x')).toThrow(/registry-miss/);
    registerIntroBed();
    expect(OnsetProjection('intro-bed').name).toBe('intro-bed:onsets');
    expect(WaveformProjection('intro-bed').name).toBe('intro-bed:waveform:512');
    expect(WavMetadataProjection('intro-bed').name).toBe('intro-bed:wav-metadata');
  });
});

describe('defineAsset DX defaults (#153, #155, #159)', () => {
  beforeEach(() => resetAssetRegistry());

  it('omitted invariants default to []', () => {
    const cap = defineAsset({
      id: 'no-invariants',
      source: 'bed.wav',
      kind: 'audio',
    });
    expect(cap.invariants).toEqual([]);
  });

  it('omitted decodeP95Ms uses per-kind defaults', () => {
    expect(defineAsset({ id: 'a', source: 'a.wav', kind: 'audio' }).budgets.p95Ms).toBe(defaultDecodeP95MsFor('audio'));
    expect(defineAsset({ id: 'b', source: 'b.json', kind: 'beat-markers' }).budgets.p95Ms).toBe(200);
    expect(defineAsset({ id: 'w', source: 'w.json', kind: 'waveform' }).budgets.p95Ms).toBe(100);
  });

  it('defineAsset returns a typed cachedProjection capsule for audio', async () => {
    const cap = defineAsset({
      id: 'typed-audio',
      source: 'bed.wav',
      kind: 'audio',
    });
    expect(cap._kind).toBe('cachedProjection');
    expect(cap.derive).toBeDefined();
  });
});

describe('audioDecoder teaching errors (#161, #162)', () => {
  it('no data chunk lists chunk ids present and the pcm_s16le re-export step', async () => {
    const enc = new TextEncoder();
    const fmtData = new Uint8Array(16);
    new DataView(fmtData.buffer).setUint16(0, 1, true);
    new DataView(fmtData.buffer).setUint16(14, 16, true);
    const fmtChunk = (() => {
      const out = new Uint8Array(8 + fmtData.length);
      out.set(enc.encode('fmt '), 0);
      new DataView(out.buffer).setUint32(4, fmtData.length, true);
      out.set(fmtData, 8);
      return out;
    })();
    const wave = enc.encode('WAVE');
    const body = new Uint8Array(wave.length + fmtChunk.length);
    body.set(wave, 0);
    body.set(fmtChunk, wave.length);
    const riff = new Uint8Array(8 + body.length);
    riff.set(enc.encode('RIFF'), 0);
    new DataView(riff.buffer).setUint32(4, body.length, true);
    riff.set(body, 8);
    await expect(audioDecoder(riff.buffer)).rejects.toThrow(/no data chunk.*fmt .*pcm_s16le/s);
  });

  it('unsupported-format names the found format and enumerates supported combos', async () => {
    const enc = new TextEncoder();
    function u32le(n: number): Uint8Array {
      const out = new Uint8Array(4);
      new DataView(out.buffer).setUint32(0, n, true);
      return out;
    }
    function concat(...parts: Uint8Array[]): Uint8Array {
      const total = parts.reduce((sum, p) => sum + p.byteLength, 0);
      const out = new Uint8Array(total);
      let off = 0;
      for (const p of parts) {
        out.set(p, off);
        off += p.byteLength;
      }
      return out;
    }
    function chunk(id: string, payload: Uint8Array): Uint8Array {
      return concat(enc.encode(id), u32le(payload.byteLength), payload);
    }
    const fmtData = new Uint8Array(16);
    const dv = new DataView(fmtData.buffer);
    dv.setUint16(0, 65534, true);
    dv.setUint16(14, 16, true);
    const dataPayload = new Uint8Array(4);
    const fmtChunk = chunk('fmt ', fmtData);
    const dataChunk = chunk('data', dataPayload);
    const body = concat(enc.encode('WAVE'), fmtChunk, dataChunk);
    const riff = concat(enc.encode('RIFF'), u32le(body.byteLength), body);
    await expect(audioDecoder(riff.buffer)).rejects.toThrow(
      /unsupported-format.*65534 \(WAVE_FORMAT_EXTENSIBLE\).*pcm_s16le/s,
    );
  });
});

describe('walkRiff teaching errors (#163, #164, #165)', () => {
  it('too-short buffer reports byteLength and the 12-byte minimum', () => {
    expect(() => [...walkRiff(new ArrayBuffer(4))]).toThrow(/too small \(4 bytes\).*12 bytes.*truncated/s);
  });

  it('bad magic states expected vs found and sniffs MP3', () => {
    const buf = new Uint8Array([0x49, 0x44, 0x33, 0x01, 0, 0, 0, 0, 0, 0, 0, 0]).buffer;
    expect(() => [...walkRiff(buf)]).toThrow(/expected magic 'RIFF'.*ID3.*looks like MP3/s);
  });

  it('truncated-chunk appends a re-fetch hint', () => {
    const buf = new Uint8Array(20);
    const enc = new TextEncoder();
    buf.set(enc.encode('RIFF'), 0);
    new DataView(buf.buffer).setUint32(4, 12, true);
    buf.set(enc.encode('WAVE'), 8);
    buf.set(enc.encode('fmt '), 12);
    new DataView(buf.buffer).setUint32(16, 0xffffff, true);
    expect(() => [...walkRiff(buf.buffer)]).toThrow(/truncated-chunk.*re-fetch/s);
  });
});

describe('videoDecoder teaching errors (#166)', () => {
  it('empty buffer names the asset source path when provided', async () => {
    await expect(videoDecoder(new ArrayBuffer(0), 'clips/intro.mp4')).rejects.toThrow(
      /empty buffer \(source: clips\/intro\.mp4\).*readable and non-empty/s,
    );
  });
});
