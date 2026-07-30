import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { makeRepoIR, type AssuranceTargetReason, type McdcFacts, type MutationFacts } from '@liteship/gauntlet';
import {
  buildSemanticAssuranceReceipt,
  parseSemanticAssuranceReceipt,
  verifySemanticAssuranceReceipt,
  writeSemanticAssuranceReceipt,
} from '../../../../packages/cli/src/internal/semantic-assurance-receipt.js';
import type { AssuranceTargetSelection } from '../../../../packages/cli/src/internal/mutation-targets.js';

const FILE = 'packages/genui/src/index.ts';
const HELPER = 'packages/genui/src/render.ts';
const TOOLCHAIN = 'tc-sha256:test-toolchain';
const REASON: AssuranceTargetReason = {
  kind: 'semantic-campaign',
  campaignId: 'wave5/genui-semantic',
  owner: '@liteship/genui',
  class: 'semantic-l4',
  required: ['mutation', 'mcdc'],
};

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function ir(digest = 'blake3:file-a', includeHelper = false) {
  return makeRepoIR({
    files: [
      { id: FILE, contentDigest: digest, packageName: '@liteship/genui' },
      ...(includeHelper ? [{ id: HELPER, contentDigest: 'blake3:file-b', packageName: '@liteship/genui' }] : []),
    ],
  });
}

function selection(includeHelper = false): AssuranceTargetSelection {
  return {
    expectedTargets: [
      { file: FILE, reasons: [REASON] },
      ...(includeHelper ? [{ file: HELPER, reasons: [REASON] }] : []),
    ],
    unresolvedEntrypoints: [],
  };
}

function mutationFacts(over: Partial<MutationFacts> = {}): MutationFacts {
  return {
    outcomes: [
      {
        mutantId: 'blake3:mutant',
        verdict: 'killed',
        file: FILE,
        line: 1,
        column: 1,
        operator: 'equality',
        originalText: '===',
        mutatedText: '!==',
        coveringTests: ['tests/property/genui/catalog.prop.test.ts'],
        equivalentJustification: null,
        equivalentJustificationDigest: null,
        inconclusiveReason: null,
        subsumedBy: [],
      },
    ],
    targetCensus: [{ file: FILE, applicableMutants: 1, reasons: [REASON] }],
    operatorApplicability: [{ file: FILE, operator: 'equality', applicableMutants: 1 }],
    scoreBaseline: {},
    ...over,
  };
}

