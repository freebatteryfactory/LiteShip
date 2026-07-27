/** Failure signatures remain owned, replayable, and resolved only by an executed scar. @module */

import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildFlakeEvidence, type FlakeAttemptObservation } from '../../../scripts/lib/flake-evidence.js';
import {
  assertFlakeSignatureLedgerCurrent,
  buildFlakeSignatureLedger,
  parseFlakeSignatureLedger,
  serializeFlakeSignatureLedger,
} from '../../../scripts/lib/flake-signature-ledger.js';
import type { FlakeTarget } from '../../../scripts/test-flake-targets.js';
import { writeFlakeSignatureLedgerFile } from '../../../scripts/test-flake.js';

const SHA = 'a'.repeat(40);
const TARGET: FlakeTarget = {
  path: 'tests/unit/runtime-scar.test.ts',
  kind: 'node',
  owner: 'packages/core/src/runtime',
  provingScar: 'the deterministic runtime failure remains permanently replayable',
  remediation: 'repair the runtime owner and rerun this exact scar',
};

function campaign(target: FlakeTarget, date: string, codes: readonly number[], output = 'stable assertion signature') {
  const observations: FlakeAttemptObservation[] = codes.map((exitCode, index) => ({
    target: target.path,
    iteration: index + 1,
    verdict: exitCode === 0 ? 'pass' : 'fail',
    exitCode,
    stdoutTail: '',
    stderrTail: exitCode === 0 ? '' : output,
  }));
  return buildFlakeEvidence({
    targets: [target],
    observations,
    firstSha: SHA,
    lastSha: SHA,
    observedOn: date,
    expires: date === '2026-07-24' ? '2026-07-31' : '2026-08-01',
  });
}

describe('FlakeSignatureLedger', () => {
  it('clusters recurring signatures and resolves only after a later passing scar receipt', () => {
    const first = campaign(TARGET, '2026-07-24', [1, 1]);
    const healed = campaign(TARGET, '2026-07-25', [0, 0]);
    const ledger = buildFlakeSignatureLedger([first, healed]);

    expect(ledger.ledgerId).toMatch(/^sha256:[0-9a-f]{64}$/u);
    expect(ledger.signatures).toHaveLength(1);
    expect(ledger.signatures[0]).toMatchObject({
      owner: TARGET.owner,
      target: TARGET.path,
      firstSeen: '2026-07-24',
      lastSeen: '2026-07-24',
      occurrences: 2,
      reproducer: ['pnpm', 'exec', 'vitest', 'run', '--config', 'vitest.config.ts', TARGET.path],
      provingScar: TARGET.provingScar,
      status: 'resolved',
      scarReceipt: { verdict: 'pass', attempts: 2, sourceSha: SHA },
    });
    expect(parseFlakeSignatureLedger(JSON.parse(serializeFlakeSignatureLedger(ledger)) as unknown)).toEqual(ledger);
    expect(() =>
      assertFlakeSignatureLedgerCurrent(ledger, {
        evidence: [first, healed],
        headSha: SHA,
        targets: [TARGET],
        today: '2026-07-25',
      }),
    ).not.toThrow();
  });

  it('reopens a signature when the permanent scar disappears from the latest campaign', () => {
    const first = campaign(TARGET, '2026-07-24', [1]);
    const replacement: FlakeTarget = {
      ...TARGET,
      path: 'tests/unit/different-scar.test.ts',
      provingScar: 'an unrelated test cannot resolve the prior signature',
    };
    const latest = campaign(replacement, '2026-07-25', [0]);
    const ledger = buildFlakeSignatureLedger([first, latest]);

    expect(ledger.signatures[0]).toMatchObject({ status: 'reopened', scarReceipt: null });
  });

  it('keeps a same-campaign recovery open rather than retrying to green', () => {
    const evidence = campaign(TARGET, '2026-07-24', [1, 0, 0]);
    const ledger = buildFlakeSignatureLedger([evidence]);
    expect(ledger.signatures[0]).toMatchObject({ status: 'open', occurrences: 1 });
    expect(ledger.signatures[0]!.scarReceipt?.verdict).toBe('fail');
  });

  it('strictly refuses stale owner, reproducer, receipt, expiry, and ledger identity', () => {
    const first = campaign(TARGET, '2026-07-24', [1]);
    const healed = campaign(TARGET, '2026-07-25', [0]);
    const ledger = buildFlakeSignatureLedger([first, healed]);
    const entry = ledger.signatures[0]!;
    const mutations: readonly unknown[] = [
      { ...ledger, owner: 'foreign' },
      { ...ledger, expires: '2026-07-25' },
      { ...ledger, ledgerId: `sha256:${'0'.repeat(64)}` },
      { ...ledger, signatures: [{ ...entry, owner: '' }] },
      { ...ledger, signatures: [{ ...entry, reproducer: [] }] },
      {
        ...ledger,
        signatures: [
          {
            ...entry,
            scarReceipt: entry.scarReceipt && { ...entry.scarReceipt, receiptId: `sha256:${'0'.repeat(64)}` },
          },
        ],
      },
    ];
    for (const mutation of mutations) expect(() => parseFlakeSignatureLedger(mutation)).toThrow();
  });

  it('atomically persists and read-back admits the generated ledger', () => {
    const directory = mkdtempSync(join(tmpdir(), 'liteship-flake-ledger-'));
    try {
      const path = join(directory, 'flake-signature-ledger.json');
      const ledger = buildFlakeSignatureLedger([
        campaign(TARGET, '2026-07-24', [1]),
        campaign(TARGET, '2026-07-25', [0]),
      ]);
      expect(writeFlakeSignatureLedgerFile(path, ledger)).toEqual(ledger);
      expect(parseFlakeSignatureLedger(JSON.parse(readFileSync(path, 'utf8')) as unknown)).toEqual(ledger);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('rejects a ledger whose campaign evidence or target authority changed', () => {
    const first = campaign(TARGET, '2026-07-24', [1]);
    const healed = campaign(TARGET, '2026-07-25', [0]);
    const ledger = buildFlakeSignatureLedger([first, healed]);
    expect(() =>
      assertFlakeSignatureLedgerCurrent(ledger, {
        evidence: [first, campaign(TARGET, '2026-07-25', [0, 0])],
        headSha: SHA,
        targets: [TARGET],
        today: '2026-07-25',
      }),
    ).toThrow(/stale/u);
    expect(() =>
      assertFlakeSignatureLedgerCurrent(ledger, {
        evidence: [first, healed],
        headSha: SHA,
        targets: [{ ...TARGET, provingScar: 'removed or changed scar contract' }],
        today: '2026-07-25',
      }),
    ).toThrow(/stale/u);
  });
});
