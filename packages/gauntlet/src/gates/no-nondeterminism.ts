/**
 * Gate: no ambient nondeterminism (`Date.now(` / `performance.now(` /
 * `Math.random(` / argless `new Date()`).
 *
 * The gauntlet's L3 contract is determinism: a deterministic runtime / projection
 * / cache path must yield the same output for the same input, run-to-run. FOUR
 * ambient sources break that the moment they appear in such a path:
 * - `Date.now()` — the EPOCH wall clock (drives timestamps / HLC);
 * - `performance.now()` — the MONOTONIC clock (drives durations / frame budgets);
 * - `Math.random()` — unseeded randomness;
 * - `new Date()` with no argument (reads the wall clock).
 *
 * `performance.now()` is included deliberately: it is monotonic, not epoch, so it
 * is easy to assume it is "safe" — but a duration read straight off the ambient
 * monotonic clock is exactly as non-reproducible as a `Date.now()` timestamp, and
 * (per the clock-substrate law) funnelling it into the wrong boundary is the
 * monotonic-into-timestamp laundering bug. Each ambient read must instead come
 * from an INJECTED source (the `@liteship/core` `systemClock` / `wallClock` /
 * `systemRng` substrate, threaded as a `Clock` / `Rng`) so the path is
 * reproducible and testable. A legitimately-declared boundary (the single
 * sanctioned read every other path routes through) is sanctioned by a WAIVER in
 * `waivers.ts`, never by a hole in this gate.
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

// `Date.now(` / `performance.now(` / `Math.random(` (the open-paren pins each to a
// CALL, not a mere reference), plus `new Date()` with EMPTY args (argless = reads
// the wall clock; `new Date(ms)` / `new Date(iso)` are deterministic and
// intentionally allowed). `performance.now(` is included so the MONOTONIC ambient
// read is caught too — a duration off the ambient monotonic clock is as
// non-reproducible as a `Date.now()` timestamp, and threads through the SAME
// injected-boundary / waiver mechanism as the others.
const NONDETERMINISM = /\bDate\.now\(|\bperformance\.now\(|\bMath\.random\(|\bnew Date\(\s*\)/;

/** Scan CODE only (never a clock written in a comment/string); one finding per line. */
function scan(context: GateContext): readonly Finding[] {
  const findings: Finding[] = [];
  for (const file of context.files()) {
    if (!file.endsWith('.ts')) continue;
    const text = context.readFile(file);
    if (text === undefined) continue;
    // Scan CODE only — a clock inside a comment or string is not a hazard. Host-injected sound scanner
    // when present; the lean char-machine fallback otherwise (pinned equivalent by the differential test).
    const lines = (context.codeOnly ?? codeOnly)(text).split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (NONDETERMINISM.test(lines[i] ?? '')) {
        findings.push(
          finding({
            ruleId: 'gauntlet/no-nondeterminism',
            severity: 'error',
            level: 'L3',
            title: 'Ambient nondeterminism (Date.now / performance.now / Math.random / argless new Date)',
            detail: `${file}:${i + 1} reads an ambient nondeterministic source. The L3 contract is determinism — the same input must yield the same output run-to-run — and a wall-clock read (Date.now / new Date), a monotonic-clock read (performance.now), or an unseeded random breaks it. The value must come from an injected clock / RNG (the @liteship/core systemClock / wallClock / systemRng substrate) instead — or, if this IS the single declared boundary, be sanctioned by an owner waiver.`,
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
      // Exercises BOTH the wall-clock (Date.now) AND the monotonic-clock
      // (performance.now) branches — proving the gate catches the ambient
      // monotonic read, not just the epoch one.
      name: 'a file reading the wall clock and the monotonic clock',
      context: memoryContext({
        'bad.ts':
          'export function stamp() {\n  const t = Date.now();\n  const d = performance.now();\n  return t + d;\n}\n',
      }),
    },
    green: {
      // An injected clock for BOTH the timestamp and the duration — neither the
      // ambient `Date.now()` nor the ambient `performance.now()` appears.
      name: 'a file using an injected clock for both timestamp and duration',
      context: memoryContext({
        'good.ts':
          'export function stamp(clock: { now(): number }) {\n  const t = clock.now();\n  const d = clock.now();\n  return t + d;\n}\n',
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
