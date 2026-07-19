import { describe, it, expect } from 'vitest';
import { detectEarlyReturnBeforeExpectAST } from '@liteship/audit';
import { detectEarlyReturnBeforeExpect, noEarlyReturnTestGate, verifyGate } from '@liteship/gauntlet';

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

describe('detectEarlyReturnBeforeExpect lean fallback', () => {
  it('ignores fixture strings that mention test bodies and return statements', () => {
    const src = "const fixture = \"it('x', () => {\\n  if (!CAP) {\\n    return;\\n  }\\n  expect(1).toBe(1);\\n});\\n\";\n";
    expect(detectEarlyReturnBeforeExpect(src)).toEqual([]);
  });

  it('still flags real early returns in code', () => {
    const src = "it('x', () => {\n  if (!CAP) return;\n  expect(1).toBe(1);\n});\n";
    expect(detectEarlyReturnBeforeExpect(src).map((m) => m.line)).toEqual([2]);
  });

  it('ignores nested callback and object-method returns before the test assertion', () => {
    const src =
      "it('x', () => {\n" +
      "  fn.mockImplementation((value) => {\n" +
      "    if (value) return 'mocked';\n" +
      "    return '';\n" +
      "  });\n" +
      "  const obj = { async get() {\n" +
      "    return 'value';\n" +
      "  } };\n" +
      "  expect(obj).toBeDefined();\n" +
      "});\n";
    expect(detectEarlyReturnBeforeExpect(src)).toEqual([]);
  });

  it('does not treat ordinary .test() method calls as test runners', () => {
    const src = "function classify(pattern, output) {\n  if (pattern.test(output)) return 'match';\n  return null;\n}\n";
    expect(detectEarlyReturnBeforeExpect(src)).toEqual([]);
  });

  it('ignores returns inside static class methods declared in a test body', () => {
    const src =
      "test('x', () => {\n" +
      "  class FakeURL {\n" +
      "    static canParse(): boolean {\n" +
      "      return true;\n" +
      "    }\n" +
      "  }\n" +
      "  expect(FakeURL.canParse()).toBe(true);\n" +
      "});\n";
    expect(detectEarlyReturnBeforeExpect(src)).toEqual([]);
  });
});

describe('noEarlyReturnTestGate fixtures', () => {
  it('self-proves red/green/mutation', () => {
    const verdict = verifyGate(noEarlyReturnTestGate);
    expect(verdict.selfProven).toBe(true);
  });
});
