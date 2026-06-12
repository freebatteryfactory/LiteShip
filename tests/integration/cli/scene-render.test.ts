import { describe, it, expect } from 'vitest';
import { run } from '@czap/cli';
import { scaledTimeout } from '../../../vitest.shared.js';
import { existsSync, unlinkSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { FFMPEG_RENDER_CAPABLE } from '../../helpers/ffmpeg.js';

function capture<T>(fn: () => Promise<T>): Promise<{ exit: T; stdout: string; stderr: string }> {
  let stdout = '';
  let stderr = '';
  const origOut = process.stdout.write.bind(process.stdout);
  const origErr = process.stderr.write.bind(process.stderr);
  (process.stdout as unknown as { write: unknown }).write = (chunk: string | Uint8Array) => {
    stdout += typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString();
    return true;
  };
  (process.stderr as unknown as { write: unknown }).write = (chunk: string | Uint8Array) => {
    stderr += typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString();
    return true;
  };
  return Promise.resolve(fn())
    .then((exit) => ({ exit, stdout, stderr }))
    .finally(() => {
      (process.stdout as unknown as { write: typeof origOut }).write = origOut;
      (process.stderr as unknown as { write: typeof origErr }).write = origErr;
    });
}

describe('czap scene render', () => {
  const out = resolve('tests/integration/cli/.out-intro.mp4');

  const renderIt = FFMPEG_RENDER_CAPABLE ? it : it.skip;

  renderIt(
    'renders the intro example scene to an mp4',
    async () => {
      if (existsSync(out)) unlinkSync(out);
      mkdirSync(dirname(out), { recursive: true });
      const { exit, stdout, stderr } = await capture(() =>
        run(['scene', 'render', 'examples/scenes/intro.ts', '-o', out]),
      );
      expect(stderr).toBe('');
      expect(exit).toBe(0);
      const receipt = JSON.parse(stdout.trim().split('\n').pop()!);
      expect(receipt.status).toBe('ok');
      expect(receipt.output).toBe(out);
      expect(receipt.frameCount).toBeGreaterThan(0);
      expect(existsSync(out)).toBe(true);
    },
    scaledTimeout(240_000),
  );

  it('returns exit code 1 for a missing scene file', async () => {
    const { exit } = await capture(() => run(['scene', 'render', 'no-such.ts', '-o', '/tmp/x.mp4']));
    expect(exit).toBe(1);
  });

  renderIt(
    'omitted --output derives <sceneBasename>.mp4 beside the scene (sanctioned default, wave 2)',
    async () => {
      // The missing-output error path is gone by design — this is the
      // end-to-end proof of what replaced it.
      const derived = resolve('examples/scenes/intro.mp4');
      if (existsSync(derived)) unlinkSync(derived);
      try {
        const { exit, stdout } = await capture(() => run(['scene', 'render', 'examples/scenes/intro.ts', '--force']));
        expect(exit).toBe(0);
        const receipt = JSON.parse(stdout.trim().split('\n').pop()!);
        expect(receipt.status).toBe('ok');
        // The receipt echoes the path as derived — relative to how the
        // scene was given; the existsSync below pins where it landed.
        expect(receipt.output).toBe('examples/scenes/intro.mp4');
        expect(existsSync(derived)).toBe(true);
      } finally {
        if (existsSync(derived)) unlinkSync(derived);
      }
    },
    scaledTimeout(240_000),
  );
});
