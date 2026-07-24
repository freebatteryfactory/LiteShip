/**
 * The placeholder-content detector is PRECISE and COMPLETE.
 *
 * It distinguishes a REAL placeholder — a task-marker DIRECTIVE (a marker keyword
 * leading a `//`/block comment line), a lorem-ipsum filler body, or a `debugger`
 * statement — from a string or comment that merely NAMES the forbidden words: a
 * rule-id literal (`gauntlet/no-placeholder`, `placeholder-content`), a gate
 * summary, a diagnostic message, a slash-enumeration of the marker names, a
 * marker quoted as an EXAMPLE in a docblock, a marker inside a fixture STRING, or
 * any prose discussing placeholders. The discrimination is by FORM and mirrors
 * the repo's source of truth for "is this a real placeholder?" — the gauntlet
 * `no-placeholder` gate (`packages/gauntlet/src/gates/no-placeholder.ts` +
 * `code-only.ts`): leading-token-per-line for comments, strings carry only
 * lorem-ipsum. It is NEVER by a per-file allowlist exemption.
 *
 * RED  fixtures — every genuine form must be CAUGHT (one finding each).
 * GREEN fixtures — the anti-placeholder machinery's own copy must pass CLEAN,
 *   including the EXACT shapes from gauntlet/src that the imprecise detector
 *   false-flagged (a docblock marker example; a marker inside a fixture string).
 *
 * All driven through the real `runIntegrityAudit` over a synthetic `@acme/`
 * package, so the test pins the shipped detector, not a re-implementation.
 *
 * @module
 */
import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { runIntegrityAudit } from '@liteship/audit';
import type { AuditFinding, DevopsProfile } from '@liteship/audit';

