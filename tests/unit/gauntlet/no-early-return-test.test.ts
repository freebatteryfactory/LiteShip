import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { globSync } from 'fast-glob';
import { describe, it, expect } from 'vitest';
import { detectEarlyReturnBeforeExpectAST } from '@liteship/audit';
import {
  detectEarlyReturnBeforeExpect,
  earlyReturnDivergenceGate,
  noEarlyReturnTestGate,
  verifyGate,
} from '@liteship/gauntlet';

// Measured at 10.9 s over the 1,000+ governed test files on the 2026-07-31
// Windows reference host; the doubled ceiling keeps the corpus proof bounded.
const ORACLE_CORPUS_TIMEOUT_MS = 22_000;

describe('detectEarlyReturnBeforeExpectAST', () => {
  it('flags if-guard return before expect', () => {
    const src = "it('x', () => {\n  if (!CAP) {\n    return;\n  }\n  expect(1).toBe(1);\n});\n";
    expect(detectEarlyReturnBeforeExpectAST(src).map((m) => m.line)).toEqual([3]);
  });

  it('allows skipIf and expect-first bodies', () => {
    const src =
      "it.skipIf(!CAP)('x', () => { expect(1).toBe(1); });\n" + "it('y', () => { expect(true).toBe(true); });\n";
    expect(detectEarlyReturnBeforeExpectAST(src)).toEqual([]);
  });

  it('does not flag beforeEach or array callbacks (non-runner invocations)', () => {
    const src =
      'beforeEach(() => {\n  if (!CAP) {\n    return;\n  }\n  expect(1).toBe(1);\n});\n' +
      '[1].map(() => {\n  if (x) return;\n  expect(1).toBe(1);\n});\n';
    expect(detectEarlyReturnBeforeExpectAST(src)).toEqual([]);
  });
});

describe('suite-root callbacks', () => {
  it('a describe-level capability guard is not an early-return finding', () => {
    const source =
      "describe('gpu', () => {\n  if (!hasGPU) return;\n  it('works', () => { expect(true).toBe(true); });\n});\n";
    expect(detectEarlyReturnBeforeExpectAST(source)).toEqual([]);
  });

  it('an it-level early return before expect is still a finding', () => {
    const source = "it('gpu', () => {\n  if (!hasGPU) return;\n  expect(true).toBe(true);\n});\n";
    expect(detectEarlyReturnBeforeExpectAST(source).map(({ line }) => line)).toEqual([2]);
    expect(detectEarlyReturnBeforeExpect(source).map(({ line }) => line)).toEqual([2]);
  });

  it(
    'the AST and lean oracles agree on every corpus file',
    () => {
      const root = resolve(import.meta.dirname, '../../..');
      const divergences: string[] = [];
      const files = globSync(['tests/**/*.test.ts', 'tests/**/*.prop.test.ts'], {
        cwd: root,
        ignore: ['tests/generated/**'],
        onlyFiles: true,
      }).sort();
      expect(files.length).toBeGreaterThan(0);
      for (const file of files) {
        const source = readFileSync(resolve(root, file), 'utf8');
        const ast = detectEarlyReturnBeforeExpectAST(source).map(({ line }) => line);
        const lean = detectEarlyReturnBeforeExpect(source).map(({ line }) => line);
        if (JSON.stringify(ast) !== JSON.stringify(lean)) {
          divergences.push(`${file}: AST=${ast.join(',')} lean=${lean.join(',')}`);
        }
      }
      expect(divergences).toEqual([]);
    },
    ORACLE_CORPUS_TIMEOUT_MS,
  );
});

describe('detectEarlyReturnBeforeExpect lean fallback', () => {
  it('ignores fixture strings that mention test bodies and return statements', () => {
    const src =
      'const fixture = "it(\'x\', () => {\\n  if (!CAP) {\\n    return;\\n  }\\n  expect(1).toBe(1);\\n});\\n";\n';
    expect(detectEarlyReturnBeforeExpect(src)).toEqual([]);
  });

  it('still flags real early returns in code', () => {
    const src = "it('x', () => {\n  if (!CAP) return;\n  expect(1).toBe(1);\n});\n";
    expect(detectEarlyReturnBeforeExpect(src).map((m) => m.line)).toEqual([2]);
  });

  it('ignores nested callback and object-method returns before the test assertion', () => {
    const src =
      "it('x', () => {\n" +
      '  fn.mockImplementation((value) => {\n' +
      "    if (value) return 'mocked';\n" +
      "    return '';\n" +
      '  });\n' +
      '  const obj = { async get() {\n' +
      "    return 'value';\n" +
      '  } };\n' +
      '  expect(obj).toBeDefined();\n' +
      '});\n';
    expect(detectEarlyReturnBeforeExpect(src)).toEqual([]);
  });

  it('does not treat ordinary .test() method calls as test runners', () => {
    const src =
      "function classify(pattern, output) {\n  if (pattern.test(output)) return 'match';\n  return null;\n}\n";
    expect(detectEarlyReturnBeforeExpect(src)).toEqual([]);
  });

  it('ignores returns inside static class methods declared in a test body', () => {
    const src =
      "test('x', () => {\n" +
      '  class FakeURL {\n' +
      '    static canParse(): boolean {\n' +
      '      return true;\n' +
      '    }\n' +
      '  }\n' +
      '  expect(FakeURL.canParse()).toBe(true);\n' +
      '});\n';
    expect(detectEarlyReturnBeforeExpect(src)).toEqual([]);
  });

  it('ignores returns inside methods whose return type contains a function type', () => {
    // The annotation scan must not stop at the `=` of a function-type arrow
    // (`(() => void)`): halting there rejects the method head, so its bare
    // `return;` would count against the enclosing test and falsely block it.
    const src =
      "test('x', () => {\n" +
      '  class Host {\n' +
      '    run(): (() => void) | undefined {\n' +
      '      return;\n' +
      '    }\n' +
      '  }\n' +
      '  expect(Host).toBeDefined();\n' +
      '});\n';
    expect(detectEarlyReturnBeforeExpect(src)).toEqual([]);
  });

  it('scans long method heads without treating nested returns as test exits', () => {
    const parameters = Array.from({ length: 2_000 }, (_, index) => `p${index}: string`).join(', ');
    const src =
      "test('x', () => {\n" +
      `  class Fixture { static async load(${parameters}): Promise<string> {\n` +
      "    return 'nested';\n" +
      '  } }\n' +
      '  expect(Fixture).toBeDefined();\n' +
      '});\n';
    expect(detectEarlyReturnBeforeExpect(src)).toEqual([]);
  });
});

describe('noEarlyReturnTestGate fixtures', () => {
  it('self-proves red/green/mutation', () => {
    const verdict = verifyGate(noEarlyReturnTestGate);
    expect(verdict.selfProven).toBe(true);
  });

  it('self-proves the parser-vs-token divergence instance', () => {
    expect(verifyGate(earlyReturnDivergenceGate).selfProven).toBe(true);
  });
});
