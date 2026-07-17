/**
 * Unit tests for `runCliCommand` / `projectCliResult` — the one projection
 * helper every finite CLI command routes through (CUT, ceremony wave). The
 * pure `projectCliResult` core is exercised with hand-built results (no fs):
 * a `failed` result routes to a structured emitError + its exitCode and never
 * calls projectOk; an `ok` result routes through projectOk (whose return, or 0
 * for void, is the exit code). `runCliCommand` is then exercised end-to-end over
 * a real registered command (`version`) to prove the context overrides reach the
 * handler and the typed payload arrives at projectOk with no cast.
 */
import { describe, it, expect, vi } from 'vitest';
import { projectCliResult, runCliCommand } from '../../../../packages/cli/src/lib/run-command.js';
import { emit } from '../../../../packages/cli/src/receipts.js';
import { captureCli } from '../../../integration/cli/capture.js';

describe('projectCliResult', () => {
  it('routes a failed result to emitError + its exitCode, never calling projectOk', async () => {
    const projectOk = vi.fn(() => 0);
    const { exit, stdout, stderr } = await captureCli(async () =>
      projectCliResult(
        'asset.verify',
        {
          status: 'failed',
          command: 'asset.verify',
          timestamp: 'T',
          exitCode: 7,
          payload: { error: 'boom', hint: 'try that' },
        },
        projectOk,
      ),
    );
    expect(exit).toBe(7);
    expect(projectOk).not.toHaveBeenCalled();
    expect(stdout).toBe('');
    const err = JSON.parse(stderr.trim());
    expect(err.status).toBe('failed');
    expect(err.command).toBe('asset.verify');
    expect(err.error).toBe('boom');
    expect(err.hint).toBe('try that');
  });

  it('defaults a failed result with no exitCode to 1', async () => {
    const { exit } = await captureCli(async () =>
      projectCliResult(
        'asset.verify',
        { status: 'failed', command: 'asset.verify', timestamp: 'T', payload: { error: 'x' } },
        () => 0,
      ),
    );
    expect(exit).toBe(1);
  });

  it('routes an ok result through projectOk (which emits) and returns its exit code', async () => {
    const { exit, stdout } = await captureCli(async () =>
      projectCliResult(
        'asset.verify',
        { status: 'ok', command: 'asset.verify', timestamp: 'T2', payload: { assetId: 'a1' } },
        (payload, result) => {
          emit({ ok: true, id: (payload as { assetId: string }).assetId, ts: result.timestamp });
          return 0;
        },
      ),
    );
    expect(exit).toBe(0);
    const rec = JSON.parse(stdout.trim());
    expect(rec.id).toBe('a1');
    expect(rec.ts).toBe('T2');
  });

  it('defaults an ok projection that returns void to exit 0', async () => {
    const { exit } = await captureCli(async () =>
      projectCliResult(
        'asset.verify',
        { status: 'ok', command: 'asset.verify', timestamp: 'T', payload: {} },
        () => {},
      ),
    );
    expect(exit).toBe(0);
  });

  it('surfaces an ok result that carries no payload as a structured failure (exit 1)', async () => {
    const projectOk = vi.fn(() => 0);
    const { exit, stderr } = await captureCli(async () =>
      projectCliResult(
        'asset.verify',
        { status: 'ok', command: 'asset.verify', timestamp: 'T' },
        projectOk,
      ),
    );
    expect(exit).toBe(1);
    expect(projectOk).not.toHaveBeenCalled();
    const err = JSON.parse(stderr.trim());
    expect(err.status).toBe('failed');
    expect(err.error).toContain('no payload');
  });
});

describe('runCliCommand', () => {
  it('threads context overrides into the handler and hands the typed payload to projectOk', async () => {
    const { exit, stdout } = await captureCli(() =>
      runCliCommand('version', {}, { overrides: { hostVersion: () => 'TEST-9.9.9' } }, (payload) => {
        // payload is CommandMap['version'] (VersionPayload) — .czap needs no cast.
        emit({ czap: payload.czap });
        return 0;
      }),
    );
    expect(exit).toBe(0);
    const rec = JSON.parse(stdout.trim());
    expect(rec.czap).toBe('TEST-9.9.9');
  });
});
