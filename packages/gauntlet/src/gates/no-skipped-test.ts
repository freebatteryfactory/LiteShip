/**
 * Gate: no skipped test (`it.skip(` / `test.skip(` / `describe.skip(` /
 * `bench.skip(` / `xit(` / `xdescribe(` / `it.todo(` / `test.todo(`).
 *
 * This is one of the two ALWAYS-BLOCKING gates — its `ruleId`
 * (`gauntlet/no-skipped-test`) is reserved in {@link ALWAYS_BLOCKING_RULES}, so a
 * waiver can NEVER cover it (you cannot waive a lie). A skipped test ships green
 * while proving nothing: it is the exact shape of unfinished work disguised as
 * passing. The owner's #1 directive — "the harness must emit only REAL tests,
 * never `it.skip`" — is this gate.
 *
 * The targets are real CALLS (`it.skip(`, not the word "it.skip" in a docstring
 * describing the anti-skip discipline), so the gate scans the {@link codeOnly}
 * stripped text: a `.skip(` written inside a comment or a fixture STRING (e.g. the
 * harness's own prose, or a test-data literal that contains an `it.skip` string)
 * is NOT a real skip and must not be flagged. That precision is what keeps the
 * gate's green floor clean — and a clean green floor is what earns it blocking
 * authority via the ratchet.
 *
 * It ships red / green / mutation fixtures, so it self-proves.
 *
 * @module
 */

import { defineGate, type GateContext, type Gate } from '../gate.js';
import { finding, type Finding } from '../finding.js';
import { memoryContext } from '../engine.js';
import { codeOnly } from './code-only.js';

// A skip/todo CALL: a test-runner verb (`it` / `test` / `describe` / `bench`)
// dotted to `skip` or `todo`, OR the `x`-prefixed legacy form (`xit` / `xdescribe`
// / `xtest`), immediately followed by an open paren (the CALL — `it.skip(`, never
// a bare reference or a type literal `'it.skip'`). The open paren is what pins it
// to an invocation: `kind: 'it.skip' | 'test.skip'` (a string-union TYPE) is
// blanked by codeOnly anyway, but the `\(` makes the intent explicit.
const SKIPPED_TEST = /\b(?:it|test|describe|bench)\.(?:skip|todo)\s*\(|\bx(?:it|describe|test)\s*\(/;

/** Scan CODE only (never a skip written in a comment/string); one finding per line. */
function scan(context: GateContext): readonly Finding[] {
  const findings: Finding[] = [];
  for (const file of context.files()) {
    if (!file.endsWith('.ts')) continue;
    const text = context.readFile(file);
    if (text === undefined) continue;
    // Scan CODE only — a `.skip(` inside a comment or a test-data string is not a
    // real skipped test (the harness's own anti-skip prose must not trip it).
    const lines = codeOnly(text).split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (SKIPPED_TEST.test(lines[i] ?? '')) {
        findings.push(
          finding({
            ruleId: 'gauntlet/no-skipped-test',
            severity: 'error',
            level: 'L2',
            title: 'Skipped test — green while proving nothing',
            detail: `${file}:${i + 1} skips a test (.skip / .todo / x-prefixed). A skipped test ships GREEN while asserting nothing — it is unfinished work disguised as passing, the exact lie the harness must never emit. This rule is always-blocking: a skip can never be waived, only made real or honestly removed.`,
            location: { file, line: i + 1 },
            remediation: {
              kind: 'instruction',
              description: 'Make the test real, or remove it — never leave a skip shipping green.',
              steps: [
                'If the test asserts something real, WIRE it: bind the real subject and turn the skip into a running `it(...)` with teeth.',
                'If the case is genuinely not-applicable (a capability absent in this environment), use a TYPED self-reporting exemption that the harness records — not a silent `.skip(` that hides as green.',
                'If the test was a placeholder for work not yet done, delete it; an empty promise of coverage is worse than no test (it reads as covered).',
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
export const noSkippedTestGate: Gate = defineGate({
  id: 'gauntlet/no-skipped-test',
  level: 'L2',
  describe:
    'Flags skipped tests (`it.skip(` / `test.skip(` / `.todo(` / `xit(`) — a skip ships green while proving nothing.',
  run: scan,
  fixtures: {
    red: {
      name: 'a test file with an it.skip call',
      context: memoryContext({ 'bad.test.ts': "it.skip('not wired yet', () => {});\n" }),
    },
    green: {
      name: 'a test file with a real running test (+ the word it.skip only in prose)',
      context: memoryContext({
        // A REAL test, plus a docstring + a string literal that mention `it.skip`
        // descriptively — the codeOnly strip must blank both so neither trips the gate.
        'good.test.ts':
          "// This suite never uses it.skip — every test runs.\nit('asserts a real fact', () => {\n  const label = 'unlike an it.skip placeholder, this asserts';\n  expect(label.length).toBeGreaterThan(0);\n});\n",
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
                level: 'L2',
                title: 'mutant',
                detail: f,
              }),
            ),
      }),
    },
  },
});
