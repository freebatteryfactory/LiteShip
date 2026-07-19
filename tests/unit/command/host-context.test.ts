import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createNodeCommandContext, startSpawnHandle } from '@liteship/command/host';
import { detectSkipsAST } from '@liteship/audit';
import { FFMPEG_RENDER_CAPABLE } from '../../helpers/ffmpeg.js';
import { scaledTimeout } from '../../../vitest.shared.js';

/** Minimal mono 16-bit PCM WAV for @liteship/assets decoders. */
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
  const bodyLen =
    wave.byteLength +
    fmtId.byteLength +
    fmtLen.byteLength +
    fmt.byteLength +
    dataId.byteLength +
    dataLen.byteLength +
    data.byteLength;
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
    workDir = mkdtempSync(join(tmpdir(), 'liteship-host-ctx-'));
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

  it('fileExists and readFileBytes resolve absolute paths', () => {
    const notePath = join(workDir, 'note.txt');
    writeFileSync(notePath, 'payload');
    const ctx = createNodeCommandContext({ cwd: workDir });
    expect(ctx.fileExists?.(notePath)).toBe(true);
    expect(ctx.fileExists?.(join(workDir, 'missing.txt'))).toBe(false);
    expect(ctx.readFileBytes?.(notePath)).toEqual(new Uint8Array([...Buffer.from('payload')]));
    expect(ctx.readFileBytes?.(join(workDir, 'missing.txt'))).toBeNull();
  });

  it('fileExists and readFileBytes resolve relative paths against opts.cwd, not process.cwd()', () => {
    writeFileSync(join(workDir, 'note.txt'), 'payload');
    const ctx = createNodeCommandContext({ cwd: workDir });
    expect(ctx.fileExists?.('note.txt')).toBe(true);
    expect(ctx.readFileBytes?.('note.txt')).toEqual(new Uint8Array([...Buffer.from('payload')]));
  });

  it('spawnCapture returns stdout on success and degrades on spawn failure', async () => {
    const ctx = createNodeCommandContext({ cwd: workDir });
    const ok = await ctx.spawnCapture?.('node', ['-e', 'process.stdout.write("ok")']);
    expect(ok).toEqual({ exitCode: 0, stdout: 'ok' });
    const bad = await ctx.spawnCapture?.('liteship-nonexistent-binary-xyz', ['--nope']);
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

  it('loadAssetBytes reads examples/scenes/<id>.wav resolved against opts.cwd', () => {
    const scenesDir = join(workDir, 'examples/scenes');
    mkdirSync(scenesDir, { recursive: true });
    writeFileSync(join(scenesDir, 'ctx-host-demo.wav'), Buffer.from(minimalWav(32)));
    const ctx = createNodeCommandContext({ cwd: workDir });
    expect(ctx.loadAssetBytes?.('ctx-host-demo')).not.toBeNull();
  });

  it('loadAssetBytes prefers the manifest-declared source over the examples/scenes convention', () => {
    const scenesDir = join(workDir, 'examples/scenes');
    mkdirSync(scenesDir, { recursive: true });
    writeFileSync(join(scenesDir, 'ctx-host-demo.wav'), Buffer.from(minimalWav(32)));
    writeFileSync(join(workDir, 'declared.wav'), Buffer.from(minimalWav(64)));
    const ctx = createNodeCommandContext({ cwd: workDir });
    // Source is cwd-relative; the declared 64-sample clip wins over the 32-sample convention file.
    const bytes = ctx.loadAssetBytes?.('ctx-host-demo', 'declared.wav');
    expect(bytes?.byteLength).toBe(minimalWav(64).byteLength);
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

  it('runAudioProjection resolves every assetId to the audio built-in (empty host registry)', async () => {
    // The host context assembles a FIXED, EMPTY AssetRegistry — no scene's
    // asset module is imported in the host process, and `defineAsset` is pure
    // (no module-global registration), so there is no seam through which a
    // custom decoder could ever reach the host. `resolveDecoder` therefore
    // returns the audio built-in for EVERY id. Empty bytes carry no RIFF
    // header, so the built-in rejects regardless of the assetId supplied.
    const ctx = createNodeCommandContext({ cwd: workDir });
    await expect(ctx.runAudioProjection?.(new ArrayBuffer(0), 'waveform', 'any-asset-id')).rejects.toThrow();
    await expect(ctx.runAudioProjection?.(new ArrayBuffer(0), 'waveform', 'never-registered-id')).rejects.toThrow();
    // A real WAV decodes through the same built-in path — proving the empty
    // registry routes to a working decoder, not a broken one.
    const waveform = await ctx.runAudioProjection?.(minimalWav(512), 'waveform', 'any-asset-id');
    expect(waveform).toBe(512);
  });

  it('loadSceneModule and runSceneCompile invoke the compile fn regardless of return type', async () => {
    // Wave 8: the legacy Effect-returning compile path is retired — compile fns are
    // sync and return a CompiledScene descriptor (or a bare value). runSceneCompile
    // invokes the fn for its side effect and returns void either way.
    const plainPath = join(workDir, 'plain.mjs');
    writeFileSync(plainPath, 'export function compile() { return 1; }\n');
    const descriptorPath = join(workDir, 'descriptor.mjs');
    writeFileSync(descriptorPath, 'export function compile() { return { _kind: "compiledScene", frames: 42 }; }\n');
    const ctx = createNodeCommandContext({ cwd: workDir });
    const plainMod = await ctx.loadSceneModule?.(plainPath);
    expect(plainMod).toBeTruthy();
    await expect(ctx.runSceneCompile?.(plainMod!)).resolves.toBeUndefined();
    const descriptorMod = await ctx.loadSceneModule?.(descriptorPath);
    await expect(ctx.runSceneCompile?.(descriptorMod!)).resolves.toBeUndefined();
  });

  it('runSceneCompile is a no-op when the module exports no callable', async () => {
    const ctx = createNodeCommandContext({ cwd: workDir });
    await expect(ctx.runSceneCompile?.({ marker: 1 })).resolves.toBeUndefined();
  });

  it(
    'runVitest delegates to VitestRunner',
    async () => {
      const ctx = createNodeCommandContext({ cwd: workDir });
      const result = await ctx.runVitest?.([join(process.cwd(), 'tests/unit/command/manifest-path.test.ts')]);
      expect(result?.exitCode).toBe(0);
      expect(result?.stderrTail).toBeDefined();
      // This test spawns a REAL vitest subprocess (startup + transform + run of
      // another test file), which routinely exceeds vitest's 10s default under the
      // gauntlet's concurrent phase load — it timed out there while passing in
      // isolation. scaledTimeout gives CI-scaled headroom via the repo's central
      // policy (no raw >=1000ms literal, per test-timeout-policy).
    },
    scaledTimeout(30000),
  );

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

  // codex round-7 #3: the injected `skipDetector` reaches the in-process gauntlet surfaces. The CLI
  // adapter passes `detectSkipsAST` (it deps `@liteship/audit`); MCP omits it → the token fallback. We
  // prove the injection CHANGES BEHAVIOUR with an ASI-alias skip (`const t = it⏎t.skip`) — a form the
  // token detector MISSES but the AST catches — in `tests/generated/`, the plumb gate's subtree.
  it('runPlumb uses the injected AST skipDetector (catches an alias the token detector misses)', () => {
    const genDir = join(workDir, 'tests/generated');
    mkdirSync(genDir, { recursive: true });
    // The plumb scan also enumerates `<root>/packages` for published-package classification — an
    // empty dir keeps that surface clean so the assertion isolates the skip-detection difference.
    mkdirSync(join(workDir, 'packages'), { recursive: true });
    // ASI rebind alias — `detectSkips` (token) returns []; `detectSkipsAST` catches `t.skip`.
    writeFileSync(join(genDir, 'aliased.test.ts'), 'const t = it\nt.skip("aliased placeholder", () => {})\n');

    // WITHOUT the detector → the token fallback misses the alias → no skip surfaced (the gap).
    const lean = createNodeCommandContext({ cwd: workDir });
    // runPlumb is provisioned in the shared host factory (sync `node:fs` walk under the hood).
    return Promise.all([
      lean.runPlumb!(),
      createNodeCommandContext({ cwd: workDir, skipDetector: detectSkipsAST }).runPlumb!(),
    ]).then(([leanSummary, astSummary]) => {
      expect(leanSummary.skips.some((s) => s.file.endsWith('aliased.test.ts'))).toBe(false);
      // WITH the injected AST detector → the alias is caught → a blocking plumb finding.
      expect(astSummary.skips.some((s) => s.file.endsWith('aliased.test.ts'))).toBe(true);
      expect(astSummary.ok).toBe(false);
    });
  });

  it.runIf(FFMPEG_RENDER_CAPABLE)('renderScene encodes frames through ffmpeg when libx264 is available', async () => {
    const ctx = createNodeCommandContext({ cwd: workDir });
    const output = join(workDir, 'out.mp4');
    // Contract-supplied dimensions override the 1280x720 host default.
    const result = await ctx.renderScene?.({ fps: 10, durationMs: 200, output, width: 64, height: 64 });
    expect(result?.frameCount).toBeGreaterThan(0);
    expect(result?.elapsedMs).toBeGreaterThanOrEqual(0);
  });
});

describe('createNodeCommandContext capability overrides', () => {
  it('merges adapter overrides over the shared defaults — the override wins, unlisted keys keep the host impl', async () => {
    const floorSummary = {
      ok: true,
      expectedWarnings: 0,
      actualWarnings: 0,
      errorCount: 0,
      delta: { added: [], removed: [] },
      inventory: [],
    };
    const ctx = createNodeCommandContext({
      overrides: {
        // A capability the shared factory does NOT provision — only a CLI adapter
        // (which deps the heavy @liteship/audit engine) injects it.
        runAuditFloor: async () => floorSummary,
        // Override a provisioned default; the adapter value must win.
        manifestSource: () => 'OVERRIDDEN',
      },
    });
    expect(ctx.runAuditFloor).toBeDefined();
    await expect(ctx.runAuditFloor!()).resolves.toEqual(floorSummary);
    expect(ctx.manifestSource!()).toBe('OVERRIDDEN');
    // A capability not listed in `overrides` keeps the shared host implementation.
    expect(typeof ctx.runPlumb).toBe('function');
  });

  it('without overrides, the shared context is unchanged (a CLI-only capability stays absent)', () => {
    const ctx = createNodeCommandContext({});
    expect(ctx.runAuditFloor).toBeUndefined();
    expect(typeof ctx.runPlumb).toBe('function');
  });
});
