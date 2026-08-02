import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { globSync } from 'fast-glob';
import { describe, expect, it } from 'vitest';
import { scanCssIdentitySurface, type CssIdentitySource } from '@liteship/audit';

const REPO_ROOT = resolve(import.meta.dirname, '../../..');

/** Post-2.6 live census: two core lowerers plus the compiler's generated default selector. */
const POST_2_6_CSS_IDENTITY_ANCHOR_FLOOR = 3;

function source(text: string, path = 'packages/example/src/example.ts'): CssIdentitySource {
  return { path, text };
}

function scan(text: string) {
  return scanCssIdentitySurface([source(text)]);
}

function liveSources(): readonly CssIdentitySource[] {
  return globSync('packages/*/src/**/*.ts', { cwd: REPO_ROOT, onlyFiles: true })
    .sort((left, right) => left.localeCompare(right))
    .map((path) => ({ path, text: readFileSync(resolve(REPO_ROOT, path), 'utf8') }));
}

describe('CSS identity interpolation must be escaped', () => {
  it('the live packages/*/src corpus has no unescaped boundary interpolation', () => {
    const result = scanCssIdentitySurface(liveSources());
    expect(result.findings).toEqual([]);
  });

  const APPROVED_IMPORT = "import { escapeCssString } from '@liteship/core/motion';\n";

  it('a direct escapeCssString call imported from the approved module is admitted', () => {
    const result = scan(`${APPROVED_IMPORT}const selector = \`[data-liteship-boundary="\${escapeCssString(name)}"]\`;`);
    expect(result.anchoredCount).toBe(1);
    expect(result.findings).toEqual([]);
  });

  it('a same-scope const bound directly to the approved escape is admitted', () => {
    const result = scan(
      `${APPROVED_IMPORT}const escaped = escapeCssString(name);\nconst selector = \`[data-liteship-boundary="\${escaped}"]\`;`,
    );
    expect(result.anchoredCount).toBe(1);
    expect(result.findings).toEqual([]);
  });

  it('an alias of the approved import is admitted under its local name', () => {
    const result = scan(
      "import { escapeCssString as esc } from '@liteship/core/motion';\n" +
        'const selector = `[data-liteship-boundary="${esc(name)}"]`;',
    );
    expect(result.anchoredCount).toBe(1);
    expect(result.findings).toEqual([]);
  });

  it('the approved module itself may call the escape it declares', () => {
    const result = scanCssIdentitySurface([
      source(
        'export function escapeCssString(value: string): string {\n  return value;\n}\n' +
          'const selector = `[data-liteship-boundary="${escapeCssString(name)}"]`;',
        'packages/core/src/motion/css-identity.ts',
      ),
    ]);
    expect(result.anchoredCount).toBe(1);
    expect(result.findings).toEqual([]);
  });

  // Codex review round 2 on PR #197, confirmed P2: checking the callee
  // SPELLING admits any binding that happens to carry the name. The scanner
  // must resolve the identifier to the approved escape — the same
  // token-versus-referent hole this batch exists to close.
  it.each([
    ['a package-local arrow shadowing the name', 'const escapeCssString = (value) => value;'],
    ['a package-local function declaration', 'function escapeCssString(value) {\n  return value;\n}'],
    ['an import from an unapproved module', "import { escapeCssString } from './local-utils.js';"],
  ])('%s does not satisfy the escape allowlist', (_name, prelude) => {
    const result = scan(`${prelude}\nconst selector = \`[data-liteship-boundary="\${escapeCssString(name)}"]\`;`);
    expect(result.anchoredCount).toBe(1);
    expect(result.findings).toEqual([
      expect.objectContaining({ reason: 'unescaped-interpolation', expression: 'escapeCssString(name)' }),
    ]);
  });

  it('a bare identifier interpolated into a boundary selector is a finding', () => {
    const result = scan('const selector = `[data-liteship-boundary="${name}"]`;');
    expect(result.findings).toEqual([
      expect.objectContaining({ reason: 'unescaped-interpolation', expression: 'name' }),
    ]);
  });

  it('a member expression is a finding, not an unclassified pass', () => {
    const result = scan('const selector = `[data-liteship-boundary="${model.name}"]`;');
    expect(result.findings).toEqual([
      expect.objectContaining({ reason: 'unescaped-interpolation', expression: 'model.name' }),
    ]);
  });

  it('a nested call around escapeCssString is a finding', () => {
    const result = scan('const selector = `[data-liteship-boundary="${normalize(escapeCssString(name))}"]`;');
    expect(result.findings).toEqual([
      expect.objectContaining({
        reason: 'unescaped-interpolation',
        expression: 'normalize(escapeCssString(name))',
      }),
    ]);
  });

  it('an unclosed quoted identity is a finding even when its interpolation is escaped', () => {
    // The escape is imported from the approved module, so the ONLY finding is
    // the unclosed quote — isolating that reason from escape resolution.
    const result = scan(`${APPROVED_IMPORT}const selector = \`[data-liteship-boundary="\${escapeCssString(name)}\`;`);
    expect(result.findings).toEqual([expect.objectContaining({ reason: 'unclosed-quoted-identity' })]);
  });

  it('the live scan sees the named post-2.6 non-vacuity floor', () => {
    const result = scanCssIdentitySurface(liveSources());
    expect(result.anchoredCount).toBeGreaterThanOrEqual(POST_2_6_CSS_IDENTITY_ANCHOR_FLOOR);
  });

  it('EXECUTED MUTANT: shadowing the approved import at a live call site reds that exact site', () => {
    // The teeth for the resolution rule, taken on the real corpus rather than
    // a fixture: replace the core lowerer's approved import with a
    // package-local identity function and the scanner must name that site.
    const live = liveSources();
    const target = 'packages/core/src/motion/interpret-transition.ts';
    const approvedImport = "import { escapeCssString } from './css-identity.js';";
    const subject = live.find((file) => file.path === target);
    expect(subject, `${target} must exist and carry the approved import`).toBeDefined();
    expect(subject!.text).toContain(approvedImport);

    const mutated = live.map((file) =>
      file.path === target
        ? {
            ...file,
            text: file.text.replace(approvedImport, 'const escapeCssString = (value: string): string => value;'),
          }
        : file,
    );
    const result = scanCssIdentitySurface(mutated);
    expect(result.findings.map((entry) => entry.path)).toEqual([target]);
    expect(result.findings[0]).toMatchObject({ reason: 'unescaped-interpolation' });
  });
});
