// @vitest-environment node

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  committedSourceEffectiveDate,
  OBLIGATIONS_LEDGER_PATH,
  projectGovernedExceptions,
  TESTING_LEDGER_PATH,
} from '../../../scripts/lib/governed-exceptions.js';
import { STANDARDS_WAIVERS_PATH } from '../../../packages/cli/src/lib/standards-surface.js';
import { GOVERNED_EFFECTIVE_DATE, GOVERNED_NOW, governedExceptionSources } from '../../support/governed-exceptions.js';

const effectiveDateOf = (): string => GOVERNED_EFFECTIVE_DATE;

describe('governed exception view', () => {
  test('projects each canonical owner exactly without becoming a fourth policy owner', () => {
    const view = projectGovernedExceptions(governedExceptionSources(), GOVERNED_NOW, effectiveDateOf);
    expect(view).toHaveLength(3);
    expect(view.map(({ sourceKind }) => sourceKind)).toEqual([
      'obligation',
      'standards-signoff',
      'testing-ledger-waiver',
    ]);
    expect(view).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          owner: 'standards-owner',
          scope: expect.stringContaining('skip-allowlist-added'),
          rationale: 'The capability-gated body runs on the qualified host.',
          compensatingProof: 'The live capability-gated test is the compensating execution proof.',
          effectiveDate: GOVERNED_EFFECTIVE_DATE,
          expiry: '2027-01-01',
          status: 'active',
          sourceKind: 'standards-signoff',
          sourcePath: STANDARDS_WAIVERS_PATH,
        }),
        expect.objectContaining({
          owner: 'testing-owner',
          sourceId: 'INV-FIXTURE',
          sourcePath: TESTING_LEDGER_PATH,
          compensatingProof: 'A broader generated property currently exercises the same transition law.',
        }),
        expect.objectContaining({
          owner: 'obligation-owner',
          sourceId: 'OBL-FIXTURE-DEBT',
          sourcePath: OBLIGATIONS_LEDGER_PATH,
          compensatingProof: expect.stringContaining('packages/example/src/index.ts'),
        }),
      ]),
    );
    expect(Object.isFrozen(view)).toBe(true);
    expect(view.every(Object.isFrozen)).toBe(true);
  });

  test('a standards sign-off absent from the live signed partition is stale and fails closed', () => {
    const sources = governedExceptionSources();
    expect(() =>
      projectGovernedExceptions(
        {
          ...sources,
          standardsIntegrity: {
            ...sources.standardsIntegrity,
            facts:
              sources.standardsIntegrity._tag === 'active'
                ? { ...sources.standardsIntegrity.facts, signedWeakenings: [] }
                : neverSources(),
          },
        },
        GOVERNED_NOW,
        effectiveDateOf,
      ),
    ).toThrow(/is stale/);
  });

  test('expired testing waivers and obligations fail closed', () => {
    const sources = governedExceptionSources();
    expect(() =>
      projectGovernedExceptions(
        {
          ...sources,
          traceability: {
            ...sources.traceability,
            invariants: sources.traceability.invariants.map((invariant) => ({
              ...invariant,
              state:
                invariant.state._tag === 'waived'
                  ? { ...invariant.state, _tag: 'expired' as const, expiry: '2026-01-01' }
                  : invariant.state,
            })),
          },
        },
        GOVERNED_NOW,
        effectiveDateOf,
      ),
    ).toThrow(/is expired/);

    expect(() =>
      projectGovernedExceptions(
        {
          ...sources,
          obligations: {
            ...sources.obligations,
            obligations: sources.obligations.obligations.map((record) => ({ ...record, reviewBy: '2026-01-01' })),
          },
        },
        GOVERNED_NOW,
        effectiveDateOf,
      ),
    ).toThrow(/is expired/);
  });

  test('missing provenance, malformed dates, and obligation divergences fail closed', () => {
    const sources = governedExceptionSources();
    expect(() => projectGovernedExceptions(sources, GOVERNED_NOW, () => '')).toThrow(/malformed effective date/);
    expect(() => projectGovernedExceptions(sources, GOVERNED_NOW, () => '2026-02-31')).toThrow(
      /impossible effective date/,
    );
    expect(() =>
      projectGovernedExceptions(
        {
          ...sources,
          obligations: {
            ...sources.obligations,
            divergences: [
              {
                kind: 'unregistered-obligation',
                obligationId: 'OBL-PHANTOM',
                detail: 'fixture divergence',
                subject: 'packages/example/src/index.ts',
              },
            ],
          },
        },
        GOVERNED_NOW,
        effectiveDateOf,
      ),
    ).toThrow(/source-marker divergences/);
  });

  test('inactive standards authority cannot yield a green exception view', () => {
    const sources = governedExceptionSources();
    expect(() =>
      projectGovernedExceptions(
        {
          ...sources,
          standardsIntegrity: { _tag: 'inactive', baseRef: 'missing', message: 'no independent baseline' },
        },
        GOVERNED_NOW,
        effectiveDateOf,
      ),
    ).toThrow(/inactive standards authority/);
  });

  test('committed source provenance supplies the effective date and dirty source fails closed', async () => {
    const root = mkdtempSync(join(tmpdir(), 'liteship-governed-exceptions-'));
    try {
      mkdirSync(join(root, 'traceability'), { recursive: true });
      for (const path of [STANDARDS_WAIVERS_PATH, TESTING_LEDGER_PATH, OBLIGATIONS_LEDGER_PATH]) {
        writeFileSync(join(root, path), `${path}\n`);
      }
      const calls: string[][] = [];
      const cleanGit = async (args: readonly string[], cwd: string) => {
        expect(cwd).toBe(root);
        calls.push([...args]);
        return args[0] === 'log' ? { exitCode: 0, stdout: '2026-07-01\n' } : { exitCode: 0, stdout: '' };
      };
      const resolveDate = await committedSourceEffectiveDate(root, cleanGit);
      expect(resolveDate(STANDARDS_WAIVERS_PATH)).toBe('2026-07-01');
      expect(resolveDate(TESTING_LEDGER_PATH)).toBe('2026-07-01');
      expect(resolveDate(OBLIGATIONS_LEDGER_PATH)).toBe('2026-07-01');
      expect(calls.filter(([command]) => command === 'log')).toHaveLength(3);

      const dirtyGit = async (args: readonly string[]) => ({
        exitCode: args.includes(TESTING_LEDGER_PATH) && args[0] === 'diff' && !args.includes('--cached') ? 1 : 0,
        stdout: args[0] === 'log' ? '2026-07-01\n' : '',
      });
      await expect(committedSourceEffectiveDate(root, dirtyGit)).rejects.toThrow(/no clean committed provenance/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

function neverSources(): never {
  throw new Error('fixture expected active standards facts');
}
