/**
 * Teeth proof for the WIDENED skip/placeholder gates — the "always-blocking,
 * no-placeholders-ever" guarantee made REAL across the WHOLE repo (it used to govern only
 * `packages/* /src`, where the skips do NOT live).
 *
 * Each case here was RED-before the widening (the unfixed gate MISSED the violation
 * because the `tests/` tree was out of scope, or the `.skip(` regex missed the alias
 * form) and is GREEN-after. The five cases the adversarial review demanded:
 *  (a) a NEW unsanctioned `it.skip` in a `tests/` file is FLAGGED,
 *  (b) an ALIAS-form skip (`COND ? it : it.skip`) is FLAGGED,
 *  (c) a SANCTIONED capability-gate (in the allowlist) PASSES,
 *  (d) a PROSE mention of `it.skip` in a docstring is NOT flagged (no false positive),
 *  (e) a BENCH TODO-placeholder is FLAGGED.
 *
 * The detector recognises every skip form over `codeOnly` text (so a prose/string mention
 * is never flagged); the {@link SANCTIONED_SKIPS} allowlist decides allow-vs-block, so a
 * legit capability gate is VISIBLE + audited and any unsanctioned skip is caught.
 */

import { describe, it, expect } from 'vitest';
import {
  noSkippedTestGate,
  noPlaceholderGate,
  memoryContext,
  detectSkips,
  sanctionedSkipFor,
  SANCTIONED_SKIPS,
  type Finding,
} from '@czap/gauntlet';

/** Findings for one gate over an in-memory `{ path: body }` world. */
function run(gate: { run: (c: ReturnType<typeof memoryContext>) => readonly Finding[] }, files: Record<string, string>): readonly Finding[] {
  return gate.run(memoryContext(files));
}
function locs(findings: readonly Finding[]): string[] {
  return findings.map((f) => `${f.location?.file}:${f.location?.line}`);
}

describe('no-skipped-test — scope widened to the tests/ tree, with teeth', () => {
  it('(a) an UNSANCTIONED it.skip in a tests/ file is FLAGGED (was invisible: tests/ was out of scope)', () => {
    const findings = run(noSkippedTestGate, {
      'tests/unit/widget/unwired.test.ts': "it.skip('not wired yet', () => {});\n",
    });
    expect(locs(findings)).toContain('tests/unit/widget/unwired.test.ts:1');
  });

  it('(b) an ALIAS-form skip (`COND ? it : it.skip`) is FLAGGED (the `.skip(` regex missed it)', () => {
    const findings = run(noSkippedTestGate, {
      'tests/unit/widget/aliased.test.ts': "const renderIt = COND ? it : it.skip;\nrenderIt('x', () => {});\n",
    });
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0]?.detail).toMatch(/alias/i);
  });

  it('(b2) the inverse alias arm (`COND ? it.skip : it`) is FLAGGED', () => {
    const findings = run(noSkippedTestGate, {
      'tests/unit/widget/inverse.test.ts': 'const condIt = underCoverage ? it.skip : it;\n',
    });
    expect(findings.length).toBeGreaterThan(0);
  });

  it('(b3) the conditional call forms (.skipIf / .runIf) are FLAGGED when unsanctioned', () => {
    const findings = run(noSkippedTestGate, {
      'tests/unit/widget/cond.test.ts': "describe.skipIf(!x)('cond', () => {});\nit.runIf(y)('z', () => {});\n",
    });
    // Two conditional skip forms on two lines.
    expect(findings.length).toBe(2);
  });

  it('(c) a SANCTIONED capability-gate skip (in the allowlist) PASSES', () => {
    // tests/smoke/intro-render.test.ts is enumerated (ffmpeg-absent).
    expect(sanctionedSkipFor('tests/smoke/intro-render.test.ts')?.capability).toBe('ffmpeg-absent');
    const findings = run(noSkippedTestGate, {
      'tests/smoke/intro-render.test.ts': "it.skip('skipped — ffmpeg libx264 render probe failed', () => {});\n",
    });
    expect(findings).toEqual([]);
  });

  it('(d) a PROSE / string mention of it.skip is NOT flagged (no false positive)', () => {
    const findings = run(noSkippedTestGate, {
      'tests/unit/widget/good.test.ts':
        "// This suite never uses it.skip — every test runs.\nit('asserts', () => {\n  const s = 'unlike an it.skip placeholder, this asserts';\n  expect(s.length).toBeGreaterThan(0);\n});\n",
    });
    expect(findings).toEqual([]);
  });

  it('tests/generated/ is EXCLUDED here (the plumb-gate owns its zero-skip guarantee — no double-jeopardy)', () => {
    const findings = run(noSkippedTestGate, {
      'tests/generated/probe.test.ts': "it.skip('unwired', () => {});\n",
    });
    expect(findings).toEqual([]);
  });
});

describe('no-placeholder — scope widened to the tests/ tree (incl. bench TODOs), with teeth', () => {
  it('(e) a BENCH TODO-placeholder (commented-out bench body) is FLAGGED', () => {
    const findings = run(noPlaceholderGate, {
      'tests/bench/widget.bench.ts':
        '// TODO(t): uncomment when resolveWidget exists\n// bench.add("resolveWidget", () => resolveWidget());\nbench("real", () => {});\n',
    });
    expect(locs(findings)).toContain('tests/bench/widget.bench.ts:1');
    expect(findings[0]?.detail).toMatch(/bench/i);
  });

  it('a mid-sentence TODO mention in a tests/ docstring is NOT flagged (no false positive)', () => {
    const findings = run(noPlaceholderGate, {
      'tests/unit/widget/good.test.ts':
        "// we resolved the TODO and finished the work — no marker remains\nit('runs', () => { expect(1).toBe(1); });\n",
    });
    expect(findings).toEqual([]);
  });
});

describe('the skip-detect oracle + the sanctioned-skip allowlist', () => {
  it('detectSkips recognises call / conditional / alias forms over codeOnly (prose ignored)', () => {
    const forms = detectSkips(
      [
        "it.skip('a', () => {});", // call
        'describe.skipIf(!x)("b", () => {});', // conditional
        'const f = COND ? it : it.skip;', // alias (bare ref)
        "// a prose it.skip( mention", // comment — ignored
        "const s = 'it.skip in a string';", // string — ignored
      ].join('\n'),
    );
    const byForm = forms.map((m) => m.form).sort();
    expect(byForm).toEqual(['alias', 'call', 'conditional']);
  });

  it('every sanctioned-skip entry names a real tests/ file and a capability reason', () => {
    for (const entry of SANCTIONED_SKIPS) {
      expect(entry.file.startsWith('tests/'), `${entry.file} must be under tests/`).toBe(true);
      expect(entry.file.endsWith('.ts')).toBe(true);
      expect(entry.why.length, `${entry.file} needs a justification`).toBeGreaterThan(0);
      // tests/generated/ is the plumb-gate's tree — never sanctioned here.
      expect(/(?:^|\/)tests\/generated\//.test(entry.file)).toBe(false);
    }
  });

  it('the allowlist is uniquely keyed by file (no duplicate sanctions)', () => {
    const files = SANCTIONED_SKIPS.map((s) => s.file);
    expect(new Set(files).size).toBe(files.length);
  });
});