const fixtures: string[] = [];
afterEach(() => {
  for (const dir of fixtures.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** Materialize a one-file `@acme/probe` package whose src/index.ts is `body`. */
function probeRepo(body: string): string {
  const root = mkdtempSync(join(tmpdir(), 'liteship-placeholder-'));
  fixtures.push(root);
  const files: Record<string, string> = {
    'package.json': JSON.stringify({ name: 'acme-root', private: true, type: 'module' }),
    'packages/probe/package.json': JSON.stringify({
      name: '@acme/probe',
      exports: { '.': { development: './src/index.ts' } },
    }),
    'packages/probe/src/index.ts': body,
  };
  for (const [rel, content] of Object.entries(files)) {
    const abs = resolve(root, rel);
    mkdirSync(resolve(abs, '..'), { recursive: true });
    writeFileSync(abs, content, 'utf8');
  }
  return root;
}

function acmeProfile(root: string): DevopsProfile {
  return {
    repoRoot: root,
    internalPackagePrefix: '@acme/',
    packageTopology: { '@acme/probe': { allowedInternalImports: [], kind: 'core' } },
    dynamicImportExemptions: new Set<string>(),
    surfacePolicy: {
      astroPackage: '',
      astroClientDirectives: [],
      astroRuntimeFiles: [],
      viteVirtualModules: [],
      knownCapabilityNotes: [],
    },
  };
}

/** Run the real integrity engine over `body` and return only placeholder findings. */
function placeholderFindings(body: string): AuditFinding[] {
  const result = runIntegrityAudit(acmeProfile(probeRepo(body)));
  // No allowlist exemptions exist for @acme/ — active findings ARE the verdict,
  // and suppressed must stay empty (a precise detector grandfathers nothing).
  expect(result.suppressed.filter((s) => s.rule === 'placeholder-content')).toHaveLength(0);
  return result.findings.filter((f) => f.rule === 'placeholder-content');
}

// The marker keyword is assembled from fragments so this test file's OWN source
// never carries a canonical marker the engine would (correctly) flag when it
// scans the repo. (The strings still reach the synthetic fixture intact.)
const TD = 'TO' + 'DO';
const FX = 'FIX' + 'ME';

describe('placeholder-content — RED: genuine placeholders are CAUGHT', () => {
  it('a colon-form directive leading a // comment', () => {
    const found = placeholderFindings(`// ${TD}: wire the real channel\nexport const x = 1;\n`);
    expect(found).toHaveLength(1);
    expect(found[0]!.summary).toContain('task marker');
  });

  it('a scoped colon-form directive `KEYWORD(scope):`', () => {
    const found = placeholderFindings(`// ${FX}(harness): generate a real test here\nexport const x = 1;\n`);
    expect(found).toHaveLength(1);
  });

  it('a leading-token directive with no colon', () => {
    const found = placeholderFindings(`// ${TD} replace this stub before shipping\nexport const x = 1;\n`);
    expect(found).toHaveLength(1);
  });

  it('a directive leading a block-comment line — located on the marker line, not the opener', () => {
    const body = `/**\n * Docblock.\n * ${FX}: still broken under load.\n */\nexport const x = 1;\n`;
    const found = placeholderFindings(body);
    expect(found).toHaveLength(1);
    expect(found[0]!.location?.line).toBe(3); // the directive's line, not line 1
  });

  it('a trailing-line directive is caught (a comment is trivia, not an AST node)', () => {
    const found = placeholderFindings(`export const x = 1; // ${TD}: revisit\n`);
    expect(found).toHaveLength(1);
    expect(found[0]!.location?.line).toBe(1);
  });

  it('a lorem-ipsum filler body in a string literal', () => {
    const found = placeholderFindings(`export const copy = 'Lorem ipsum dolor sit amet';\n`);
    expect(found).toHaveLength(1);
    expect(found[0]!.summary).toContain('lorem-ipsum');
  });

  it('a debugger statement', () => {
    const found = placeholderFindings(`export function go(): void {\n  debugger;\n}\n`);
    expect(found).toHaveLength(1);
    expect(found[0]!.summary).toContain('Debugger');
  });
});

describe('placeholder-content — GREEN: the anti-placeholder machinery passes CLEAN', () => {
  it('a rule-id literal that NAMES the family (`gauntlet/no-placeholder`)', () => {
    expect(placeholderFindings(`export const RULE = 'gauntlet/no-placeholder';\n`)).toHaveLength(0);
  });

  it('a single-segment rule-id literal (`placeholder-content`)', () => {
    expect(placeholderFindings(`export const RULE = 'placeholder-content';\n`)).toHaveLength(0);
  });

  it('a gate summary that mentions the word "placeholder" in prose', () => {
    const body = `export const summary =\n  'Plumb gate: fail on any tests/generated/ placeholder skip or unclassified package.';\n`;
    expect(placeholderFindings(body)).toHaveLength(0);
  });

  it('a diagnostic message naming the skip/placeholder family', () => {
    const body =
      "export const detail =\n  'An always-blocking rule names a lie (skip/placeholder) that must be made real, not suppressed.';\n";
    expect(placeholderFindings(body)).toHaveLength(0);
  });

  it('a marker keyword inside a fixture STRING is description, not a placeholder', () => {
    // The EXACT shape of gauntlet/src/gates/no-placeholder.ts:99 — the gate's RED
    // fixture is a string literal whose CONTENT is example source carrying a marker.
    const body = `export const redFixture = 'export function f() {\\n  // ${TD}: wire the real path\\n  return 0;\\n}\\n';\n`;
    expect(placeholderFindings(body)).toHaveLength(0);
  });

  it('a marker quoted as an EXAMPLE deeper in a docblock line', () => {
    // The EXACT shape of gauntlet/src/gates/no-placeholder.ts:15 — a jsdoc line
    // that quotes `// KEYWORD: …` as an example; the line does not LEAD with it.
    const bt = String.fromCharCode(96); // backtick, kept out of this template literal
    const body =
      `/**\n * Precision matters.\n * - ${bt}// ${TD}: wire this${bt} is flagged (a real directive),\n` +
      ` * - a prose mention is not.\n */\nexport const x = 1;\n`;
    expect(placeholderFindings(body)).toHaveLength(0);
  });

  it('a slash-enumeration of marker NAMES leading a comment', () => {
    expect(placeholderFindings(`// ${TD} / ${FX} / pseudocode / "implement me" stubs\nexport const x = 1;\n`)).toHaveLength(0);
  });

  it('a marker word fused into an identifier in prose (`ADR-KEYWORD`)', () => {
    expect(placeholderFindings(`// Other arms lack a wired channel — see ADR-${TD}.\nexport const x = 1;\n`)).toHaveLength(0);
  });

  it('a marker word mid-prose, not leading the line', () => {
    expect(placeholderFindings(`// the ${TD} family is never shippable and never waivable\nexport const x = 1;\n`)).toHaveLength(0);
  });

  it('the bare word "placeholder" in prose comments', () => {
    expect(placeholderFindings(`// a green placeholder would ship unwired work — banned\nexport const x = 1;\n`)).toHaveLength(0);
  });

  it('a `//`-looking sequence INSIDE a string literal is not read as a comment', () => {
    // The `//` here is URL content, not a comment opener — the scanner tokenises,
    // so no comment is seen and the marker word never reaches the comment scan.
    expect(placeholderFindings(`export const url = 'https://x.test/the-${TD}-list-page';\n`)).toHaveLength(0);
  });
});
