/**
 * Reference gate: no bare `throw new Error(...)`.
 *
 * The first built-in gate — and the proof the foundation works end to end. It
 * guards the invariant the Slice-A migration established: every failure path is
 * a tagged `@czap/error` variant, never a bare `throw new Error(...)`. It ships
 * the red / green / mutation fixtures the authority ratchet demands, so it
 * qualifies itself.
 *
 * @module
 */

import { defineGate, type GateContext, type Gate } from '../gate.js';
import { finding, type Finding } from '../finding.js';
import { memoryContext } from '../engine.js';
import { codeOnly } from './code-only.js';

const BARE_THROW = /\bthrow new (?:Error|RangeError|TypeError)\(/;

/** Scan the context's files for bare throws; one finding per offending line. */
function scan(context: GateContext): readonly Finding[] {
  const findings: Finding[] = [];
  for (const file of context.files()) {
    if (!file.endsWith('.ts')) continue;
    const text = context.readFile(file);
    if (text === undefined) continue;
    // Scan CODE only — never a throw that lives inside a comment or string.
    const lines = codeOnly(text).split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (BARE_THROW.test(lines[i] ?? '')) {
        findings.push(
          finding({
            ruleId: 'gauntlet/no-bare-throw',
            severity: 'error',
            level: 'L1',
            title: 'Bare throw instead of a tagged @czap/error variant',
            detail: `${file}:${i + 1} throws a bare Error. Every failure path must be a tagged @czap/error variant so it carries a _tag, structured fields, and a catchable identity.`,
            location: { file, line: i + 1 },
            remediation: {
              kind: 'instruction',
              description: 'Replace the bare throw with the best-fit @czap/error variant.',
              steps: [
                'Pick the variant by semantics: caller-bad-input → ValidationError; external bytes → ParseError; io → IoError; impossible state → InvariantViolationError; missing capability → HostCapabilityError; not found → NotFoundError; unsupported case → UnsupportedError; hash/sig/chain → IntegrityError.',
                'Import it from @czap/error and throw the factory result (carry the message into the variant detail).',
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
export const noBareThrowGate: Gate = defineGate({
  id: 'gauntlet/no-bare-throw',
  level: 'L1',
  describe: 'Flags bare `throw new Error(...)` — every failure path must be a tagged @czap/error variant.',
  run: scan,
  fixtures: {
    red: {
      name: 'a file with a bare throw',
      context: memoryContext({ 'bad.ts': "export function f() {\n  throw new Error('nope');\n}\n" }),
    },
    green: {
      name: 'a file using a tagged variant',
      context: memoryContext({
        'good.ts':
          "import { ValidationError } from '@czap/error';\nexport function f() {\n  throw ValidationError('f', 'nope');\n}\n",
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
