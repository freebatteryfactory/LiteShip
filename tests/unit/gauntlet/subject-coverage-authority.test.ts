import { describe, expect, it } from 'vitest';
import {
  defineGate,
  earnedAuthority,
  finding,
  memoryContext,
  runGates,
  verifyGate,
  type Gate,
  type GateContext,
  type GateSubjectCoverage,
} from '@liteship/gauntlet';

const DIGEST = `sha256:${'a'.repeat(64)}` as const;

function coverage(context: GateContext): GateSubjectCoverage {
  const opaque = context.readFile('coverage.opaque');
  return opaque === undefined
    ? {
        status: 'complete',
        enumerator: 'test/subject-census-v1',
        enumeratedCount: context.files().filter((file) => file.endsWith('.ts')).length,
        censusDigest: DIGEST,
      }
    : {
        status: 'opaque',
        enumerator: 'test/subject-census-v1',
        enumeratedCount: 0,
        censusDigest: DIGEST,
        reason: opaque,
      };
}

function subjectGate(): Gate {
  return defineGate({
    id: 'test/subject-coverage',
    extension: { namespace: 'test', owner: 'LiteShip test suite' },
    level: 'L4',
    describe: 'proves a discrete subject population before judging it',
    run: (context) =>
      context
        .files()
        .filter((file) => (context.readFile(file) ?? '').includes('orphan'))
        .map((file) =>
          finding({
            ruleId: 'test/subject-coverage',
            severity: 'error',
            level: 'L4',
            title: 'Orphan subject',
            detail: file,
            location: { file, line: 1 },
          }),
        ),
    subjectCoverage: coverage,
    fixtures: {
      red: { name: 'orphan subject', context: memoryContext({ 'bad.ts': 'orphan' }) },
      green: { name: 'connected subject', context: memoryContext({ 'good.ts': 'connected' }) },
      mutation: {
        describe: 'blind the detector',
        mutate: (gate) => ({ ...gate, run: () => [] }),
      },
    },
  });
}

describe('gate subject-coverage qualification', () => {
  it('admits a complete current-head census as the fourth proof axis', () => {
    const gate = subjectGate();
    const proof = verifyGate(gate, memoryContext({ 'connected.ts': 'connected' }));

    expect(proof).toMatchObject({
      redCaught: true,
      greenClean: true,
      mutationKilled: true,
      subjectCoverage: {
        status: 'complete',
        enumerator: 'test/subject-census-v1',
        enumeratedCount: 1,
        censusDigest: DIGEST,
      },
      selfProven: true,
    });
    expect(earnedAuthority(proof)).toBe('blocking');
  });

  it('fails closed and unwaivably when a required gate cannot enumerate its subjects', () => {
    const result = runGates(
      [subjectGate()],
      memoryContext({ 'connected.ts': 'connected', 'coverage.opaque': 'dynamic subject lookup escaped the census' }),
      {
        waivers: [
          {
            ruleId: 'gauntlet/authority-integrity',
            owner: 'nobody',
            reason: 'must not apply to engine-owned qualification defects',
            expires: '2999-01-01',
            blastRadius: 'none',
            debtScore: 0,
          },
        ],
      },
    );

    expect(result.blocked).toBe(true);
    expect(result.outcomes[0]).toMatchObject({
      authority: 'advisory',
      proof: {
        subjectCoverage: {
          status: 'opaque',
          reason: 'dynamic subject lookup escaped the census',
        },
        selfProven: false,
      },
    });
    expect(result.findings).toContainEqual(
      expect.objectContaining({
        ruleId: 'gauntlet/authority-integrity',
        severity: 'error',
        detail: expect.stringContaining('subject population is opaque'),
      }),
    );
  });

  it('records not-applicable only for a gate that declares no discrete subject census', () => {
    const gate = defineGate({
      id: 'test/corpus-predicate',
      extension: { namespace: 'test', owner: 'LiteShip test suite' },
      level: 'L1',
      describe: 'checks one predicate over the complete covered corpus',
      run: (context) =>
        context.files().some((file) => (context.readFile(file) ?? '').includes('bad'))
          ? [
              finding({
                ruleId: 'test/corpus-predicate',
                severity: 'error',
                level: 'L1',
                title: 'Bad corpus',
                detail: 'bad',
              }),
            ]
          : [],
      fixtures: {
        red: { name: 'bad', context: memoryContext({ 'bad.ts': 'bad' }) },
        green: { name: 'good', context: memoryContext({ 'good.ts': 'good' }) },
        mutation: { describe: 'blind', mutate: (candidate) => ({ ...candidate, run: () => [] }) },
      },
    });

    expect(verifyGate(gate).subjectCoverage).toEqual({ status: 'not-applicable' });
  });

  it('rejects malformed or accessor-backed receipts instead of treating unknown shapes as complete', () => {
    const malformed = subjectGate();
    Object.defineProperty(malformed, 'subjectCoverage', {
      configurable: true,
      value: () => ({
        status: 'complete',
        enumerator: 'test/subject-census-v1',
        enumeratedCount: -1,
        censusDigest: DIGEST,
      }),
    });
    expect(() => verifyGate(malformed)).toThrow(/enumeratedCount/u);

    const accessorReceipt = subjectGate();
    Object.defineProperty(accessorReceipt, 'subjectCoverage', {
      configurable: true,
      value: () => {
        const receipt = { status: 'complete', enumeratedCount: 1, censusDigest: DIGEST } as Record<string, unknown>;
        Object.defineProperty(receipt, 'enumerator', { enumerable: true, get: () => 'forged' });
        return receipt as unknown as GateSubjectCoverage;
      },
    });
    expect(() => verifyGate(accessorReceipt)).toThrow(/own data field/u);
  });
});
