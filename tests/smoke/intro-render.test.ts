/**
 * Spec 1.1 E2E smoke — proves the chain holds end-to-end:
 *
 *   examples/scenes/intro.ts
 *     -> CLI dispatch (`scene render`)
 *     -> dynamic import + sceneComposition capsule discovery
 *     -> Compositor + VideoRenderer.frames() async iterable
 *     -> renderWithFfmpeg pipe
 *     -> ffmpeg libx264 -> mp4 on disk
 *
 * Pre-Spec-1.1 this would have failed at:
 *   - Task 5 (audioDecoder hardcoded getUint32(40) on textbook WAV)
 *   - Task 6 (SceneRuntime never registered systems; world DOA)
 *
 * Why we drive the CLI in-process via `run([...])` rather than
 * `execSync('pnpm tsx ...')`:
 *   - In-process hits the same dispatch entry the bin.ts wrapper uses.
 *   - In-process honors vitest's @liteship/* aliases so `examples/scenes/intro.ts`
 *     can resolve `@liteship/scene` from a sibling-of-packages location.
 *   - The compile/render/ffmpeg chain is unchanged either way.
 *
 * This repository smoke requires the declared ffmpeg+libx264 toolchain. A host
 * without it is an environment failure reported by `liteship doctor`, not a
 * silently skipped product proof.
 *
 * @module
 */

import { describe, it, expect } from 'vitest';
import { scaledTimeout } from '../../vitest.shared.js';
import { execSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, statSync, unlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { run } from '@liteship/cli';
import { captureCli } from '../integration/cli/capture.js';

const FFPROBE_AVAILABLE = (() => {
  try {
    const r = spawnSync('ffprobe', ['-version'], { stdio: 'ignore' });
    return r.status === 0;
  } catch {
    return false;
  }
})();

describe('Spec 1.1 E2E smoke — intro scene render', () => {
  it(
    'renders examples/scenes/intro.ts to a non-empty mp4 via ffmpeg',
    async () => {
      const out = resolve('tests/smoke/.out-intro-smoke.mp4');
      if (existsSync(out)) unlinkSync(out);
      if (!existsSync(dirname(out))) mkdirSync(dirname(out), { recursive: true });

      // --force bypasses the idempotency cache so a stale cache entry from a
      // previous invocation can't masquerade as a successful render. Capture the
      // bounded CLI receipt instead of discarding it: a cloud failure must name
      // the missing capability or ffmpeg diagnostic, never only "exit 5".
      const { exit, stdout, stderr } = await captureCli(() =>
        run(['scene', 'render', 'examples/scenes/intro.ts', '-o', out, '--force']),
      );
      expect(
        exit,
        `scene render failed\nstdout tail:\n${stdout.slice(-2000)}\nstderr tail:\n${stderr.slice(-2000)}`,
      ).toBe(0);

      expect(existsSync(out)).toBe(true);
      const sz = statSync(out).size;
      // libx264 yuv420p mp4 of a 240-frame 1280x720 clip is at minimum a few KiB
      // (even all-black). 1 KiB floor is the load-bearing "non-empty" check.
      expect(sz).toBeGreaterThan(1024);

      if (FFPROBE_AVAILABLE) {
        const probe = execSync(`ffprobe -v error -show_entries format=duration,size -of json "${out}"`, {
          stdio: ['ignore', 'pipe', 'pipe'],
        }).toString();
        const meta = JSON.parse(probe) as {
          format?: { duration?: string; size?: string };
        };
        const duration = parseFloat(meta.format?.duration ?? '0');
        // intro contract is 4 seconds; allow generous slack for container rounding.
        expect(duration).toBeGreaterThan(0);
        expect(duration).toBeLessThan(10);
      }

      // Cleanup output file but leave dir for next run.
      try {
        rmSync(out, { force: true });
      } catch {
        // Ignore — Windows file locks occasionally prevent immediate unlink.
      }
    },
    scaledTimeout(240_000),
  );
});
