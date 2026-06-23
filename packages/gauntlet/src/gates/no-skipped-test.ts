/**
 * Gate: no skipped test — every skip FORM (`it.skip(` / `test.skip(` / `describe.skip(` /
 * `bench.skip(` / `.todo(` / `xit(`, the conditional `.skipIf(` / `.runIf(`, AND the
 * ALIAS form `COND ? it : it.skip`), across the WHOLE governed corpus (package source IN
 * the IR + the `tests/` tree), allowed ONLY when the file is in the enumerated
 * capability-gated {@link SANCTIONED_SKIPS} allowlist.
 *
 * This is one of the two ALWAYS-BLOCKING gates — its `ruleId`
 * (`gauntlet/no-skipped-test`) is reserved in {@link ALWAYS_BLOCKING_RULES}, so a
 * waiver can NEVER cover it (you cannot waive a lie). A skipped test ships green
 * while proving nothing: it is the exact shape of unfinished work disguised as
 * passing. The owner's #1 directive — "the harness must emit only REAL tests,
 * never `it.skip`" — is this gate.
 *
 * THREE things changed to make the guarantee REAL (it was overstated — the gate
 * governed only `packages/* /src`, where the skips do NOT live):
 *
 *  1. SCOPE WIDENED to the whole repo. The judged `files()` is IR-scoped (package
 *     source only); the skips live under `tests/`. The gate now folds over `files()`
 *     (IR source) UNIONED with the governed test corpus read via the UNSCOPED
 *     `allFiles()` (the same out-of-IR EVIDENCE channel {@link claimPropertyGate}
 *     uses). `tests/generated/` is EXCLUDED here — the separate plumb-gate owns its
 *     zero-skip guarantee, so this gate avoids double-jeopardy on that subtree.
 *
 *  2. ALIAS forms CAUGHT. The old `.skip(` regex missed `const f = COND ? it : it.skip;
 *     f(...)` (a bare `it.skip` reference, no call paren) and the `.skipIf(`/`.runIf(`
 *     conditional calls. {@link detectSkips} recognises every form over {@link codeOnly}
 *     text, so a PROSE mention of `it.skip` in a docstring is still NOT flagged.
 *
 *  3. LEGIT SKIPS SANCTIONED EXPLICITLY (waiver-with-teeth, never a silent ignore). A
 *     skip is allowed ONLY if its file is enumerated in {@link SANCTIONED_SKIPS} (an
 *     ffmpeg-absent render probe, a wasm-absent parity arm, a SharedArrayBuffer-absent
 *     browser test, a coverage-redundant integration test, …). Any skip NOT enumerated
 *     is BLOCKING. This makes every legit skip VISIBLE + auditable — invisible-because-
 *     out-of-scope was the bug.
 *
 * Because the gate reads OUT-OF-IR evidence (the `tests/` corpus via `allFiles()`), it
 * declares {@link Gate.evidenceDigest} folding that exact corpus into the verdict-cache
 * key (the P1a soundness mechanism) — so editing a test under `tests/` (adding a skip)
 * flips the key → MISS → re-run, never a stale "green".
 *
 * It ships red / green / mutation fixtures, so it self-proves.
 *
 * @module
 */

import { defineGate, type GateContext, type Gate } from '../gate.js';
import { finding, type Finding } from '../finding.js';
import { memoryContext } from '../engine.js';
import { stableEvidenceDigest } from '../verdict-cache.js';
import { detectSkips, type SkipMatch } from './skip-detect.js';
import { sanctionedSkipFor } from './skip-allowlist.js';

/**
 * The governed corpus: the IR-scoped judged `files()` (package source) UNIONED with the
 * UNSCOPED `allFiles()` (which the node context unions the `tests/` tree into) — minus
 * `tests/generated/`, whose zero-skip guarantee the plumb-gate owns. De-duped + sorted so
 * the fold is deterministic. A context that predates `allFiles()` falls back to `files()`.
 */
function governedFiles(context: GateContext): readonly string[] {
  const judged = context.files();
  const all = context.allFiles !== undefined ? context.allFiles() : judged;
  const union = new Set<string>([...judged, ...all]);
  return [...union].filter(isGoverned).sort();
}

