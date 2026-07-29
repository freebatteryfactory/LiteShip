import { describe, expect, it } from 'vitest';
import {
  FACADE_FAILURE_PROOF_CONTRACT,
  FACADE_SUBPATH_CONTRACT,
} from '../../../packages/liteship/src/export-budget.js';
import {
  verifyExecutableFailureProof,
  verifyExecutableFailureProofSource,
  type ExecutableFailureProofContract,
} from '../../../scripts/lib/executable-failure-proof.js';
import { repoRoot } from '../../../vitest.shared.js';

const proof = FACADE_FAILURE_PROOF_CONTRACT['liteship/compiler']!;
const title = proof.test.slice(proof.test.indexOf('::') + 2);
const suite = title.slice(0, title.indexOf(' > '));
const test = title.slice(title.indexOf(' > ') + 3);

function source(body: string): string {
  return [
    "import { CSSCompiler } from '../../../packages/liteship/src/compiler.js';",
    "import { expect, it, describe } from 'vitest';",
    `describe(${JSON.stringify(suite)}, () => {`,
    `  it(${JSON.stringify(test)}, () => { ${body} });`,
    '});',
  ].join('\n');
}

function kinds(sourceText: string, contract: ExecutableFailureProofContract = proof): readonly string[] {
  return verifyExecutableFailureProofSource(sourceText, contract).map((finding) => finding.kind);
}

describe('facade failure-proof binding', () => {
  it('binds the compiler prose to one exact executable facade proof', () => {
    expect(verifyExecutableFailureProof(repoRoot, proof)).toEqual([]);
    expect(FACADE_SUBPATH_CONTRACT.find((entry) => entry.specifier === 'liteship/compiler')?.failureContract).toBe(
      'CSS state keys outside the boundary are omitted and emit the registered compiler/css/unknown-state-key diagnostic.',
    );
  });

  it('accepts the exact operation, diagnostic identity, and omission observation', () => {
    expect(
      kinds(
        source(
          "const result = CSSCompiler.compile(boundary, states); expect(result.raw).not.toContain('bad'); expect(events).toEqual([expect.objectContaining({ code: 'compiler/css/unknown-state-key' })]);",
        ),
      ),
    ).toEqual([]);
  });

  it('rejects empty and happy-only callbacks', () => {
    expect(kinds(source(''))).toEqual(['wrong-operation', 'wrong-observation']);
    expect(
      kinds(source("const result = CSSCompiler.compile(boundary, states); expect(result.raw).toContain('ok');")),
    ).toEqual(['wrong-observation']);
  });

  it('rejects a different compiler operation under the right title', () => {
    expect(
      kinds(
        source(
          "const result = CSSCompiler.serialize(compiled); expect(result.raw).not.toContain('bad'); expect(events).toEqual([expect.objectContaining({ code: 'compiler/css/unknown-state-key' })]);",
        ),
      ),
    ).toEqual(['wrong-operation']);
  });

  it('rejects a different diagnostic or a positive output assertion', () => {
    expect(
      kinds(
        source(
          "const result = CSSCompiler.compile(boundary, states); expect(result.raw).toContain('bad'); expect(events).toEqual([expect.objectContaining({ code: 'compiler/css/other' })]);",
        ),
      ),
    ).toEqual(['wrong-observation']);
  });

  it('rejects a renamed or duplicate exact proof identity', () => {
    expect(kinds(source('').replace(test, `${test} renamed`))).toEqual(['missing-proof']);
    const duplicate = `${source('')}\n${source('')}`;
    expect(kinds(duplicate)).toEqual(['ambiguous-proof']);
  });

  it('rejects empty file/title halves around the exact identity separator', () => {
    for (const testRef of ['::title', 'file.ts::', 'file.ts:', 'file.ts']) {
      expect(kinds(source(''), { ...proof, test: testRef as typeof proof.test })).toEqual(['missing-proof']);
    }
  });
});
