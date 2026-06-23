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

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  noSkippedTestGate,
  noPlaceholderGate,
  memoryContext,
  detectSkips,
  sanctionedSkipFor,
  normalizeSiteLine,
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

  it('(c) a SANCTIONED capability-gate skip AT ITS EXACT SITE (in the allowlist) PASSES', () => {
    // tests/smoke/intro-render.test.ts is enumerated (ffmpeg-absent) at this exact line.
    const SITE = "it.skip('skipped — ffmpeg libx264 render probe failed (see czap doctor)', () => {});";
    expect(sanctionedSkipFor('tests/smoke/intro-render.test.ts', SITE)?.capability).toBe('ffmpeg-absent');
    const findings = run(noSkippedTestGate, {
      'tests/smoke/intro-render.test.ts': `${SITE}\n`,
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

  it('every sanctioned-skip entry names a real tests/ file, a site discriminator, and a capability reason', () => {
    for (const entry of SANCTIONED_SKIPS) {
      expect(entry.file.startsWith('tests/'), `${entry.file} must be under tests/`).toBe(true);
      expect(entry.file.endsWith('.ts')).toBe(true);
      expect(entry.why.length, `${entry.file} needs a justification`).toBeGreaterThan(0);
      expect(entry.site.length, `${entry.file} needs a site discriminator`).toBeGreaterThan(0);
      // The site must itself carry a detectable skip form (it pins a real skip line).
      expect(detectSkips(entry.site).length, `${entry.file} site is not a skip: ${entry.site}`).toBeGreaterThan(0);
      // tests/generated/ is the plumb-gate's tree — never sanctioned here.
      expect(/(?:^|\/)tests\/generated\//.test(entry.file)).toBe(false);
    }
  });

  it('the allowlist is uniquely keyed by (file, site) — a file may carry MULTIPLE sites (e.g. the wasm-parity dual arms)', () => {
    const keys = SANCTIONED_SKIPS.map((s) => `${s.file}::${normalizeSiteLine(s.site)}`);
    expect(new Set(keys).size).toBe(keys.length);
    // The wasm-parity file is the proof a file CAN carry two distinct sanctioned sites.
    const parityFiles = SANCTIONED_SKIPS.filter((s) => s.file === 'tests/unit/core/wasm-parity.test.ts');
    expect(parityFiles.length).toBe(2);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// PER-SITE class guard (FORTIFY A): a SANCTIONED FILE is NOT a blind spot. The
// first cut sanctioned a whole file (any skip in it passed); a NEW unrelated skip
// in a sanctioned file shipped green. These prove the sanction is per-SITE.
// ───────────────────────────────────────────────────────────────────────────
describe('per-site sanctioning — a sanctioned file is NOT a blind spot (FORTIFY A)', () => {
  const SANCTIONED_FILE = 'tests/smoke/intro-render.test.ts';
  const SANCTIONED_SITE = "it.skip('skipped — ffmpeg libx264 render probe failed (see czap doctor)', () => {});";

  it('the EXACT sanctioned site passes (baseline)', () => {
    expect(run(noSkippedTestGate, { [SANCTIONED_FILE]: `${SANCTIONED_SITE}\n` })).toEqual([]);
  });

  it('a NEW unrelated it.skip ADDED to a sanctioned file is FLAGGED (per-site, not file-wide)', () => {
    // The sanctioned site is present AND a second, unrelated skip — the file-wide allowlist
    // would have passed BOTH (the bug). Per-site flags ONLY the unsanctioned new one.
    const findings = run(noSkippedTestGate, {
      [SANCTIONED_FILE]: `${SANCTIONED_SITE}\nit.skip('a NEW unrelated placeholder — not a capability gate', () => {});\n`,
    });
    expect(findings.length).toBe(1);
    expect(findings[0]?.location?.file).toBe(SANCTIONED_FILE);
    expect(findings[0]?.location?.line).toBe(2);
  });

  it('a DIFFERENT-capability skip in a sanctioned file is FLAGGED (only the declared site is allowed)', () => {
    // An alias-form skip (a different shape/capability) added to the same file — unsanctioned.
    const findings = run(noSkippedTestGate, {
      [SANCTIONED_FILE]: `${SANCTIONED_SITE}\nconst maybe = OTHER ? it : it.skip;\nmaybe('different gate', () => {});\n`,
    });
    expect(findings.length).toBe(1);
    expect(findings[0]?.detail).toMatch(/alias/i);
  });

  it('the sanctioned site is line-number-INDEPENDENT (re-ordering the file does not break it)', () => {
    // Push the sanctioned skip down with leading real tests — its SITE (content) still matches.
    const findings = run(noSkippedTestGate, {
      [SANCTIONED_FILE]: `it('real one', () => {});\nit('real two', () => {});\n${SANCTIONED_SITE}\n`,
    });
    expect(findings).toEqual([]);
  });

  it('a re-WORDED sanctioned line is NO LONGER sanctioned (re-opens the question — the strengthening posture)', () => {
    const findings = run(noSkippedTestGate, {
      [SANCTIONED_FILE]: "it.skip('skipped — ffmpeg render probe failed', () => {});\n", // dropped `(see czap doctor)`
    });
    expect(findings.length).toBe(1);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// LIVE-SOURCE PIN (anti-rot): every enumerated site must match a REAL skip line
// in the live repo file — and conversely, the live no-skip gate over the WHOLE
// real tests/ tree must be GREEN (every real skip is sanctioned at site level).
// This is what keeps the discriminator honest: a moved/reworded real skip, or a
// stale allowlist entry, breaks here loudly.
// ───────────────────────────────────────────────────────────────────────────
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

describe('the allowlist sites are PINNED to live source (anti-rot)', () => {
  it('every SANCTIONED_SKIPS.site matches a real detected skip line in its live file', () => {
    for (const entry of SANCTIONED_SKIPS) {
      const text = readFileSync(resolve(REPO_ROOT, entry.file), 'utf8');
      const rawLines = text.split('\n');
      const want = normalizeSiteLine(entry.site);
      // The site must equal the normalized RAW line of some detected skip in the file.
      const hit = detectSkips(text).some((s) => normalizeSiteLine(rawLines[s.line - 1] ?? '') === want);
      expect(hit, `allowlist site drifted from live source in ${entry.file}: ${entry.site}`).toBe(true);
      // And the gate must actually allow that exact live line.
      const live = rawLines.find((l) => normalizeSiteLine(l) === want) ?? '';
      expect(sanctionedSkipFor(entry.file, live)?.capability, `${entry.file} site not sanctioned`).toBe(
        entry.capability,
      );
    }
  });
});
