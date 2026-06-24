/**
 * Gate: no `@ts-ignore` / `@ts-nocheck`.
 *
 * These two directives silence the type-checker BLINDLY — `@ts-ignore` suppresses
 * whatever error is on the next line (including one that appears later, when the
 * code shifts under it), and `@ts-nocheck` turns off checking for a whole file.
 * Both hide real type holes. `@ts-expect-error` is the typed, intentional sibling
 * — it asserts an error IS present and fails if the error disappears — so it is
 * explicitly NOT flagged.
 *
 * The targets ARE comments, so this gate must NOT use {@link codeOnly} (which
 * blanks comments and would erase the very thing it looks for). It instead scans
 * {@link stringsBlanked} text — string literals blanked, comments KEPT — so a
 * genuine ts-ignore directive comment is seen, but the identical text written
 * inside a fixture or description STRING is not, which is what keeps THIS file's
 * own prose from tripping the gate. And it matches only the
 * DIRECTIVE FORM (a comment opener immediately followed by the directive), so a
 * mid-sentence prose mention of `@ts-ignore` in a docstring is not a violation.
 * It ships red / green / mutation fixtures, so it self-proves via the ratchet.
 *
 * @module
 */

import { defineGate, type GateContext, type Gate } from '../gate.js';
import { finding, type Finding } from '../finding.js';
import { memoryContext } from '../engine.js';
import { stringsBlanked } from './code-only.js';

// DIRECTIVE FORM: a comment opener (`//`, `/*`, or a leading jsdoc `*`), only
// whitespace, then `@ts-ignore` / `@ts-nocheck` (NOT `@ts-expect-error`, the
// typed sibling). Requiring the comment opener means a mid-sentence prose mention
// ("replace @ts-ignore with…") in a docstring is NOT flagged — only an actual
// directive comment is. The trailing `\b(?!-)` pins it to the exact directive.
const BLIND_TS_DIRECTIVE = /(?:\/\/|\/\*|\*)\s*@ts-(?:ignore|nocheck)\b(?!-)/;

/**
 * Scan comment-context lines for a blind directive. We blank string literals
 * first ({@link stringsBlanked}) so this file's own fixture strings do not count,
 * but KEEP comments — the directive lives in one. One finding per offending line.
 */
function scan(context: GateContext): readonly Finding[] {
  const findings: Finding[] = [];
  for (const file of context.files()) {
    if (!file.endsWith('.ts')) continue;
    const text = context.readFile(file);
    if (text === undefined) continue;
    // Blank strings, keep comments — a real directive comment survives, but the
    // same text inside a string literal (a fixture / description) is erased.
    const lines = stringsBlanked(text).split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (BLIND_TS_DIRECTIVE.test(lines[i] ?? '')) {
        findings.push(
          finding({
            ruleId: 'gauntlet/no-ts-ignore',
            severity: 'error',
            level: 'L1',
            title: 'Blind type-checker suppression (@ts-ignore / @ts-nocheck)',
            detail: `${file}:${i + 1} silences the type-checker blindly. @ts-ignore suppresses whatever error lands on the next line (even one that appears later as code shifts), and @ts-nocheck disables checking for the whole file — both hide real type holes.`,
            location: { file, line: i + 1 },
            remediation: {
              kind: 'instruction',
              description:
                'Replace the blind suppression with a typed, intentional assertion — or fix the underlying type.',
              steps: [
                'Prefer fixing the type error so no suppression is needed at all.',
                'If the error is genuinely expected (e.g. a deliberately-wrong call in a test), replace @ts-ignore with @ts-expect-error — it asserts the error IS present and fails loudly if it ever disappears.',
                'Never use @ts-nocheck on shipped source; if a generated file must opt out, isolate it and exclude it from the gate scope.',
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
export const noTsIgnoreGate: Gate = defineGate({
  id: 'gauntlet/no-ts-ignore',
  level: 'L1',
  describe: 'Flags `@ts-ignore` / `@ts-nocheck` — use `@ts-expect-error` (a typed, intentional assertion) instead.',
  run: scan,
  fixtures: {
    red: {
      name: 'a file with a @ts-ignore directive',
      context: memoryContext({ 'bad.ts': '// @ts-ignore\nconst x: number = "nope";\n' }),
    },
    green: {
      name: 'a file using @ts-expect-error only',
      context: memoryContext({
        'good.ts':
          '// @ts-expect-error — deliberately wrong, asserts the error is present\nconst x: number = "nope";\n',
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
