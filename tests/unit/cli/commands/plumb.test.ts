/**
 * `liteship plumb` adapter — the in-process projection of the plumb-completeness gate
 * (the deleted `scripts/plumb-gate.ts`) into a receipt + a stderr work-list.
 *
 * The heavy scan (`runPlumbScan` over `node:fs`) is injected through the adapter's
 * defaulted deps seam so these assertions pin
 * the ADAPTER's logic: the injected-capability context the handler folds, the
 * receipt projection (status mirrors ok), the exit-code mapping, and the two
 * pretty-print branches (the skip work-list and the unclassified-package list) —
 * without scanning a real `tests/generated/` tree. `pretty` is passed explicitly
 * so the TTY-sensing default never makes the output non-deterministic.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { captureCli } from '../../../integration/cli/capture.js';

// The heavy scan is injected through `plumb`'s defaulted `runPlumbScan` deps seam
// (NOT a @liteship/command/host module mock), so these assertions pin the ADAPTER's
// logic without walking a real tests/generated/ tree.
const runPlumbScanMock = vi.fn();
const scanDeps = { runPlumbScan: runPlumbScanMock };

import { plumb } from '../../../../packages/cli/src/commands/plumb.js';

const CLEAN = { ok: true, skips: [], unclassified: [], generatedPresent: true, generatedCorpusMessage: null };

beforeEach(() => {
  runPlumbScanMock.mockReset();
});
afterEach(() => vi.restoreAllMocks());

function lastReceipt(stdout: string): Record<string, unknown> {
  return JSON.parse(stdout.trim().split('\n').pop()!) as Record<string, unknown>;
}

describe('liteship plumb — clean gate (exit 0, ok receipt, no work-list)', () => {
  it('emits status ok and writes no stderr work-list', async () => {
    runPlumbScanMock.mockResolvedValue(CLEAN);
    const { exit, stdout, stderr } = await captureCli(() => plumb({ pretty: true }, scanDeps));
    expect(exit).toBe(0);
    const receipt = lastReceipt(stdout);
    expect(receipt).toMatchObject({ command: 'plumb', status: 'ok', ok: true });
    expect(stderr).toBe('');
  });

  it('threads cwd + the injected SOUND AST skip detector into the injected runPlumb capability', async () => {
    runPlumbScanMock.mockResolvedValue(CLEAN);
    await captureCli(() => plumb({ cwd: '/tmp/some-repo', pretty: false }, scanDeps));
    // The CLI host injects `detectSkipsAST` (the AST detector) as the second arg so a generated
    // multi-line / ASI / inner-describe skip the token scanner would miss is caught in the plumb
    // scan too — the lean `@liteship/command/host` keeps the token `detectSkips` as its fallback.
    expect(runPlumbScanMock).toHaveBeenCalledWith('/tmp/some-repo', expect.any(Function));
  });
});

describe('liteship plumb — a failing gate (exit 1) prints the work-list (pretty)', () => {
  it('lists every placeholder skip with file + kind + message', async () => {
    runPlumbScanMock.mockResolvedValue({
      ok: false,
      skips: [
        { file: 'tests/generated/a.test.ts', kind: 'it.skip', message: 'unwired binding' },
        { file: 'tests/generated/b.bench.ts', kind: 'bench.skip', message: 'placeholder bench' },
      ],
      unclassified: [],
      generatedPresent: true,
      generatedCorpusMessage: null,
    });
    const { exit, stdout, stderr } = await captureCli(() => plumb({ pretty: true }, scanDeps));
    expect(exit).toBe(1);
    expect(lastReceipt(stdout)['status']).toBe('failed');
    expect(stderr).toContain('PLUMB GATE FAILED');
    expect(stderr).toContain('2 placeholder skip(s)');
    expect(stderr).toContain("tests/generated/a.test.ts  it.skip('unwired binding')");
    expect(stderr).toContain("tests/generated/b.bench.ts  bench.skip('placeholder bench')");
    // No unclassified section when there are none.
    expect(stderr).not.toContain('missing a PACKAGE_PLUMB classification');
  });

  it('lists every unclassified published package', async () => {
    runPlumbScanMock.mockResolvedValue({
      ok: false,
      skips: [],
      unclassified: ['@liteship/new-thing', '@liteship/another'],
      generatedPresent: true,
      generatedCorpusMessage: null,
    });
    const { exit, stderr } = await captureCli(() => plumb({ pretty: true }, scanDeps));
    expect(exit).toBe(1);
    expect(stderr).toContain('missing a PACKAGE_PLUMB classification');
    expect(stderr).toContain('? @liteship/new-thing');
    expect(stderr).toContain('? @liteship/another');
    // No skip section when there are none.
    expect(stderr).not.toContain('placeholder skip(s)');
  });

  it('a failing gate stays SILENT on stderr when pretty is off (receipt still exits 1)', async () => {
    runPlumbScanMock.mockResolvedValue({
      ok: false,
      skips: [{ file: 'tests/generated/c.test.ts', kind: 'test.skip', message: 'x' }],
      unclassified: [],
      generatedPresent: true,
      generatedCorpusMessage: null,
    });
    const { exit, stdout, stderr } = await captureCli(() => plumb({ pretty: false }, scanDeps));
    expect(exit).toBe(1);
    expect(lastReceipt(stdout)['status']).toBe('failed');
    expect(stderr).toBe('');
  });

  it('surfaces a missing generated-corpus failure even when no skips or packages are listed', async () => {
    runPlumbScanMock.mockResolvedValue({
      ok: false,
      skips: [],
      unclassified: [],
      generatedPresent: false,
      generatedCorpusMessage:
        'tests/generated/ has no generated test corpus; run `pnpm run capsule:compile` before `liteship plumb`.',
    });
    const { exit, stdout, stderr } = await captureCli(() => plumb({ pretty: true }, scanDeps));
    expect(exit).toBe(1);
    expect(lastReceipt(stdout)['status']).toBe('failed');
    expect(stderr).toContain('PLUMB GATE FAILED');
    expect(stderr).toContain('tests/generated/ has no generated test corpus');
  });
});
