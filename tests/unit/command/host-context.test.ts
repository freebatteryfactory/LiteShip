import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Effect } from 'effect';
import { createNodeCommandContext, startSpawnHandle } from '@czap/command/host';
import { defineAsset, type DecodedAudio } from '@czap/assets';
import { resetAssetRegistry } from '@czap/assets/testing';
import { FFMPEG_RENDER_CAPABLE } from '../../helpers/ffmpeg.js';

/** Minimal mono 16-bit PCM WAV for @czap/assets decoders. */
function minimalWav(sampleCount: number): ArrayBuffer {
  const data = new Uint8Array(sampleCount * 2);
  for (let i = 0; i < sampleCount; i++) {
    const sample = (i % 128) * 256;
    data[i * 2] = sample & 0xff;
    data[i * 2 + 1] = (sample >> 8) & 0xff;
  }
  const fmt = new Uint8Array(16);
  const dv = new DataView(fmt.buffer);
  dv.setUint16(0, 1, true);
  dv.setUint16(2, 1, true);
  dv.setUint32(4, 8000, true);
  dv.setUint32(8, 16000, true);
  dv.setUint16(12, 2, true);
  dv.setUint16(14, 16, true);
  const enc = new TextEncoder();
  const riff = enc.encode('RIFF');
  const wave = enc.encode('WAVE');
  const fmtId = enc.encode('fmt ');
  const dataId = enc.encode('data');
  const fmtLen = new Uint8Array(4);
  new DataView(fmtLen.buffer).setUint32(0, 16, true);
  const dataLen = new Uint8Array(4);
  new DataView(dataLen.buffer).setUint32(0, data.byteLength, true);
  const bodyLen = wave.byteLength + fmtId.byteLength + fmtLen.byteLength + fmt.byteLength + dataId.byteLength + dataLen.byteLength + data.byteLength;
  const size = new Uint8Array(4);
  new DataView(size.buffer).setUint32(0, bodyLen, true);
  const out = new Uint8Array(riff.byteLength + size.byteLength + bodyLen);
  let off = 0;
  for (const part of [riff, size, wave, fmtId, fmtLen, fmt, dataId, dataLen, data]) {
    out.set(part, off);
    off += part.byteLength;
  }
  return out.buffer;
}

