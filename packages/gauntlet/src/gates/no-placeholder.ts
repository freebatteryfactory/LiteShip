/**
 * Gate: no placeholder — `TODO` / `FIXME` / `XXX` / `HACK` directive comments, across
 * the WHOLE governed corpus (package source IN the IR + the `tests/` tree, including the
 * `tests/bench/*.bench.ts` commented-out-bench TODO-placeholders).
 *
 * This is one of the two ALWAYS-BLOCKING gates — its `ruleId`
 * (`gauntlet/no-placeholder`) is reserved in {@link ALWAYS_BLOCKING_RULES}, so a
 * waiver can NEVER cover it. A placeholder is a signed promise of unfinished work
 * left inside shipped source; the owner's hard directive is that placeholders ARE
 * lies and are always blocking, zero exceptions.
 *
 * SCOPE WIDENED (the overstated-guarantee fix): the judged `files()` is IR-scoped
 * (package source only), but TODO-placeholders also live under `tests/` — notably the
 * commented-out "uncomment when X is implemented" TODO bench bodies in
 * `tests/bench/*.bench.ts`, which read as a measured benchmark while measuring nothing.
 * The gate now folds over `files()` (IR source) UNIONED with the governed test corpus
 * read via the UNSCOPED `allFiles()` (the same out-of-IR EVIDENCE channel
 * {@link claimPropertyGate} uses). `tests/generated/` is EXCLUDED — the plumb-gate owns
 * that subtree. Because it reads OUT-OF-IR evidence, the gate declares
 * {@link Gate.evidenceDigest} folding the `tests/` corpus into the cache key (P1a) so a
 * placeholder added under `tests/` flips the key → MISS → re-run.
 *
 * Precision is everything here, because the false-positive cost is high — and a
 * gate with a dirty green floor never earns blocking authority. The gate matches
 * only the DIRECTIVE FORM: a comment opener (a slash-slash, a slash-star, or a
 * leading jsdoc star) followed — after only whitespace — by a placeholder keyword
 * as a WHOLE WORD. That means:
 * - a leading directive comment is flagged (the real "left for later" marker — incl.
 *   a commented-out "uncomment when …" TODO bench body),
 * - a mid-sentence prose mention (the phrase "replace the marker with the real
 *   thing", "this is not a shortcut") is NOT flagged — the keyword is not the
 *   first token after the opener,
 * - the identical text inside a STRING literal is NOT flagged ({@link stringsBlanked}
 *   blanks strings while keeping comments), so a gate or test that DESCRIBES the
 *   placeholder family inside a string does not trip itself.
 *
 * Deliberately NOT included: a CODE-level "not implemented" stub scan. A pure
 * token scanner cannot tell a real throw-stub from a regex/string that DETECTS the
 * phrase (e.g. another gate's `NOT_IMPLEMENTED_PATTERN`), so a stub scan would
 * false-positive on pattern definitions and fail the green floor. An honest
 * unimplemented path is already caught by the bare-throw discipline (it must be a
 * tagged `UnsupportedError`, never a bare stub); the AST-precise stub oracle
 * arrives with Slice B. Until then this gate stays surgically on directive
 * comments, where it is false-positive-free on the real tree.
 *
 * It ships red / green / mutation fixtures, so it self-proves.
 *
 * @module
 */

import { defineGate, type GateContext, type Gate } from '../gate.js';
import { finding, type Finding } from '../finding.js';
import { memoryContext } from '../engine.js';
import { stringsBlanked, commentsBlanked } from './code-only.js';
import { stableEvidenceDigest } from '../verdict-cache.js';

// DIRECTIVE FORM: a comment opener (slash-slash, slash-star, or a leading jsdoc
// star), only whitespace, then a placeholder keyword as a WHOLE WORD. Requiring
// the opener + leading-whitespace-only means a mid-sentence mention in prose is
// NOT a violation — only a comment that LEADS with the directive is. Scanned over
// strings-blanked text so the same keyword inside a string literal vanishes. This
// form ALSO catches a commented-out "uncomment when X" TODO bench body.
const PLACEHOLDER_DIRECTIVE = /(?:\/\/|\/\*|\*)\s*\b(?:TODO|FIXME|XXX|HACK)\b/;

