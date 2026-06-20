/**
 * Gate: no ambient nondeterminism (`Date.now(` / `Math.random(` / argless `new Date()`).
 *
 * The gauntlet's L3 contract is determinism: a deterministic runtime / projection
 * / cache path must yield the same output for the same input, run-to-run. Three
 * ambient sources break that the moment they appear in such a path —
 * `Date.now()`, `Math.random()`, and `new Date()` with no argument (which reads
 * the wall clock). Each must instead come from an INJECTED source (a passed-in
 * clock / RNG / seed) so the path is reproducible and testable.
 *
 * The targets are real calls, so this gate uses the shared {@link codeOnly}
 * stripper: a `Date.now()` written inside a docstring or a string literal is not
 * a determinism hazard and must not be flagged. It ships red / green / mutation
 * fixtures, so it self-proves via the authority ratchet.
 *
 * @module
 */

import { defineGate, type GateContext, type Gate } from '../gate.js';
import { finding, type Finding } from '../finding.js';
import { memoryContext } from '../engine.js';
import { codeOnly } from './code-only.js';

// `Date.now(` and `Math.random(` (the open-paren pins it to a CALL, not a mere
// reference), plus `new Date()` with EMPTY args (argless = reads the wall clock;
// `new Date(ms)` / `new Date(iso)` are deterministic and intentionally allowed).
const NONDETERMINISM = /\bDate\.now\(|\bMath\.random\(|\bnew Date\(\s*\)/;

/** Scan CODE only (never a clock written in a comment/string); one finding per line. */
function scan(context: GateContext): readonly Finding[] {
  const findings: Finding[] = [];
  for (const file of context.files()) {
    if (!file.endsWith('.ts')) continue;
    const text = context.readFile(file);
    if (text === undefined) continue;
    // Scan CODE only — a clock inside a comment or string is not a hazard.
    const lines = codeOnly(text).split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (NONDETERMINISM.test(lines[i] ?? '')) {
        findings.push(
          finding({
            ruleId: 'gauntlet/no-nondeterminism',
            severity: 'error',
            level: 'L3',
            title: 'Ambient nondeterminism (Date.now / Math.random / argless new Date)',
            detail: `${file}:${i + 1} reads an ambient nondeterministic source. The L3 contract is determinism — the same input must yield the same output run-to-run — and a wall-clock read or an unseeded random breaks it. The value must come from an injected clock / RNG instead.`,
            location: { file, line: i + 1 },
            remediation: {
              kind: 'instruction',
              description: 'Inject the source of time/randomness so the path is reproducible.',
              steps: [
                'Replace Date.now() / new Date() with a passed-in clock (e.g. clock.now()) supplied by the caller or context.',
                'Replace Math.random() with a seeded RNG threaded through the same channel.',
                'If this code is genuinely outside the deterministic core (a true I/O boundary), move it there and pass the captured value inward — the L3 path must stay pure.',
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
export const noNondeterminismGate: Gate = defineGate({
  id: 'gauntlet/no-nondeterminism',
  level: 'L3',
  describe: 'Flags `Date.now(` / `Math.random(` / argless `new Date()` — the L3 determinism contract.',
  run: scan,
  fixtures: {
    red: {
      name: 'a file reading the wall clock',
      context: memoryContext({ 'bad.ts': 'export function stamp() {\n  const t = Date.now();\n  return t;\n}\n' }),
    },
    green: {
      name: 'a file using an injected clock',
      context: memoryContext({
        'good.ts': 'export function stamp(clock: { now(): number }) {\n  const t = clock.now();\n  return t;\n}\n',
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
                level: 'L3',
                title: 'mutant',
                detail: f,
              }),
            ),
      }),
    },
  },
});