describe('semantic assurance execution receipt', () => {
  it('classifies malformed and tampered receipts through distinct tagged errors', () => {
    let malformed: unknown = null;
    try {
      parseSemanticAssuranceReceipt(null);
    } catch (error) {
      malformed = error;
    }
    expect(malformed).toMatchObject({ _tag: 'ParseError', source: 'semantic-assurance-receipt' });

    const receipt = buildSemanticAssuranceReceipt({
      mode: 'mutation',
      facts: mutationFacts(),
      ir: ir(),
      toolchainDigest: TOOLCHAIN,
    });
    let tampered: unknown = null;
    try {
      parseSemanticAssuranceReceipt({ ...receipt, receiptId: `sha256:${'0'.repeat(64)}` });
    } catch (error) {
      tampered = error;
    }
    expect(tampered).toMatchObject({ _tag: 'IntegrityError', subject: 'semantic-assurance-receipt' });
  });
  it('is deterministic, self-addressed, parseable, and independently bound to the live selection', () => {
    const first = buildSemanticAssuranceReceipt({
      mode: 'mutation',
      facts: mutationFacts(),
      ir: ir(),
      toolchainDigest: TOOLCHAIN,
    });
    const second = buildSemanticAssuranceReceipt({
      mode: 'mutation',
      facts: mutationFacts(),
      ir: ir(),
      toolchainDigest: TOOLCHAIN,
    });
    expect(second).toEqual(first);
    expect(first.receiptId).toMatch(/^sha256:[0-9a-f]{64}$/u);
    expect(first.verdict).toBe('pass');
    const parsed = parseSemanticAssuranceReceipt(JSON.parse(JSON.stringify(first)));
    expect(() =>
      verifySemanticAssuranceReceipt(parsed, {
        mode: 'mutation',
        ir: ir(),
        selection: selection(),
        toolchainDigest: TOOLCHAIN,
      }),
    ).not.toThrow();
  });

  it('rejects stale source bytes, a partial target census, and a foreign toolchain', () => {
    const receipt = buildSemanticAssuranceReceipt({
      mode: 'mutation',
      facts: mutationFacts(),
      ir: ir(),
      toolchainDigest: TOOLCHAIN,
    });
    expect(() =>
      verifySemanticAssuranceReceipt(receipt, {
        mode: 'mutation',
        ir: ir('blake3:changed'),
        selection: selection(),
        toolchainDigest: TOOLCHAIN,
      }),
    ).toThrow(/stale/u);
    expect(() =>
      verifySemanticAssuranceReceipt(receipt, {
        mode: 'mutation',
        ir: ir('blake3:file-a', true),
        selection: selection(true),
        toolchainDigest: TOOLCHAIN,
      }),
    ).toThrow(/stale/u);
    expect(() =>
      verifySemanticAssuranceReceipt(receipt, {
        mode: 'mutation',
        ir: ir(),
        selection: selection(),
        toolchainDigest: 'tc-sha256:foreign',
      }),
    ).toThrow(/toolchain/u);
  });

  it('rejects forged fields, tampered identity, and a failing execution receipt', () => {
    const receipt = buildSemanticAssuranceReceipt({
      mode: 'mutation',
      facts: mutationFacts(),
      ir: ir(),
      toolchainDigest: TOOLCHAIN,
    });
    const forgedReason = JSON.parse(JSON.stringify(receipt)) as Record<string, unknown>;
    const forgedTargets = forgedReason['targets'] as Record<string, unknown>[];
    (forgedTargets[0]!['reasons'] as Record<string, unknown>[])[0]!['waived'] = true;
    expect(() => parseSemanticAssuranceReceipt(forgedReason)).toThrow(/reason keys/u);

    const tampered = JSON.parse(JSON.stringify(receipt)) as Record<string, unknown>;
    tampered['receiptId'] = `sha256:${'0'.repeat(64)}`;
    expect(() => parseSemanticAssuranceReceipt(tampered)).toThrow(/identity mismatch/u);

    const failed = buildSemanticAssuranceReceipt({
      mode: 'mutation',
      facts: mutationFacts({
        outcomes: [{ ...mutationFacts().outcomes[0]!, verdict: 'survived' }],
      }),
      ir: ir(),
      toolchainDigest: TOOLCHAIN,
    });
    expect(failed.verdict).toBe('fail');
    expect(() =>
      verifySemanticAssuranceReceipt(failed, {
        mode: 'mutation',
        ir: ir(),
        selection: selection(),
        toolchainDigest: TOOLCHAIN,
      }),
    ).toThrow(/did not pass/u);
  });

  it('rejects evaluated mutation and MC/DC facts that name no executed test', () => {
    const mutation = mutationFacts({
      outcomes: [{ ...mutationFacts().outcomes[0]!, coveringTests: [] }],
    });
    expect(() =>
      buildSemanticAssuranceReceipt({ mode: 'mutation', facts: mutation, ir: ir(), toolchainDigest: TOOLCHAIN }),
    ).toThrow(/no executed tests/u);

    const mcdc: McdcFacts = {
      conditions: [
        {
          conditionId: 'blake3:condition',
          file: FILE,
          line: 1,
          column: 1,
          decision: 'a && b',
          condition: 'a',
          forceTrueVerdict: 'killed',
          forceFalseVerdict: 'killed',
          forceTrueInconclusiveReason: null,
          forceFalseInconclusiveReason: null,
          coveringTests: [],
        },
      ],
      targetCensus: [{ file: FILE, applicableConditions: 1, reasons: [REASON] }],
    };
    expect(() =>
      buildSemanticAssuranceReceipt({ mode: 'mcdc', facts: mcdc, ir: ir(), toolchainDigest: TOOLCHAIN }),
    ).toThrow(/no executed tests/u);
  });

  it('an INCONCLUSIVE outcome fails its target with closing counts (PR #192 review — no unproven pass)', () => {
    const facts = mutationFacts({
      outcomes: [
        {
          ...mutationFacts().outcomes[0]!,
          verdict: 'inconclusive',
          inconclusiveReason: 'the vitest subprocess exceeded the per-mutant budget',
        },
      ],
    });
    const receipt = buildSemanticAssuranceReceipt({ mode: 'mutation', facts, ir: ir(), toolchainDigest: TOOLCHAIN });
    const target = receipt.targets[0]!;
    expect(target.verdict).toBe('fail');
    expect(target.inconclusive).toBe(1);
    expect(target.killed + target.survived + target.noCoverage + target.equivalent + target.inconclusive).toBe(
      target.evaluated,
    );
    expect(receipt.verdict).toBe('fail');
    // The widened schema round-trips through the independent parser.
    expect(parseSemanticAssuranceReceipt(JSON.parse(JSON.stringify(receipt)))).toEqual(receipt);
  });

  it('executedTests records only EXECUTION-PROVING outcomes — a refusal cannot claim its requested tests ran (PR #192 review, round 6)', () => {
    // coveringTests is what the runner was ASKED to run; for an inconclusive
    // outcome the refusal reason (timeout, spawn failure, zero-test run) may
    // prove NOTHING executed. Only a killed/survived verdict proves execution
    // (the runner keys those on confirmed test counts), so only those
    // outcomes may feed the receipt's executedTests.
    const base = mutationFacts().outcomes[0]!;
    const refused = buildSemanticAssuranceReceipt({
      mode: 'mutation',
      facts: mutationFacts({
        outcomes: [
          {
            ...base,
            verdict: 'inconclusive',
            inconclusiveReason: 'the vitest subprocess failed to spawn — zero tests executed',
          },
        ],
      }),
      ir: ir(),
      toolchainDigest: TOOLCHAIN,
    });
    expect(refused.targets[0]!.executedTests).toEqual([]);
    expect(refused.targets[0]!.verdict).toBe('fail');
    // A mixed target keeps exactly the tests a conclusive verdict proves ran.
    const mixed = buildSemanticAssuranceReceipt({
      mode: 'mutation',
      facts: mutationFacts({
        outcomes: [
          base,
          {
            ...base,
            mutantId: 'blake3:mutant-2',
            line: 2,
            verdict: 'inconclusive',
            inconclusiveReason: 'the per-mutant budget expired',
            coveringTests: ['tests/unit/genui/other.test.ts'],
          },
        ],
        targetCensus: [{ file: FILE, applicableMutants: 2, reasons: [REASON] }],
        operatorApplicability: [{ file: FILE, operator: 'equality', applicableMutants: 2 }],
      }),
      ir: ir(),
      toolchainDigest: TOOLCHAIN,
    });
    expect(mixed.targets[0]!.executedTests).toEqual(['tests/property/genui/catalog.prop.test.ts']);
    // MC/DC, per pin: a condition with at least one conclusive pin proves its
    // covering tests ran; an all-inconclusive condition proves nothing — and
    // an ALL-refused target records executedTests: [] and FAILS, never throws
    // (the anti-lie throw is for conclusive claims without tests, not for a
    // campaign whose runner refused everything).
    const mcdcCondition = {
      conditionId: 'blake3:condition',
      file: FILE,
      line: 1,
      column: 1,
      decision: 'a && b',
      condition: 'a',
      forceTrueVerdict: 'killed',
      forceFalseVerdict: 'inconclusive',
      forceTrueInconclusiveReason: null,
      forceFalseInconclusiveReason: 'spawn refused',
      coveringTests: ['tests/property/genui/catalog.prop.test.ts'],
    } as const;
    const mcdcMixed: McdcFacts = {
      conditions: [
        mcdcCondition,
        {
          ...mcdcCondition,
          conditionId: 'blake3:condition-2',
          line: 2,
          forceTrueVerdict: 'inconclusive',
          forceTrueInconclusiveReason: 'spawn refused',
          coveringTests: ['tests/unit/genui/other.test.ts'],
        },
      ],
      targetCensus: [{ file: FILE, applicableConditions: 2, reasons: [REASON] }],
    };
    const mcdcReceipt = buildSemanticAssuranceReceipt({
      mode: 'mcdc',
      facts: mcdcMixed,
      ir: ir(),
      toolchainDigest: TOOLCHAIN,
    });
    expect(mcdcReceipt.targets[0]!.executedTests).toEqual(['tests/property/genui/catalog.prop.test.ts']);
    const mcdcRefused: McdcFacts = {
      conditions: [
        { ...mcdcCondition, forceTrueVerdict: 'inconclusive', forceTrueInconclusiveReason: 'spawn refused' },
      ],
      targetCensus: [{ file: FILE, applicableConditions: 1, reasons: [REASON] }],
    };
    const mcdcRefusedReceipt = buildSemanticAssuranceReceipt({
      mode: 'mcdc',
      facts: mcdcRefused,
      ir: ir(),
      toolchainDigest: TOOLCHAIN,
    });
    expect(mcdcRefusedReceipt.targets[0]!.executedTests).toEqual([]);
    expect(mcdcRefusedReceipt.targets[0]!.verdict).toBe('fail');
  });

  it('records zero applicability explicitly without manufacturing test execution', () => {
    const receipt = buildSemanticAssuranceReceipt({
      mode: 'mutation',
      facts: mutationFacts({
        outcomes: [],
        targetCensus: [{ file: FILE, applicableMutants: 0, reasons: [REASON] }],
        operatorApplicability: [],
      }),
      ir: ir(),
      toolchainDigest: TOOLCHAIN,
    });
    expect(receipt.targets[0]).toMatchObject({
      applicable: 0,
      evaluated: 0,
      executedTests: [],
      verdict: 'not-applicable',
    });
    expect(receipt.verdict).toBe('pass');
    expect(() => parseSemanticAssuranceReceipt(JSON.parse(JSON.stringify(receipt)))).not.toThrow();
  });

  it('writes the exact addressed document atomically to the mode-owned report path', () => {
    const root = mkdtempSync(join(tmpdir(), 'liteship-assurance-receipt-'));
    roots.push(root);
    const receipt = buildSemanticAssuranceReceipt({
      mode: 'mutation',
      facts: mutationFacts(),
      ir: ir(),
      toolchainDigest: TOOLCHAIN,
    });
    const path = writeSemanticAssuranceReceipt(root, receipt);
    expect(path).toBe('reports/semantic-assurance-mutation.json');
    expect(parseSemanticAssuranceReceipt(JSON.parse(readFileSync(join(root, path), 'utf8')))).toEqual(receipt);
  });
});
