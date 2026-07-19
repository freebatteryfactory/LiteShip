/**
 * Unit tests for `liteship scene render` covering the non-ffmpeg portions
 * — input validation, cache lookup, the dynamic-import + capsule/contract
 * guards. The successful render path (await renderWithFfmpeg) is exercised
 * by tests/integration/cli/scene-render.test.ts under the `FFMPEG_AVAILABLE`
 * gate; here we cover everything that reaches the render path AND everything
 * that returns before it.
 *
 * Every test passes an explicit `cwd: workDir` opt to sceneRender so the
 * `.liteship/cache/` writes land inside the test's tmpdir, not in the repo
 * root. No process.chdir, no shared-state mutation, no Windows worker
 * race (see PR #3 commit b1b806a for the prior chdir-race we hit).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { sceneRender } from '../../../../packages/cli/src/commands/scene-render.js';
import { cachePath, hashInputs, writeCache } from '../../../../packages/cli/src/idempotency.js';
import { captureCli } from '../../../integration/cli/capture.js';

describe('scene render command — non-ffmpeg portions', () => {
  let workDir: string;

  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), 'liteship-scene-render-'));
  });

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  // Helper for parsing the trailing JSON line of stderr without `!` assertions
  // (CodeRabbit nitpick on PR #3 commit be7abc7) — surfaces a clear failure
  // message if the receipt didn't arrive instead of "Cannot read property of
  // undefined" on the next access.
  const parseStderrReceipt = (stderr: string): { command?: string; error: string } => {
    const lines = stderr.trim().split('\n').filter((l) => l.startsWith('{'));
    expect(lines.length).toBeGreaterThan(0);
    return JSON.parse(lines[lines.length - 1]!) as { command?: string; error: string };
  };

  it('empty --output derives <scene>.mp4 instead of erroring (still 1 here: scene absent)', async () => {
    // Output derivation happens before the file-exists guard, so an empty
    // output no longer fails with "missing --output" — the missing scene
    // file is now the (correct) subject of the error.
    const { exit, stderr } = await captureCli(() => sceneRender('any.ts', '', false, { cwd: workDir }));
    expect(exit).toBe(1);
    const err = parseStderrReceipt(stderr);
    expect(err.command).toBe('scene.render');
    expect(err.error).toMatch(/scene not found: any\.ts/);
  });

  it('returns 1 with emitError when the scene file does not exist', async () => {
    const { exit, stderr } = await captureCli(() =>
      sceneRender('/__liteship-nonexistent__.ts', join(workDir, 'out.mp4'), false, { cwd: workDir }),
    );
    expect(exit).toBe(1);
    expect(parseStderrReceipt(stderr).error).toMatch(/scene not found:/);
  });

  it('returns 1 with emitError when the scene module exports no capsule or contract', async () => {
    const scenePath = join(workDir, 'empty-scene.mjs');
    writeFileSync(scenePath, 'export const nothing = 42;\n');
    const { exit, stderr } = await captureCli(() =>
      sceneRender(scenePath, join(workDir, 'out.mp4'), false, { cwd: workDir }),
    );
    expect(exit).toBe(1);
    expect(parseStderrReceipt(stderr).error).toMatch(/does not export a sceneComposition capsule or a scene contract/);
  });

  it('cache hit: primed cache + existing output file returns cached receipt without re-rendering', async () => {
    // Write a fake mp4 so the cache-staleness guard (line 65 `existsSync(cachedOutput)`)
    // passes and we go down the cache-hit arm at line 66-67 instead of falling
    // through to the ffmpeg pipeline.
    const scenePath = join(workDir, 'cached-scene.mjs');
    const outPath = join(workDir, 'rendered.mp4');
    writeFileSync(scenePath, 'export const nothing = 42;\n');
    writeFileSync(outPath, Buffer.from([0, 0, 0, 0])); // fake mp4 bytes
    const ctx = {
      command: 'scene.render' as const,
      inputs: { scenePath: resolve(scenePath), output: outPath },
      force: false,
      cwd: workDir,
    };
    writeCache(ctx, {
      status: 'ok',
      command: 'scene.render',
      timestamp: '2026-05-17T00:00:00.000Z',
      sceneId: 'fnv1a:deadbeef',
      output: outPath,
      frameCount: 60,
      elapsedMs: 100,
    });
    expect(existsSync(cachePath(hashInputs(ctx), workDir))).toBe(true);

    const { exit, stdout } = await captureCli(() =>
      sceneRender(scenePath, outPath, false, { cwd: workDir }),
    );
    expect(exit).toBe(0);
    const receipt = JSON.parse(stdout.trim().split('\n').pop()!);
    expect(receipt.cached).toBe(true);
    expect(receipt.output).toBe(outPath);
    expect(receipt.frameCount).toBe(60);
    // The 1280x720 engine default is observable in the receipt.
    expect(receipt.width).toBe(1280);
    expect(receipt.height).toBe(720);
  });

  it('cache stale: primed cache but output file deleted falls through to the render path (covers line 65 false-branch)', async () => {
    // Same setup as the cache-hit test, but DON'T create the output file.
    // The cache-staleness guard at line 65 should reject the cached entry,
    // fall through to the dynamic-import at line 71. Since the scene exports
    // nothing, it then exits 1 at line 75 — proving the cache fallthrough
    // happened (a cache hit would have returned 0 with cached:true).
    const scenePath = join(workDir, 'stale-scene.mjs');
    const outPath = join(workDir, 'never-rendered.mp4');
    writeFileSync(scenePath, 'export const nothing = 42;\n');
    const ctx = {
      command: 'scene.render' as const,
      inputs: { scenePath: resolve(scenePath), output: outPath },
      force: false,
      cwd: workDir,
    };
    writeCache(ctx, {
      status: 'ok',
      command: 'scene.render',
      output: outPath,
      frameCount: 60,
    });

    const { exit, stdout, stderr } = await captureCli(() =>
      sceneRender(scenePath, outPath, false, { cwd: workDir }),
    );
    expect(exit).toBe(1); // fell through, then exit 1 because no capsule
    // No cached:true receipt on stdout (we never reached emit() in the cache arm).
    const out = stdout.trim();
    if (out.startsWith('{')) {
      expect(JSON.parse(out).cached).not.toBe(true);
    }
    expect(stderr).toMatch(/does not export a sceneComposition capsule/);
  });

  it('force=true bypasses an otherwise-valid cache (covers force-arm in tryReadCache through sceneRender)', async () => {
    const scenePath = join(workDir, 'forced-scene.mjs');
    const outPath = join(workDir, 'forced.mp4');
    writeFileSync(scenePath, 'export const nothing = 42;\n');
    writeFileSync(outPath, Buffer.from([0, 0, 0, 0]));
    const ctx = {
      command: 'scene.render' as const,
      inputs: { scenePath: resolve(scenePath), output: outPath },
      force: false, // cache was written without force
      cwd: workDir,
    };
    writeCache(ctx, {
      status: 'ok',
      command: 'scene.render',
      output: outPath,
      frameCount: 60,
    });

    // Call sceneRender with force=true → tryReadCache returns null → falls
    // through to the render path → exits 1 (no capsule), NOT 0 from cache.
    const { exit } = await captureCli(() =>
      sceneRender(scenePath, outPath, true, { cwd: workDir }),
    );
    expect(exit).toBe(1);
  });

  it('isCapsule/isContract guards: a scene that exports a capsule but no contract still rejects (covers line 74 partial match)', async () => {
    const scenePath = join(workDir, 'capsule-only.mjs');
    // Export a sceneComposition-shaped capsule but no contract — guards
    // demand BOTH at line 74.
    writeFileSync(
      scenePath,
      `export const cap = { _kind: 'sceneComposition', id: 'fnv1a:0', name: 'cap' };\n`,
    );
    const { exit, stderr } = await captureCli(() =>
      sceneRender(scenePath, join(workDir, 'out.mp4'), false, { cwd: workDir }),
    );
    expect(exit).toBe(1);
    // The error names ONLY the missing half — the capsule was found.
    expect(stderr).toMatch(/does not export a scene contract \(an export carrying a tracks array\)/);
    expect(stderr).not.toMatch(/does not export a sceneComposition capsule/);
  });
});
