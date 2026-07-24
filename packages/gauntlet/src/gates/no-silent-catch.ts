/**
 * Gate: no silent catch (a `catch { }` that swallows the error).
 *
 * A catch block whose body is empty — `catch (e) {}` or `catch {}` — discards the
 * caught error entirely: it is neither rethrown, logged, nor inspected. The
 * failure vanishes, and the next observer sees corrupted state with no trace of
 * its cause. That is the L2 hazard this gate guards: a serialized / API path that
 * silently eats its own faults is lying about its contract.
 *
 * The heuristic is deliberately SIMPLE and PRECISE — it favours false-NEGATIVES
 * over false-positives (a gate with false positives fails its own green floor and
 * never earns blocking authority). It matches, on the {@link codeOnly}-stripped
 * text, a `catch` keyword, an optional `( … )` binding, then a brace block that
 * contains ONLY whitespace. A catch that logs, rethrows, or uses the error has a
 * non-empty body and is not flagged; a richer control-flow oracle arrives with
 * Slice B's AST.
 *
 * It ships red / green / mutation fixtures, so it self-proves via the ratchet.
 *
 * @module
 */

import { defineGate, type GateContext, type Gate } from '../gate.js';
import { finding, type Finding } from '../finding.js';
import { memoryContext } from '../engine.js';
import { codeOnly } from './code-only.js';

// `catch`, optional whitespace, an optional `( … )` binding (no nested parens —
// a catch binding is a single identifier or destructure, never a call), optional
// whitespace, then a brace block whose entire interior is whitespace only.
// Matched against codeOnly'd text (which can span the newline a `{\n}` uses), so
// the `\s*` between the braces absorbs any blank lines.
const SILENT_CATCH = /\bcatch\b\s*(?:\([^()]*\))?\s*\{\s*\}/;

/**
 * Scan CODE only, over the WHOLE-file stripped text (not per-line) so a
 * `catch (e) {\n}` split across lines is still caught. The finding's line is the
 * line the `catch` keyword sits on (the offset of the match, counted in newlines).
 */
function scan(context: GateContext): readonly Finding[] {
  const findings: Finding[] = [];
  for (const file of context.files()) {
    if (!file.endsWith('.ts')) continue;
    const text = context.readFile(file);
    if (text === undefined) continue;
    // Scan CODE only — a `catch (e) {}` written inside a string/comment is not a
    // real swallow. Run the matcher over the whole stripped text so a block that
    // wraps onto the next line is still seen; derive the line from the offset.
    const stripped = (context.codeOnly ?? codeOnly)(text);
    const re = new RegExp(SILENT_CATCH, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(stripped)) !== null) {
      // Line of the match start = 1 + number of newlines before it.
      let line = 1;
      for (let i = 0; i < m.index; i++) {
        if (stripped[i] === '\n') line++;
      }
      findings.push(
        finding({
          ruleId: 'gauntlet/no-silent-catch',
          severity: 'error',
          level: 'L2',
          title: 'Silent catch — the caught error is swallowed',
          detail: `${file}:${line} has an empty catch block. The caught error is neither rethrown, logged, nor used — the failure vanishes and downstream observers see corrupted state with no trace of its cause.`,
          location: { file, line },
          remediation: {
            kind: 'instruction',
            description:
              'Do something with the caught error — rethrow, log with context, or convert it to a tagged @liteship/error variant.',
            steps: [
              'If the error is recoverable, handle it explicitly and comment WHY swallowing is correct (rare).',
              'If it is a real fault, rethrow it (optionally wrapped in a tagged @liteship/error variant that adds context).',
              'At minimum, log the error so the failure leaves a trace; never let it disappear silently.',
            ],
          },
        }),
      );
      // `\s*` can let a zero-width-ish match stall the loop on pathological input;
      // advance lastIndex defensively if the regex did not consume any input.
      if (m.index === re.lastIndex) re.lastIndex++;
    }
  }
  return findings;
}

/** The qualified gate — fixtures included, so it self-proves via the ratchet. */
export const noSilentCatchGate: Gate = defineGate({
  id: 'gauntlet/no-silent-catch',
  level: 'L2',
  describe: 'Flags empty `catch { }` blocks — a swallowed error must be rethrown, logged, or used.',
  run: scan,
  fixtures: {
    red: {
      name: 'a file with an empty catch',
      context: memoryContext({ 'bad.ts': 'export function f() {\n  try { x(); } catch (e) {}\n}\n' }),
    },
    green: {
      name: 'a file whose catch logs the error',
      context: memoryContext({ 'good.ts': 'export function f() {\n  try { x(); } catch (e) { log(e); }\n}\n' }),
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
                level: 'L2',
                title: 'mutant',
                detail: f,
              }),
            ),
      }),
    },
  },
});
