/**
 * doctor --target consumer-app fs errors (#117).
 *
 * Platform-independent by construction: injects EACCES via a mocked `readFileSync`
 * (the chmod-000 approach is untestable on Windows and forbidden as an unsanctioned
 * `test.skipIf` — gauntlet/no-skipped-test is always-blocking).
 *
 * @module
 */
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import type { PathLike } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import { captureCli } from '../../../integration/cli/capture.js';

function fsError(code: string): Error {
  const err = new Error(`forced ${code}`);
  (err as Error & { code: string }).code = code;
  return err;
}

const lastStderrReceipt = (stderr: string): { command: string; error: string } => {
  const line = stderr.trim().split('\n').filter(Boolean).at(-1);
  if (!line) throw new Error('no stderr receipt');
  return JSON.parse(line) as { command: string; error: string };
};

const { readFileSyncMock, fsStore } = vi.hoisted(() => ({
  readFileSyncMock: vi.fn(),
  fsStore: {
    realReadFileSync: null as ((path: PathLike, ...args: unknown[]) => string | Buffer) | null,
  },
}));

vi.mock('node:fs', async (importOriginal) => {
  const orig = await importOriginal<Record<string, unknown>>();
  fsStore.realReadFileSync = orig.readFileSync as NonNullable<typeof fsStore.realReadFileSync>;
  return { ...orig, readFileSync: readFileSyncMock };
});

const { doctor } = await import('../../../../packages/cli/src/commands/doctor.js');

describe('doctor --target consumer-app fs errors (#117)', () => {
  test('read failure yields structured emitError + exit 1, not an uncaught rejection', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'czap-doctor-consumer-fs-'));
    const src = join(dir, 'src');
    mkdirSync(src, { recursive: true });
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'consumer-app', version: '1.0.0' }));
    const target = join(src, 'page.ts');
    writeFileSync(target, 'export const x = 1;');

    readFileSyncMock.mockImplementation((path: PathLike, ...args: unknown[]) => {
      if (String(path) === target) {
        // #region agent log
        fetch('http://127.0.0.1:7809/ingest/34367503-1f32-41e3-9d51-faf28bb55bd4', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '505061' },
          body: JSON.stringify({
            sessionId: '505061',
            runId: 'post-fix',
            hypothesisId: 'A',
            location: 'doctor-consumer-app-fs.test.ts:readFileSyncMock',
            message: 'injecting EACCES on consumer source read',
            data: { path: String(path) },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
        throw fsError('EACCES');
      }
      return fsStore.realReadFileSync!(path as never, ...(args as never[]));
    });

    const { exit, stderr } = await captureCli(() => doctor({ pretty: false, cwd: dir, target: 'consumer-app' }));

    // #region agent log
    fetch('http://127.0.0.1:7809/ingest/34367503-1f32-41e3-9d51-faf28bb55bd4', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '505061' },
      body: JSON.stringify({
        sessionId: '505061',
        runId: 'post-fix',
        hypothesisId: 'B',
        location: 'doctor-consumer-app-fs.test.ts:doctor-result',
        message: 'doctor consumer-app fs error envelope',
        data: { exit, stderrTail: stderr.trim().split('\n').at(-1)?.slice(0, 200) },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    expect(exit).toBe(1);
    const err = lastStderrReceipt(stderr);
    expect(err.command).toBe('doctor');
    expect(err.error).toMatch(/EACCES|permission|forced EACCES/i);
  });
});
