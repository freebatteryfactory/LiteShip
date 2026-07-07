import { describe, it, expect } from 'vitest';
import { detectEarlyReturnBeforeExpectAST } from '@czap/audit';
import { noEarlyReturnTestGate, verifyGate } from '@czap/gauntlet';

describe('detectEarlyReturnBeforeExpectAST', () => {
  it('flags if-guard return before expect', () => {
    const src = "it('x', () => {\n  if (!CAP) {\n    return;\n  }\n  expect(1).toBe(1);\n});\n";
    expect(detectEarlyReturnBeforeExpectAST(src).map((m) => m.line)).toEqual([3]);
  });

  it('allows skipIf and expect-first bodies', () => {
    const src =
      "it.skipIf(!CAP)('x', () => { expect(1).toBe(1); });\n" +
      "it('y', () => { expect(true).toBe(true); });\n";
    expect(detectEarlyReturnBeforeExpectAST(src)).toEqual([]);
  });

  it('does not flag beforeEach or array callbacks (non-runner invocations)', () => {
    const src =
      "beforeEach(() => {\n  if (!CAP) {\n    return;\n  }\n  expect(1).toBe(1);\n});\n" +
      "[1].map(() => {\n  if (x) return;\n  expect(1).toBe(1);\n});\n";
    expect(detectEarlyReturnBeforeExpectAST(src)).toEqual([]);
  });
});

describe('noEarlyReturnTestGate fixtures', () => {
  it('self-proves red/green/mutation', () => {
    const verdict = verifyGate(noEarlyReturnTestGate);
    expect(verdict.selfProven).toBe(true);
  });
});
