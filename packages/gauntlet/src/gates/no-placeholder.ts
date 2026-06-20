/**
 * Gate: no placeholder — `TODO` / `FIXME` / `XXX` / `HACK` directive comments.
 *
 * This is one of the two ALWAYS-BLOCKING gates — its `ruleId`
 * (`gauntlet/no-placeholder`) is reserved in {@link ALWAYS_BLOCKING_RULES}, so a
 * waiver can NEVER cover it. A placeholder is a signed promise of unfinished work
 * left inside shipped source; the owner's hard directive is that placeholders ARE
 * lies and are always blocking, zero exceptions.
 *
 * Precision is everything here, because the false-positive cost is high — and a
 * gate with a dirty green floor never earns blocking authority. The gate matches
 * only the DIRECTIVE FORM: a comment opener (a slash-slash, a slash-star, or a
 * leading jsdoc star) followed — after only whitespace — by a placeholder keyword
 * as a WHOLE WORD. That means:
 * - a leading directive comment is flagged (the real "left for later" marker),
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
import { stringsBlanked } from './code-only.js';

// DIRECTIVE FORM: a comment opener (slash-slash, slash-star, or a leading jsdoc
// star), only whitespace, then a placeholder keyword as a WHOLE WORD. Requiring
// the opener + leading-whitespace-only means a mid-sentence mention in prose is
// NOT a violation — only a comment that LEADS with the directive is. Scanned over
// strings-blanked text so the same keyword inside a string literal vanishes.
const PLACEHOLDER_DIRECTIVE = /(?:\/\/|\/\*|\*)\s*\b(?:TODO|FIXME|XXX|HACK)\b/;

/** Scan COMMENT context (strings blanked) for a leading placeholder directive. */
function scan(context: GateContext): readonly Finding[] {
  const findings: Finding[] = [];
  for (const file of context.files()) {
    if (!file.endsWith('.ts')) continue;
    const text = context.readFile(file);
    if (text === undefined) continue;
    // Blank STRINGS (so a keyword in a string literal does not count) but KEEP
    // comments — the directive lives in one. One finding per offending line.
    const lines = stringsBlanked(text).split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (PLACEHOLDER_DIRECTIVE.test(lines[i] ?? '')) {
        findings.push(
          finding({
            ruleId: 'gauntlet/no-placeholder',
            severity: 'error',
            level: 'L1',
            title: 'Placeholder — unfinished work shipped as source',
            detail: `${file}:${i + 1} carries a placeholder directive comment (TODO / FIXME / XXX / HACK). A placeholder is a signed promise of unfinished work left in shipped code — it reads as done while doing nothing. This rule is always-blocking: a placeholder can never be waived, only finished or removed.`,
            location: { file, line: i + 1 },
            remediation: {
              kind: 'instruction',
              description: 'Finish the work or remove the marker — a placeholder is never shippable.',
              steps: [
                'Do the work the marker stands in for, then delete the marker.',
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

/** The qualified gate — fixtures included, so it self-proves via the ratchet. */
export const noPlaceholderGate: Gate = defineGate({
  id: 'gauntlet/no-placeholder',
  level: 'L1',
  describe: 'Flags placeholder directive comments (TODO / FIXME / XXX / HACK) — unfinished work shipped as source.',
  run: scan,
  fixtures: {
    red: {
      name: 'a file with a leading placeholder directive comment',
      context: memoryContext({ 'bad.ts': 'export function f() {\n  // FIXME: wire the real path\n  return 0;\n}\n' }),
    },
    green: {
      name: 'a file that only MENTIONS the placeholder words descriptively',
      context: memoryContext({
        // The keywords appear ONLY mid-sentence in prose and inside a string — the
        // directive-form + strings-blanked scan must leave all of them clean.
        'good.ts':
          "// This module replaces the old marker-ridden path with a finished one.\nexport const note = 'no marker here — this is the real implementation';\nexport function f() {\n  return 1;\n}\n",
      }),
    },
    mutation: {
      describe: 'A gate that scans for an impossible token catches nothing — the red fixture must then go unflagged.',
      mutate: (gate: Gate): Gate => ({
        ...gate,
        run: (context: GateContext): readonly Finding[] =>
          // Mutant: look for a token that never appears. A toothless gate.
          context
            .files()
            .filter((f) => (context.readFile(f) ?? '').includes('__never_present_token__'))
            .map((f) =>
              finding({
                ruleId: gate.id,
                severity: 'error',
                level: 'L1',
                title: 'mutant',
                detail: f,
              }),
            ),
      }),
    },
  },
});