describe('createNodeCommandContext', () => {
  let workDir: string;

  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), 'czap-host-ctx-'));
  });

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  it('manifestSource returns null when the manifest file is absent', () => {
    const ctx = createNodeCommandContext({ cwd: workDir });
    expect(ctx.manifestSource?.()).toBeNull();
  });

  it('manifestSource reads reports/capsule-manifest.json when present', () => {
    mkdirSync(join(workDir, 'reports'), { recursive: true });
    writeFileSync(join(workDir, 'reports/capsule-manifest.json'), '{"capsules":[]}');
    const ctx = createNodeCommandContext({ cwd: workDir });
    expect(ctx.manifestSource?.()).toBe('{"capsules":[]}');
  });

  it('fileExists and readFileBytes resolve paths from process.cwd()', () => {
    const notePath = join(workDir, 'note.txt');
    writeFileSync(notePath, 'payload');
    const ctx = createNodeCommandContext({ cwd: workDir });
    expect(ctx.fileExists?.(notePath)).toBe(true);
    expect(ctx.fileExists?.(join(workDir, 'missing.txt'))).toBe(false);
    expect(ctx.readFileBytes?.(notePath)).toEqual(new Uint8Array([...Buffer.from('payload')]));
    expect(ctx.readFileBytes?.(join(workDir, 'missing.txt'))).toBeNull();
  });

  it('spawnCapture returns stdout on success and degrades on spawn failure', async () => {
    const ctx = createNodeCommandContext({ cwd: workDir });
    const ok = await ctx.spawnCapture?.('node', ['-e', 'process.stdout.write("ok")']);
    expect(ok).toEqual({ exitCode: 0, stdout: 'ok' });
    const bad = await ctx.spawnCapture?.('czap-nonexistent-binary-xyz', ['--nope']);
    expect(bad).toEqual({ exitCode: 1, stdout: '' });
  });

  it('cache read/write round-trips through the context adapter', () => {
    const ctx = createNodeCommandContext({ cwd: workDir });
    const key = { command: 'probe', inputs: { n: 1 }, force: false };
    expect(ctx.cache?.read(key)).toBeNull();
    ctx.cache?.write(key, { cached: true });
    expect(ctx.cache?.read(key)).toEqual({ cached: true });
    expect(ctx.cache?.read({ ...key, force: true })).toBeNull();
  });

  it('loadAssetBytes returns null when no candidate file exists', () => {
    const ctx = createNodeCommandContext({ cwd: workDir });
    expect(ctx.loadAssetBytes?.('missing-asset')).toBeNull();
  });

  it('loadAssetBytes reads from an explicit source path', () => {
    const wavPath = join(workDir, 'clip.wav');
    writeFileSync(wavPath, Buffer.from(minimalWav(64)));
    const ctx = createNodeCommandContext({ cwd: workDir });
    const bytes = ctx.loadAssetBytes?.('ignored-id', wavPath);
    expect(bytes).not.toBeNull();
    expect(bytes!.byteLength).toBeGreaterThan(44);
  });

  it('loadAssetBytes reads examples/scenes/<id>.wav from the repo convention path', () => {
    const scenesDir = join(process.cwd(), 'examples/scenes');
    mkdirSync(scenesDir, { recursive: true });
    const wavPath = join(scenesDir, 'ctx-host-demo.wav');
    writeFileSync(wavPath, Buffer.from(minimalWav(32)));
    try {
      const ctx = createNodeCommandContext({ cwd: workDir });
      expect(ctx.loadAssetBytes?.('ctx-host-demo')).not.toBeNull();
    } finally {
      rmSync(wavPath, { force: true });
    }
  });

  it('runAudioProjection covers beat, onset, and waveform arms', async () => {
    const ctx = createNodeCommandContext({ cwd: workDir });
    const bytes = minimalWav(512);
    const beat = await ctx.runAudioProjection?.(bytes, 'beat');
    const onset = await ctx.runAudioProjection?.(bytes, 'onset');
    const waveform = await ctx.runAudioProjection?.(bytes, 'waveform');
    expect(typeof beat).toBe('number');
    expect(typeof onset).toBe('number');
    expect(waveform).toBe(512);
  });

  it('runAudioProjection honors a registered asset\'s OWN decoder when assetId is supplied', async () => {
    const synthetic: DecodedAudio = {
      sampleRate: 8000,
      channels: 1,
      bitsPerSample: 16,
      sampleCount: 64,
      samples: new Int16Array(64),
      durationMs: 8,
    };
    defineAsset({
      id: 'host-ctx-custom-decoder',
      source: 'unused.wav',
      kind: 'audio',
      decoder: async () => synthetic,
      budgets: { decodeP95Ms: 50 },
      invariants: [],
    });
    try {
      const ctx = createNodeCommandContext({ cwd: workDir });
      // Empty bytes would make the audio built-in throw (no RIFF header) —
      // a successful waveform run proves the asset's custom decoder decoded.
      const waveform = await ctx.runAudioProjection?.(new ArrayBuffer(0), 'waveform', 'host-ctx-custom-decoder');
      expect(waveform).toBe(512);
      // Unregistered asset ids keep the audio built-in: same empty bytes reject.
      await expect(ctx.runAudioProjection?.(new ArrayBuffer(0), 'waveform', 'never-registered-id')).rejects.toThrow();
    } finally {
      resetAssetRegistry();
    }
  });

  it('loadSceneModule and runSceneCompile handle plain and Effect exports', async () => {
    const plainPath = join(workDir, 'plain.mjs');
    writeFileSync(plainPath, 'export function compile() { return 1; }\n');
    const effectPath = join(workDir, 'effect.mjs');
    writeFileSync(
      effectPath,
      `import { Effect } from 'effect';\nexport function compile() { return Effect.succeed(42); }\n`,
    );
    const ctx = createNodeCommandContext({ cwd: workDir });
    const plainMod = await ctx.loadSceneModule?.(plainPath);
    expect(plainMod).toBeTruthy();
    await expect(ctx.runSceneCompile?.(plainMod!)).resolves.toBeUndefined();
    const effectMod = await ctx.loadSceneModule?.(effectPath);
    await expect(ctx.runSceneCompile?.(effectMod!)).resolves.toBeUndefined();
  });

  it('runSceneCompile is a no-op when the module exports no callable', async () => {
    const ctx = createNodeCommandContext({ cwd: workDir });
    await expect(ctx.runSceneCompile?.({ marker: 1 })).resolves.toBeUndefined();
  });

  it('runVitest delegates to VitestRunner', async () => {
    const ctx = createNodeCommandContext({ cwd: workDir });
    const result = await ctx.runVitest?.([join(process.cwd(), 'tests/unit/command/manifest-path.test.ts')]);
    expect(result?.exitCode).toBe(0);
    expect(result?.stderrTail).toBeDefined();
  });

  it('startSpawnHandle readline yields stdout lines and dispose is idempotent', async () => {
    const handle = startSpawnHandle('node', ['-e', 'process.stdout.write("alpha\\nbeta")'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const lines: string[] = [];
    for await (const line of handle.readline()) lines.push(line);
    expect(lines.join('\n')).toContain('alpha');
    await handle.dispose();
    await handle.dispose();
    expect(handle.stderrTail()).toBeDefined();
  });

  it.runIf(FFMPEG_RENDER_CAPABLE)('renderScene encodes frames through ffmpeg when libx264 is available', async () => {
    const ctx = createNodeCommandContext({ cwd: workDir });
    const output = join(workDir, 'out.mp4');
    const result = await ctx.renderScene?.({ fps: 10, durationMs: 200, output });
    expect(result?.frameCount).toBeGreaterThan(0);
    expect(result?.elapsedMs).toBeGreaterThanOrEqual(0);
  });
});
