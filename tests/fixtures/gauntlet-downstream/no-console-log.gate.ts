/**
 * The downstream-authored custom gate — the extensibility proof's payload.
 *
 * This file simulates a DOWNSTREAM project's own fitness function. It is written
 * ONLY against the public `@liteship/gauntlet` plugin surface (`defineGate`, the
 * {@link GateContext} read API, `finding`, and `memoryContext` for its fixtures) —
 * the exact imports a project that ran `npm i @liteship/gauntlet` would have. It reaches
 * into NO `@liteship/gauntlet/src/*` internal, monkey-patches NOTHING, and adds NO
 * field to the engine. If this gate can earn blocking authority through the SAME
 * authority ratchet LiteShip's built-ins use, the engine is genuinely extendable
 * with zero rebuild + no fork (ADR-0012).
 *
 * The rule is a deliberately downstream-specific domain rule (NOT one of
 * LiteShip's built-ins): "no `console.log(...)` in shipped source." It ships the
 * red / green / mutation fixtures the ratchet demands, so it qualifies itself.
 *
 * @module
 */

import {
  defineGate,
  finding,
  memoryContext,
  type Gate,
  type GateContext,
  type Finding,
} from '@liteship/gauntlet';

/**
 * Match a `console.log(` call. Narrow on purpose: the downstream rule forbids
 * `console.log` debug crumbs in shipped source, not structured logging via a
 * logger. (`console.error` / `console.warn` are intentionally out of scope.)
 */
const CONSOLE_LOG = /\bconsole\s*\.\s*log\s*\(/;

/**
 * The fold: one finding per `console.log(` line in a `.ts` source file. Reads
 * ONLY through the {@link GateContext} (`files()` + `readFile`), so it runs against
 * an in-memory fixture and the real downstream tree unchanged — the same portability
 * contract LiteShip's own gates honour.
 */
function scan(context: GateContext): readonly Finding[] {
  const findings: Finding[] = [];
  for (const file of context.files()) {
    if (!file.endsWith('.ts')) continue;
    const text = context.readFile(file);
    if (text === undefined) continue;
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (CONSOLE_LOG.test(lines[i] ?? '')) {
        findings.push(
          finding({
            ruleId: 'downstream/no-console-log',
            severity: 'error',
            level: 'L2',
            title: 'console.log in shipped source',
            detail: `${file}:${i + 1} calls console.log. Shipped source must not carry debug crumbs — route diagnostics through the project's structured logger instead.`,
            location: { file, line: i + 1 },
            remediation: {
              kind: 'instruction',
              description: 'Remove the console.log or replace it with the structured logger.',
              steps: [
                'Delete the console.log line if it was a debug crumb.',
                'If the line is real diagnostics, route it through the project logger so it carries level + context.',
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
 * The downstream gate — fixtures included, so it self-proves via the SAME ratchet
 * (`verifyGate`) the engine applies to LiteShip's built-ins. Nothing here is a
 * special path: a malformed gate (missing a fixture) would throw at `defineGate`,
 * and an unproven gate would be capped to advisory by `runGates`.
 */
export const noConsoleLogGate: Gate = defineGate({
  id: 'downstream/no-console-log',
  level: 'L2',
  describe: 'Downstream rule: no `console.log(...)` in shipped source — route diagnostics through the structured logger.',
  run: scan,
  fixtures: {
    red: {
      name: 'a file with a console.log debug crumb',
      context: memoryContext({
        'leaky.ts': "export function greet(name: string): string {\n  console.log('debug', name);\n  return `hi ${name}`;\n}\n",
      }),
    },
    green: {
      name: 'a file with no console.log',
      context: memoryContext({
        'clean.ts': 'export function greet(name: string): string {\n  return `hi ${name}`;\n}\n',
      }),
    },
    mutation: {
      describe:
        'A gate that scans for a token that never appears catches nothing — the red fixture must then go unflagged, killing the mutant.',
      mutate: (gate: Gate): Gate => ({
        ...gate,
        run: (context: GateContext): readonly Finding[] =>
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
