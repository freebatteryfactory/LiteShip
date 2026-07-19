/**
 * Branch coverage for the `liteship audit` CLI adapter's defensive seams
 * (runtime-seams hotspot). The devops suite drives the REAL engine; these
 * arms only fire when the handler misbehaves or returns degraded shapes —
 * so the handler is mocked here, never the engine:
 *   - a non-Error throw from the handler/profile loader
 *   - structured failure with no audit payload (capability unavailable)
 *   - failed-with-payload receipts and exitCode defaulting
 *   - pretty-printing findings that lack location/line/column
 *
 * @module
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import type * as LiteshipCommand from '@liteship/command';

const { handlerMock } = vi.hoisted(() => ({ handlerMock: vi.fn() }));
vi.mock('@liteship/command', async (importOriginal) => {
  const actual = await importOriginal<typeof LiteshipCommand>();
  return { ...actual, auditCommand: { ...actual.auditCommand, handler: handlerMock } };
});

import { audit } from '../../../../packages/cli/src/commands/audit.js';

async function captureStdio<T>(fn: () => Promise<T>): Promise<{ result: T; stdout: string; stderr: string }> {
  let stdout = '';
  let stderr = '';
  const origOut = process.stdout.write.bind(process.stdout);
  const origErr = process.stderr.write.bind(process.stderr);
  (process.stdout as unknown as { write: unknown }).write = (c: string | Uint8Array) => {
    stdout += typeof c === 'string' ? c : Buffer.from(c).toString();
    return true;
  };
  (process.stderr as unknown as { write: unknown }).write = (c: string | Uint8Array) => {
    stderr += typeof c === 'string' ? c : Buffer.from(c).toString();
    return true;
  };
  try {
    const result = await fn();
    return { result, stdout, stderr };
  } finally {
    (process.stdout as unknown as { write: typeof origOut }).write = origOut;
    (process.stderr as unknown as { write: typeof origErr }).write = origErr;
  }
}

const SUMMARY = {
  errorCount: 0,
  warningCount: 0,
  infoCount: 1,
  findingCount: 1,
  suppressedCount: 0,
  passFindingCounts: { structure: 1, integrity: 0, surface: 0 },
  repoRoot: '/repo',
  profileSource: 'default',
};

afterEach(() => {
  handlerMock.mockReset();
});

describe('audit CLI adapter — degraded handler shapes', () => {
  it('a non-Error throw is stringified into the failure receipt', async () => {
    handlerMock.mockRejectedValue('plain string failure');
    const { result, stderr } = await captureStdio(() => audit({ pretty: false }));
    expect(result).toBe(1);
    const receipt = JSON.parse(stderr.trim().split('\n')[0]!);
    expect(receipt.status).toBe('failed');
    expect(receipt.error).toBe('plain string failure');
  });

  it('structured failure with no audit payload surfaces the error and its exit code', async () => {
    handlerMock.mockResolvedValue({
      status: 'failed',
      payload: { error: 'capability unavailable' },
      exitCode: 3,
      timestamp: '2026-06-10T00:00:00.000Z',
    });
    const { result, stderr } = await captureStdio(() => audit({ pretty: false }));
    expect(result).toBe(3);
    expect(JSON.parse(stderr.trim().split('\n')[0]!).error).toBe('capability unavailable');
  });

  it('structured failure with neither error nor exitCode degrades to "audit failed" / exit 1', async () => {
    handlerMock.mockResolvedValue({
      status: 'failed',
      payload: {},
      timestamp: '2026-06-10T00:00:00.000Z',
    });
    const { result, stderr } = await captureStdio(() => audit({ pretty: false }));
    expect(result).toBe(1);
    expect(JSON.parse(stderr.trim().split('\n')[0]!).error).toBe('audit failed');
  });

  it('a failed receipt WITH an audit payload still emits the receipt and propagates exit', async () => {
    handlerMock.mockResolvedValue({
      status: 'failed',
      payload: { ...SUMMARY, errorCount: 2 },
      exitCode: 2,
      timestamp: '2026-06-10T00:00:00.000Z',
    });
    const { result, stdout } = await captureStdio(() => audit({ pretty: false }));
    expect(result).toBe(2);
    const receipt = JSON.parse(stdout.trim().split('\n').pop()!);
    expect(receipt.status).toBe('failed');
    expect(receipt.errorCount).toBe(2);
  });
});

describe('audit CLI adapter — pretty and exit defaulting', () => {
  it('ok result without exitCode returns 0; pretty defaults from the non-TTY stderr', async () => {
    handlerMock.mockResolvedValue({
      status: 'ok',
      payload: SUMMARY,
      timestamp: '2026-06-10T00:00:00.000Z',
    });
    // pretty omitted: in the captured (non-TTY) environment the summary line stays off.
    const { result, stderr } = await captureStdio(() => audit({}));
    expect(result).toBe(0);
    expect(stderr).toBe('');
  });

  it('pretty without findings prints only the summary line (findings default to [])', async () => {
    handlerMock.mockResolvedValue({
      status: 'ok',
      payload: SUMMARY,
      exitCode: 0,
      timestamp: '2026-06-10T00:00:00.000Z',
    });
    const { stderr } = await captureStdio(() => audit({ pretty: true }));
    expect(stderr).toMatch(/audit: 0 error\(s\)/);
    expect(stderr.trim().split('\n')).toHaveLength(1);
  });

  it('pretty findings tolerate missing location, line, and column', async () => {
    handlerMock.mockResolvedValue({
      status: 'ok',
      payload: {
        ...SUMMARY,
        findings: [
          { severity: 'info', rule: 'no-location', title: 'finding without location' },
          { severity: 'info', rule: 'file-only', title: 'file only', location: { file: 'a.ts' } },
          { severity: 'info', rule: 'file-line', title: 'no column', location: { file: 'a.ts', line: 3 } },
        ],
      },
      exitCode: 0,
      timestamp: '2026-06-10T00:00:00.000Z',
    });
    const { stderr } = await captureStdio(() => audit({ pretty: true }));
    expect(stderr).toContain('  [info] no-location — finding without location');
    expect(stderr).toContain('  [info] a.ts file-only — file only');
    expect(stderr).toContain('  [info] a.ts:3 file-line — no column');
  });
});
