/**
 * `liteship check` adapter — the receipt projection + the stderr findings-summary
 * pretty-print branch, called directly through `check()`.
 *
 * The flag PLUMBING (--ir / --no-cache / the per-gate opt-ins, the lean-vs-IR
 * routing) is pinned in check-ir-wiring.test.ts; this file EXTENDS that by pinning
 * the parts that file's dispatch-level assertions don't reach: the LEAN path's
 * `CheckPayload` → `CheckReceipt` projection (status/command/timestamp), and BOTH
 * sides of the human findings-summary writer (blocked banner vs advisory banner,
 * the per-finding location formatting, and the `pretty:false` suppression).
 *
 * Both engine paths are mocked so no real `ts.Program` / regex fold runs (TWO-CLOCK:
 * the receipt timestamp is a wallClock ISO boundary, asserted by shape not value).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { finding, type GauntletResult } from '@liteship/gauntlet';
import { captureCli } from '../../../integration/cli/capture.js';

const { runGauntletWithRepoIRMock } = vi.hoisted(() => ({ runGauntletWithRepoIRMock: vi.fn() }));
vi.mock('../../../../packages/cli/src/lib/repo-ir-gauntlet.js', () => ({
  runGauntletWithRepoIR: runGauntletWithRepoIRMock,
}));

const { handlerMock } = vi.hoisted(() => ({ handlerMock: vi.fn() }));
vi.mock('@liteship/command', async (importOriginal) => {
  const orig = await importOriginal<Record<string, unknown>>();
  return { ...orig, checkCommand: { handler: handlerMock } };
});

import { check } from '../../../../packages/cli/src/commands/check.js';

function leanPayload(payload: Record<string, unknown>) {
  return { status: 'ok', command: 'check', timestamp: '2026-01-01T00:00:00.000Z', exitCode: 0, payload };
}

beforeEach(() => {
  runGauntletWithRepoIRMock.mockReset();
  handlerMock.mockReset();
});
afterEach(() => vi.restoreAllMocks());

function lastReceipt(stdout: string): Record<string, unknown> {
  return JSON.parse(stdout.trim().split('\n').pop()!) as Record<string, unknown>;
}

describe('liteship check (lean) — receipt projection', () => {
  it('projects the lean handler CheckPayload into a CheckReceipt (status ok, ISO timestamp)', async () => {
    handlerMock.mockResolvedValue(leanPayload({ ok: true, blocked: false, findingCount: 0, findings: [] }));
    const { exit, stdout } = await captureCli(() => check());
    expect(exit).toBe(0);
    const receipt = lastReceipt(stdout);
    expect(receipt).toMatchObject({ command: 'check', status: 'ok', ok: true, blocked: false, findingCount: 0 });
    expect(receipt['timestamp']).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z$/);
    // The lean path never touches the IR builder.
    expect(runGauntletWithRepoIRMock).not.toHaveBeenCalled();
  });

  it('a blocked lean payload projects status failed and exits 1', async () => {
    handlerMock.mockResolvedValue(
      leanPayload({
        ok: false,
        blocked: true,
        findingCount: 1,
        findings: [finding({ ruleId: 'r/x', severity: 'error', level: 'L2', title: 'boom', detail: 'd' })],
      }),
    );
    const { exit, stdout } = await captureCli(() => check({ pretty: false }));
    expect(exit).toBe(1);
    expect(lastReceipt(stdout)['status']).toBe('failed');
  });
});

describe('liteship check — the human findings-summary writer (pretty)', () => {
  it('a BLOCKED run prints the "CHECK BLOCKED" banner + a line per finding with location', async () => {
    runGauntletWithRepoIRMock.mockReturnValue({
      findings: [
        finding({
          ruleId: 'r/loc',
          severity: 'error',
          level: 'L3',
          title: 'has a place',
          detail: 'd',
          location: { file: 'packages/x/a.ts', line: 42 },
        }),
      ],
      outcomes: [],
      blocked: true,
    } satisfies GauntletResult);
    const { exit, stderr } = await captureCli(() => check({ ir: true, pretty: true }));
    expect(exit).toBe(1);
    expect(stderr).toContain('CHECK BLOCKED');
    expect(stderr).toContain('(IR-enriched)');
    expect(stderr).toContain('[error] r/loc: has a place (packages/x/a.ts:42)');
  });

  it('an ADVISORY run (findings but not blocked) prints the "CHECK (advisory)" banner, exit 0', async () => {
    runGauntletWithRepoIRMock.mockReturnValue({
      findings: [
        // No location ⇒ the where-suffix is empty (the location-absent branch).
        finding({ ruleId: 'r/adv', severity: 'advisory', level: 'L1', title: 'fyi', detail: 'd' }),
      ],
      outcomes: [],
      blocked: false,
    } satisfies GauntletResult);
    const { exit, stderr } = await captureCli(() => check({ ir: true, pretty: true }));
    expect(exit).toBe(0);
    expect(stderr).toContain('CHECK (advisory)');
    expect(stderr).toContain('[advisory] r/adv: fyi');
    // No location ⇒ no parenthesized file suffix on the finding line.
    expect(stderr).not.toContain('r/adv: fyi (');
  });

  it('a finding with a file but no line formats the location WITHOUT a :line suffix', async () => {
    runGauntletWithRepoIRMock.mockReturnValue({
      findings: [
        finding({
          ruleId: 'r/fileonly',
          severity: 'error',
          level: 'L2',
          title: 't',
          detail: 'd',
          location: { file: 'packages/y/b.ts' },
        }),
      ],
      outcomes: [],
      blocked: true,
    } satisfies GauntletResult);
    const { stderr } = await captureCli(() => check({ ir: true, pretty: true }));
    expect(stderr).toContain('[error] r/fileonly: t (packages/y/b.ts)');
    expect(stderr).not.toContain('packages/y/b.ts:');
  });

  it('pretty=false suppresses the findings summary even when findings exist (clean stderr)', async () => {
    runGauntletWithRepoIRMock.mockReturnValue({
      findings: [finding({ ruleId: 'r/q', severity: 'error', level: 'L2', title: 't', detail: 'd' })],
      outcomes: [],
      blocked: true,
    } satisfies GauntletResult);
    const { exit, stderr } = await captureCli(() => check({ ir: true, pretty: false }));
    expect(exit).toBe(1);
    expect(stderr).toBe('');
  });
});
