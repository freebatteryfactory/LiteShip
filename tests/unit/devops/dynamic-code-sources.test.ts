/**
 * Shipped non-TypeScript sources carry no dynamic code evaluation.
 *
 * The defect class (PR #185 review): the blocking ESLint `no-eval` /
 * `no-new-func` / `no-implied-eval` authority sweeps only `**​/*.ts`, so an
 * `eval` in published Astro frontmatter (e.g. `packages/astro/src/Adaptive.astro`)
 * would pass `check/lint` untouched. This law is the equivalent authority for
 * every shipped `.astro`/`.js`/`.mjs`/`.cjs` under `packages/<pkg>/src`.
 */
import { describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { classifyDynamicCodeLine, scanShippedDynamicCode } from '../../../scripts/lib/dynamic-code-residue.js';

const ROOT = resolve(import.meta.dirname, '../../..');

describe('dynamic code in shipped non-TypeScript sources', () => {
  it('the shipped tree has zero findings and the sweep saw the real population', () => {
    const scan = scanShippedDynamicCode(ROOT);
    expect(scan.findings).toEqual([]);
    // Anti-vacuity: the one currently-shipped non-.ts runtime source must be in
    // the swept inventory — if the walk stops finding it, the zero above is hollow.
    expect(scan.swept).toContain('packages/astro/src/Adaptive.astro');
    expect(scan.swept.length).toBeGreaterThan(0);
  });

  it('classifies every dynamic-code form by name (negative controls)', () => {
    expect(classifyDynamicCodeLine('const v = eval(input);')).toBe('EVAL_CALL');
    expect(classifyDynamicCodeLine('const f = new Function("return 1");')).toBe('FUNCTION_CONSTRUCTOR');
    expect(classifyDynamicCodeLine('const g = Function("return 1");')).toBe('FUNCTION_CONSTRUCTOR');
    expect(classifyDynamicCodeLine('setTimeout("doWork()", 100);')).toBe('STRING_TIMER');
    expect(classifyDynamicCodeLine("setInterval('tick()', 5);")).toBe('STRING_TIMER');
  });

  it('does not misclassify ordinary code or prose about the rules', () => {
    expect(classifyDynamicCodeLine('setTimeout(() => tick(), 5);')).toBeNull();
    expect(classifyDynamicCodeLine('if (isFunction(handler)) handler();')).toBeNull();
    expect(classifyDynamicCodeLine('const kind: Function = fn;')).toBeNull();
    expect(classifyDynamicCodeLine('evaluate(model);')).toBeNull();
    expect(classifyDynamicCodeLine('// never call eval( on user input')).toBeNull();
    expect(classifyDynamicCodeLine(' * eval( is banned by this law')).toBeNull();
  });

  it('the scanner reds a planted eval in a shipped .astro source (executed mutant)', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'liteship-dynamic-code-'));
    try {
      const src = join(fixture, 'packages', 'evil', 'src');
      mkdirSync(src, { recursive: true });
      writeFileSync(join(src, 'Component.astro'), '---\nconst v = eval(Astro.props.code);\n---\n<div>{v}</div>\n');
      const scan = scanShippedDynamicCode(fixture);
      expect(scan.findings).toEqual([
        {
          file: 'packages/evil/src/Component.astro',
          line: 2,
          kind: 'EVAL_CALL',
          text: 'const v = eval(Astro.props.code);',
        },
      ]);
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });
});
