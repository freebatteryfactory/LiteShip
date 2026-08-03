/**
 * Historical attack-shape corpus for the security boundaries repaired after the
 * CodeQL #3-#33 census. The corpus remains executable even when a defect becomes
 * structurally impossible: recreating the old input shape must stay safe.
 */
import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { resolveImport, type PackageExportTarget } from '../../packages/audit/src/structure.js';
import { parseRootScriptCheckExecution } from '../../packages/command/src/checks/definition.js';
import { compileViewTransition } from '../../packages/compiler/src/view-transition-compile.js';
import { classifyBenchSource } from '../../packages/core/src/evidence/bench-classify.js';
import { parseTypedBinding } from '../../packages/core/src/motion/interpolate.js';
import { projectNameFromDir } from '../../packages/create-liteship/src/scaffold.js';
import { detectEarlyReturnBeforeExpect } from '../../packages/gauntlet/src/gates/early-return-detect.js';
import { parseWgslCastValue } from '../../packages/vite/src/boundary-manifest.js';
import { parseEventId } from '../../packages/web/src/stream/resumption-pure.js';
import { escapeMarkdownTableCell } from '../../scripts/audit/report.js';
import { resolveSameOriginHttpReference } from '../../scripts/lib/cloudflare-dev-contract.js';
import { testCssEscape } from '../helpers/css-escape.js';

const hostileAtom = fc.constantFrom(
  '(',
  ')',
  '{',
  '}',
  '[',
  ']',
  '*',
  '/',
  '\\',
  '"',
  "'",
  '`',
  '$',
  '-',
  '+',
  '.',
  ',',
  ':',
  ';',
  '|',
  '&',
  '<',
  '>',
  '0',
  '9',
  'e',
  ' ',
  '\n',
  '\t',
);
const hostileString = fc.array(hostileAtom, { maxLength: 2_048 }).map((chars) => chars.join(''));

describe('security boundary totality', () => {
  test('every hardened pure parser is total and deterministic over hostile bytes', () => {
    fc.assert(
      fc.property(hostileString, (input) => {
        expect(parseRootScriptCheckExecution(input)).toEqual(parseRootScriptCheckExecution(input));
        expect(parseTypedBinding('--fuzz', input)).toEqual(parseTypedBinding('--fuzz', input));
        expect(parseWgslCastValue(input)).toEqual(parseWgslCastValue(input));
        expect(parseEventId(input)).toEqual(parseEventId(input));
        expect(projectNameFromDir(input)).toBe(projectNameFromDir(input));
        expect(testCssEscape(input)).toBe(testCssEscape(input));
        expect(escapeMarkdownTableCell(input)).toBe(escapeMarkdownTableCell(input));
      }),
      { seed: 0x5ec0_117, numRuns: 384 },
    );
  });

  test('long historical ReDoS motifs remain bounded and preserve refusal semantics', () => {
    const repeated = (atom: string, count = 50_000): string => atom.repeat(count);
    expect(parseWgslCastValue(`${repeated('1')}x`)).toBe('invalid');
    expect(parseWgslCastValue(`vec4f(${repeated('1,', 20_000)}x)`)).toBe('invalid');
    expect(parseTypedBinding('--x', `rgb(${repeated('1')}x 0 0)`)).toEqual({ k: 'number', v: 0 });
    expect(classifyBenchSource(`${repeated('/*x*/', 10_000)}bench('x', () => {});`)).toBe('placeholder');
    expect(
      compileViewTransition({ boundary: repeated(' !'), durationMs: 1, easing: 'linear' }).viewTransitionName,
    ).toMatch(/^liteship-vt-boundary-[0-9a-f]{8}$/u);
    expect(projectNameFromDir(repeated(' !'))).toBe('liteship-app');
    expect(parseEventId(`${repeated('node-')}123`).sequence).toBe(123);
  });
});

describe('positive security grammars', () => {
  test('URL admission is a same-origin HTTP(S) allowlist, never a scheme blacklist', () => {
    const base = new URL('https://localhost.test/app');
    for (const source of [
      'javascript:alert(1)',
      'JAVASCRIPT:alert(1)',
      'vbscript:msgbox(1)',
      'data:text/html,<script>alert(1)</script>',
      'file:///etc/passwd',
      'blob:https://localhost.test/id',
      'https://elsewhere.test/asset.js',
    ]) {
      expect(resolveSameOriginHttpReference(base, source), source).toBeNull();
    }
    expect(resolveSameOriginHttpReference(base, '/asset.js')?.href).toBe('https://localhost.test/asset.js');
  });

  test('wildcard projection replaces every placeholder without rescanning output', () => {
    const targets = new Map<string, PackageExportTarget>([
      ['@liteship/example', { './*': 'packages/example/src/*/generated/*/index.ts' }],
    ]);
    const result = resolveImport('@liteship/example/a*b', 'consumer.ts', targets, '@liteship/');
    expect(result.targetFile).toBe('packages/example/src/a*b/generated/a*b/index.ts');
  });

  test('Markdown and CSS projection preserve content without leaving structural delimiters raw', () => {
    const markdown = escapeMarkdownTableCell('path\\name|cell\r\nnext');
    expect(markdown).toBe('path\\\\name\\|cell<br>next');
    const css = testCssEscape('0 id#with space\0');
    expect(css.startsWith('\\30 ')).toBe(true);
    expect(css).toContain('\\#');
    expect(css).toContain('\\ ');
    expect(css).toContain('\uFFFD');
  });
});

describe('early-return fallback adversarial topology', () => {
  test('a very wide nested method does not hide or invent an outer early return', () => {
    const parameters = Array.from({ length: 4_000 }, (_, index) => `p${index}: string`).join(', ');
    const nestedOnly =
      `test('x', () => {\n` +
      `  const fixture = { staticish(${parameters}): string { return 'nested'; } };\n` +
      `  expect(fixture).toBeDefined();\n` +
      `});\n`;
    expect(detectEarlyReturnBeforeExpect(nestedOnly)).toEqual([]);

    const outer =
      `test('x', () => {\n` + `  if (!capability) return;\n` + `  expect(capability).toBe(true);\n` + `});\n`;
    expect(detectEarlyReturnBeforeExpect(outer).map((finding) => finding.line)).toEqual([2]);
  });
});
