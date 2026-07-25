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
} from '../../../../packages/cli/src/lib/semantic-assurance-receipt.js';
import type { AssuranceTargetSelection } from '../../../../packages/cli/src/lib/mutation-targets.js';

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
          coveringTests: [],
        },
      ],
      targetCensus: [{ file: FILE, applicableConditions: 1, reasons: [REASON] }],
    };
    expect(() =>
      buildSemanticAssuranceReceipt({ mode: 'mcdc', facts: mcdc, ir: ir(), toolchainDigest: TOOLCHAIN }),
    ).toThrow(/no executed tests/u);
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
