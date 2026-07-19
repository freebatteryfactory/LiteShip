/**
 * `liteship audit-floor` adapter — the CLI-only projection of the warning-floor gate.
 *
 * The CLI is the ONLY adapter that wires the heavy `@liteship/audit` three-pass engine
 * (`runStructureAudit` / `runIntegrityAudit` / `runSurfaceAudit`) into the
 * `runAuditFloor` capability; those three are mocked so these assertions pin the
 * ADAPTER's in-process logic — `runAuditFloorScan`'s warning filter + sort, the
 * diff against the (empty, post-0.1.5) `AUDIT_WARNING_FLOOR`, the receipt
 * projection, the exit-code mapping, and the drift-report pretty-print (added /
 * removed) branch — without re-running the real repo-wide audit.
 *
 * The pure floor data + `diffInventories` and the live `collectWarningInventory`
 * inventory check stay tested where they belong (tests/unit/devops/) — this file
 * extends, never duplicates, that coverage by exercising the adapter's own folds.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { captureCli } from '../../../integration/cli/capture.js';

const { structureMock, integrityMock, surfaceMock } = vi.hoisted(() => ({
  structureMock: vi.fn(),
  integrityMock: vi.fn(),
  surfaceMock: vi.fn(),
}));
vi.mock('@liteship/audit', async (importOriginal) => {
  const orig = await importOriginal<Record<string, unknown>>();
  return {
    ...orig,
    runStructureAudit: structureMock,
    runIntegrityAudit: integrityMock,
    runSurfaceAudit: surfaceMock,
  };
});

import { auditFloor, collectWarningInventory } from '../../../../packages/cli/src/commands/audit-floor.js';

type Sev = 'warning' | 'error' | 'advisory';
function finding(rule: string, severity: Sev, file?: string) {
  return { rule, severity, location: file ? { file } : undefined };
}
function pass(findings: ReturnType<typeof finding>[]) {
  return { findings };
}

beforeEach(() => {
  structureMock.mockReset().mockReturnValue(pass([]));
  integrityMock.mockReset().mockReturnValue(pass([]));
  surfaceMock.mockReset().mockReturnValue(pass([]));
});
afterEach(() => vi.restoreAllMocks());

function lastReceipt(stdout: string): Record<string, unknown> {
  return JSON.parse(stdout.trim().split('\n').pop()!) as Record<string, unknown>;
}

describe('liteship audit-floor — clean inventory matches the empty floor (exit 0)', () => {
  it('passes with zero warnings/errors and writes no drift report', async () => {
    const { exit, stdout, stderr } = await captureCli(() => auditFloor({ pretty: true }));
    expect(exit).toBe(0);
    const receipt = lastReceipt(stdout);
    expect(receipt).toMatchObject({
      command: 'audit-floor',
      status: 'ok',
      ok: true,
      expectedWarnings: 0,
      actualWarnings: 0,
      errorCount: 0,
    });
    expect(receipt['delta']).toEqual({ added: [], removed: [] });
    expect(stderr).toBe('');
  });
});

describe('liteship audit-floor — a new warning is drift against the zero floor (exit 1)', () => {
  it('reports the ADDED key in the receipt delta and the pretty drift report', async () => {
    structureMock.mockReturnValue(pass([finding('no-foo', 'warning', 'packages/x/src/a.ts')]));
    const { exit, stdout, stderr } = await captureCli(() => auditFloor({ pretty: true }));
    expect(exit).toBe(1);
    const receipt = lastReceipt(stdout);
    expect(receipt['status']).toBe('failed');
    expect(receipt['actualWarnings']).toBe(1);
    expect((receipt['delta'] as { added: string[] }).added).toEqual(['no-foo@packages/x/src/a.ts']);
    expect(stderr).toContain('AUDIT-FLOOR GATE FAILED');
    expect(stderr).toContain('+ no-foo@packages/x/src/a.ts');
  });

  it('sorts the inventory + falls back to `unknown` for a warning with no location', async () => {
    integrityMock.mockReturnValue(pass([finding('z-rule', 'warning', 'packages/z.ts')]));
    surfaceMock.mockReturnValue(pass([finding('a-rule', 'warning', undefined)]));
    const { stdout } = await captureCli(() => auditFloor({ pretty: false }));
    const receipt = lastReceipt(stdout);
    // Sorted: 'a-rule@unknown' < 'z-rule@packages/z.ts'.
    expect(receipt['inventory']).toEqual(['a-rule@unknown', 'z-rule@packages/z.ts']);
  });

  it('any error-severity finding fails the gate even with a clean warning inventory', async () => {
    surfaceMock.mockReturnValue(pass([finding('hard-fault', 'error', 'packages/y.ts')]));
    const { exit, stdout } = await captureCli(() => auditFloor({ pretty: false }));
    expect(exit).toBe(1);
    const receipt = lastReceipt(stdout);
    expect(receipt['errorCount']).toBe(1);
    expect(receipt['status']).toBe('failed');
  });

  it('stays SILENT on stderr when pretty is off (receipt still exits 1)', async () => {
    structureMock.mockReturnValue(pass([finding('no-foo', 'warning', 'packages/x.ts')]));
    const { exit, stderr } = await captureCli(() => auditFloor({ pretty: false }));
    expect(exit).toBe(1);
    expect(stderr).toBe('');
  });
});

describe('collectWarningInventory — the exported warning projection', () => {
  it('keeps only warnings, formats rule@file, and sorts (errors/advisories dropped)', () => {
    structureMock.mockReturnValue(pass([finding('w2', 'warning', 'b.ts'), finding('e1', 'error', 'b.ts')]));
    integrityMock.mockReturnValue(pass([finding('w1', 'warning', 'a.ts')]));
    surfaceMock.mockReturnValue(pass([finding('adv', 'advisory', 'c.ts')]));
    expect(collectWarningInventory()).toEqual(['w1@a.ts', 'w2@b.ts']);
  });
});