/**
 * The governed corpus: the IR-scoped judged `files()` UNIONED with the UNSCOPED
 * `allFiles()` (which the node context unions the `tests/` tree into) — minus
 * `tests/generated/` (the plumb-gate's tree). De-duped + sorted for a deterministic fold.
 * A context that predates `allFiles()` falls back to `files()`.
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

/** Scan COMMENT context (strings blanked) for a leading placeholder directive. */
function scan(context: GateContext): readonly Finding[] {
  const findings: Finding[] = [];
  for (const file of governedFiles(context)) {
    const text = context.readFile(file);
    if (text === undefined) continue;
    // Blank STRINGS (so a keyword in a string literal does not count) but KEEP
    // comments — the directive lives in one. One finding per offending line.
    const lines = stringsBlanked(text).split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (PLACEHOLDER_DIRECTIVE.test(lines[i] ?? '')) {
        const isBench = /\.bench\.ts$/.test(file);
        findings.push(
          finding({
            ruleId: 'gauntlet/no-placeholder',
            severity: 'error',
            level: 'L1',
            title: 'Placeholder — unfinished work shipped as source',
            detail: `${file}:${i + 1} carries a placeholder directive comment (TODO / FIXME / XXX / HACK)${isBench ? ' — a commented-out / TODO bench body reads as a measured benchmark while measuring nothing' : ''}. A placeholder is a signed promise of unfinished work left in shipped code — it reads as done while doing nothing. This rule is always-blocking: a placeholder can never be waived, only finished or removed.`,
            location: { file, line: i + 1 },
            remediation: {
              kind: 'instruction',
              description: 'Finish the work or remove the marker — a placeholder is never shippable.',
              steps: [
                'Do the work the marker stands in for, then delete the marker (for a TODO bench: if the measured API now EXISTS, uncomment + wire the bench; if it does not, delete the dead commented-out body — never leave the TODO).',
                'If the work is genuinely out of scope for this change, file it as a tracked issue and remove the in-source marker — the issue tracker, not the source, carries the debt.',
                'If a path is genuinely unsupported, throw a tagged @czap/error UnsupportedError that names exactly what is unsupported and why — an honest, catchable failure, never a marker that ships green.',
              ],
            },
          }),
        );
      }
    }
  }
  return findings;
}

/**
 * The OUT-OF-IR EVIDENCE digest — the verdict-cache soundness fold. The gate now reads
 * the `tests/` corpus through the UNSCOPED `allFiles()` (OUTSIDE the IR); adding a TODO
 * placeholder under `tests/` (e.g. a commented-out bench body) flips a finding WITHOUT
 * touching any IR source byte, so the cache would serve a stale "green" unless this
 * evidence is folded. We fold the EXACT governed corpus the gate's `run` reads, as
 * `(path, body)` pairs — the same pattern {@link claimPropertyGate} uses.
 */
function noPlaceholderEvidenceDigest(context: GateContext): string {
  const entries: [string, string][] = [];
  for (const file of governedFiles(context)) {
    const text = context.readFile(file);
    if (text === undefined) continue;
    entries.push([file, text]);
  }
  return stableEvidenceDigest(entries);
}

/** The qualified gate — fixtures included, so it self-proves via the ratchet. */
export const noPlaceholderGate: Gate = defineGate({
  id: 'gauntlet/no-placeholder',
  level: 'L1',
  describe:
    'Flags placeholder directive comments (TODO / FIXME / XXX / HACK) across package source + the tests/ tree (incl. commented-out tests/bench/*.bench.ts TODO bodies) — unfinished work shipped as source.',
  run: scan,
  evidenceDigest: noPlaceholderEvidenceDigest,
  fixtures: {
    red: {
      name: 'a tests/bench TODO-placeholder (a commented-out bench body) — out of the old IR scope',
      context: memoryContext({
        // A commented-out bench body behind a leading "uncomment when …" TODO marker, in
        // a tests/bench file (out of the old packages/*/src scope). It reads as a measured
        // benchmark while measuring nothing — the placeholder lie the gate must catch.
        'tests/bench/widget.bench.ts':
          '// TODO(task): uncomment when resolveWidget is implemented\n// bench.add("resolveWidget", () => resolveWidget());\nimport { bench } from "vitest";\nbench("real", () => {});\n',
      }),
    },
    green: {
      name: 'a tests/ file that only MENTIONS the placeholder words descriptively',
      context: memoryContext({
        // The keywords appear ONLY mid-sentence in prose and inside a string — the
        // directive-form + strings-blanked scan must leave all of them clean.
        'tests/unit/widget/good.test.ts':
          "// This module replaces the old marker-ridden path with a finished one.\nconst note = 'no marker here — this is the real implementation';\nit('runs', () => { expect(note.length).toBeGreaterThan(0); });\n",
      }),
    },
    mutation: {
      describe:
        'A gate that scans COMMENTS-BLANKED text (the inverse of the correct strings-blanked floor) erases the very leading-comment the TODO directive lives in, so the red fixture — a commented-out bench TODO — escapes. The mutant must then DIFFER from the original on the red fixture (it finds nothing where the original finds the bench TODO placeholder).',
      mutate: (gate: Gate): Gate => ({
        ...gate,
        run: (context: GateContext): readonly Finding[] => {
          // Mutant: blank COMMENTS instead of STRINGS — the leading slash-slash TODO
          // directive is erased, so the placeholder is never seen. The bench-TODO red
          // fixture escapes.
          const out: Finding[] = [];
          for (const file of governedFiles(context)) {
            const text = context.readFile(file);
            if (text === undefined) continue;
            const lines = commentsBlanked(text).split('\n');
            for (let i = 0; i < lines.length; i++) {
              if (PLACEHOLDER_DIRECTIVE.test(lines[i] ?? '')) {
                out.push(
                  finding({
                    ruleId: gate.id,
                    severity: 'error',
                    level: 'L1',
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