/** A `.ts` file this gate judges — excludes `tests/generated/` (the plumb-gate's tree). */
function isGoverned(file: string): boolean {
  if (!file.endsWith('.ts')) return false;
  if (/(?:^|\/)tests\/generated\//.test(file)) return false;
  return true;
}

/** A human label for the detected skip form, for the finding detail. */
function formLabel(form: SkipMatch['form']): string {
  switch (form) {
    case 'call':
      return 'a skip/todo call';
    case 'conditional':
      return 'a runtime-conditional skip (.skipIf / .runIf)';
    case 'alias':
      return 'an aliased skip reference (e.g. `COND ? it : it.skip`)';
    case 'computed':
      return 'a computed member access on a test runner (e.g. `it[cond ? "skip" : "only"]`) — it can resolve to skip';
  }
}

/** Scan the governed corpus; a skip is a finding UNLESS its EXACT SITE is sanctioned. */
function scan(context: GateContext): readonly Finding[] {
  const findings: Finding[] = [];
  for (const file of governedFiles(context)) {
    const text = context.readFile(file);
    if (text === undefined) continue;
    const skips = detectSkips(text);
    if (skips.length === 0) continue;
    const rawLines = text.split('\n');
    for (const skip of skips) {
      // PER-SITE sanctioning: a skip is allowed ONLY when its OWN line matches a declared
      // sanctioned site for this file (the enumerated, audited capability gate). A
      // different/new/unrelated skip in the SAME file is NOT sanctioned — a sanctioned
      // file is no longer a blind spot. The allowlist is the visible record (the standards
      // surface folds it), so this is a waiver-with-teeth, never a silent ignore.
      const rawLine = rawLines[skip.line - 1] ?? '';
      if (sanctionedSkipFor(file, rawLine) !== undefined) continue;
      findings.push(
        finding({
          ruleId: 'gauntlet/no-skipped-test',
          severity: 'error',
          level: 'L2',
          title: 'Skipped test — green while proving nothing',
          detail: `${file}:${skip.line} carries ${formLabel(skip.form)} (\`${skip.token}\`). A skipped test ships GREEN while asserting nothing — it is unfinished work disguised as passing, the exact lie the harness must never emit. This rule is always-blocking: a skip can never be waived, only made real, honestly removed, or — if it is a genuine capability gate — ENUMERATED in the sanctioned-skip allowlist (skip-allowlist.ts) so it is visible and audited.`,
          location: { file, line: skip.line },
          remediation: {
            kind: 'instruction',
            description:
              'Make the test real, remove it, or — for a genuine capability gate — enumerate it in the sanctioned-skip allowlist.',
            steps: [
              'If the test asserts something real, WIRE it: bind the real subject and turn the skip into a running `it(...)` with teeth.',
              'If the case is a genuine capability gate (ffmpeg/wasm/SharedArrayBuffer/coverage absent), add an enumerated entry to SANCTIONED_SKIPS (skip-allowlist.ts) with the file + the EXACT skip SITE (the normalized source line) + the capability reason — the sanction is per-site, not per-file, and the allowlist is the visible, snapshot-pinned record (adding an entry is a standards WEAKEN the raccoon-rule diff surfaces).',
              'If the test was a placeholder for work not yet done, delete it; an empty promise of coverage is worse than no test (it reads as covered).',
            ],
          },
        }),
      );
    }
  }
  return findings;
}

/**
 * The OUT-OF-IR EVIDENCE digest — the verdict-cache soundness fold. The gate's verdict
 * depends on the `tests/` corpus it reads through the UNSCOPED `allFiles()` (OUTSIDE the
 * IR). Adding a skip to a test file flips a finding WITHOUT touching any IR source byte,
 * so the cache would serve a stale "green" unless this evidence is folded. We fold the
 * EXACT governed test corpus the gate's `run` reads, as `(path, body)` pairs — the same
 * pattern {@link claimPropertyGate} uses. The IR-source bytes (`files()`) are already
 * captured by the coverage digest, so only the out-of-IR (`tests/`) reads need folding;
 * we fold the WHOLE governed set (a needless MISS is never a stale serve — the soundness
 * rail's safe direction).
 */
function noSkippedTestEvidenceDigest(context: GateContext): string {
  const entries: [string, string][] = [];
  for (const file of governedFiles(context)) {
    const text = context.readFile(file);
    if (text === undefined) continue;
    entries.push([file, text]);
  }
  return stableEvidenceDigest(entries);
}

// ---------------------------------------------------------------------------
// Fixtures — the authority ratchet's evidence. All in-memory; no filesystem.
// The RED fixture now exercises BOTH the alias form AND a tests/-tree skip; the
// GREEN proves a SANCTIONED capability gate passes + a prose mention is clean; the
// MUTATION weakens the alias detection (so a mutant that only sees `.skip(` must let
// the alias-form red escape).
// ---------------------------------------------------------------------------

/** A real (sanctioned) file path used in the GREEN fixture — must match the allowlist. */
const SANCTIONED_FILE = 'tests/smoke/intro-render.test.ts';

/** The qualified gate — fixtures included, so it self-proves via the ratchet. */
export const noSkippedTestGate: Gate = defineGate({
  id: 'gauntlet/no-skipped-test',
  level: 'L2',
  describe:
    'Flags every skip FORM (`it.skip(` / `.todo(` / `xit(` / `.skipIf(` / `.runIf(` / the `COND ? it : it.skip` alias) across package source + the tests/ tree — a skip ships green while proving nothing — allowed only when the file is in the enumerated capability-gated allowlist.',
  run: scan,
  evidenceDigest: noSkippedTestEvidenceDigest,
  fixtures: {
    red: {
      name: 'an UNSANCTIONED tests/-tree file with the EXOTIC skip forms a flat `.skip(` regex misses (alias + chained-modifier + bracket + computed)',
      context: memoryContext({
        // A tests/-tree file (out of the old IR scope) carrying the skip forms NO flat regex
        // catches and the OLD detector missed: the ALIAS form (a bare `it.skip` behind a
        // ternary), a CHAINED-MODIFIER skip (`it.concurrent.skip`), a BRACKET skip
        // (`it["skip"]`), and a COMPUTED member access on a runner root
        // (`it[cond?"skip":"only"]`). The comprehensive token-aware detector catches ALL of
        // them; a mutant that narrows back to the literal `.skip(` call lets EVERY one escape.
        // NOT in the allowlist → all are blocking.
        'tests/unit/widget/unwired.test.ts':
          'const renderIt = COND ? it : it.skip;\n' +
          "renderIt('not wired yet', () => {});\n" +
          "it.concurrent.skip('chained modifier skip', () => {});\n" +
          'it["skip"]("bracket skip", () => {});\n' +
          'it[cond ? "skip" : "only"]("computed skip", () => {});\n',
      }),
    },
    green: {
      name: 'a SANCTIONED capability-gate skip passes + a prose mention of it.skip is clean',
      context: memoryContext({
        // The skip lives in a file enumerated in SANCTIONED_SKIPS (ffmpeg-absent) AT the
        // exact sanctioned SITE (byte-for-byte the enumerated `site` line) — it is the
        // audited, visible capability gate, so it is ALLOWED. Per-site sanctioning: a
        // DIFFERENT skip in this same file would NOT pass (see the class-guard test).
        [SANCTIONED_FILE]: "it.skip('skipped — ffmpeg libx264 render probe failed (see czap doctor)', () => {});\n",
        // A REAL test plus a docstring + string that MENTION it.skip descriptively — the
        // codeOnly strip blanks both so neither trips the gate (no false positive).
        'tests/unit/widget/good.test.ts':
          "// This suite never uses it.skip — every test runs.\nit('asserts a real fact', () => {\n  const label = 'unlike an it.skip placeholder, this asserts';\n  expect(label.length).toBeGreaterThan(0);\n});\n",
      }),
    },
    mutation: {
      describe:
        'A gate that narrows back to the LITERAL `.skip(` call (dropping the comprehensive token-aware detection) lets the red fixture — the ALIAS (`COND ? it : it.skip`), the CHAINED `it.concurrent.skip`, the BRACKET `it["skip"]`, and the COMPUTED `it[cond?"skip":"only"]` forms, none of which the flat regex matches — escape entirely. The mutant must then DIFFER from the original on the red fixture (it finds nothing where the comprehensive detector finds four exotic skips).',
      mutate: (gate: Gate): Gate => ({
        ...gate,
        run: (context: GateContext): readonly Finding[] => {
          // Mutant: the OLD, too-narrow detector — only the literal `.skip(` CALL form,
          // so the alias `it.skip` reference (no `(`) is missed. The red fixture escapes.
          const out: Finding[] = [];
          const LITERAL_CALL = /\b(?:it|test|describe|bench)\.skip\s*\(/;
          for (const file of governedFiles(context)) {
            const text = context.readFile(file);
            if (text === undefined) continue;
            const lines = text.split('\n');
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i] ?? '';
              if (sanctionedSkipFor(file, line) !== undefined) continue;
              if (LITERAL_CALL.test(line)) {
                out.push(
                  finding({
                    ruleId: gate.id,
                    severity: 'error',
                    level: 'L2',
                    title: 'mutant',
                    detail: `${file}:${i + 1}`,
                  }),
                );
              }
            }
          }
          return out;
        },
      }),
    },
  },
});
