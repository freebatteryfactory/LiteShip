/**
 * The IR-fold twin of {@link noBareThrowGate} — same rule, proven over the
 * repo-IR instead of a raw text scan (Slice B, B1 — the "re-express a gate as an
 * IR fold" deliverable).
 *
 * Where the regex gate scans `codeOnly(text)` line by line, this gate folds the
 * IR's `bare-throw` facts emitted by the AST oracle (oracleId `ts-ast`,
 * coverageClass `file-proxy-only`). Because the AST sees the real throw STATEMENT
 * (a `throw new (Error|RangeError|TypeError)(…)`), it never fires on the throw
 * token inside a comment or string — it is a STRICT REFINEMENT of the text scan.
 * The parity test (`no-bare-throw-ir-parity.test.ts`) proves the two agree on the
 * genuine code bare-throws of the real repo (both find the same set, since the
 * repo is cured to zero), and that any legitimate divergence is the AST being
 * MORE precise.
 *
 * It REQUIRES the injected IR (it folds facts, it does not scan text), so it runs
 * only on the host path where the CLI builds + injects the IR via `@czap/audit`'s
 * `ts.Program`; the lean MCP/command path (no IR) does not run it. Same
 * `ruleId`/severity/level as the regex gate.
 *
 * @module
 */

import { defineGate, requireIR, type GateContext, type Gate } from '../gate.js';
import { finding, type Finding } from '../finding.js';
import { memoryContext } from '../engine.js';
import { makeRepoIR, type Fact, type RepoIR } from '../repo-ir.js';

/** The shared rule id — IDENTICAL to the regex gate's, so they are one rule. */
const RULE_ID = 'gauntlet/no-bare-throw';

/** True iff `fact` is the AST oracle's `bare-throw` observation. */
function isBareThrowFact(fact: Fact): boolean {
  return fact.property === 'bare-throw' && fact.oracleId === 'ts-ast' && fact.value === true;
}

/** Fold the IR's `bare-throw`/`ts-ast` facts into findings — one per throw site. */
function fold(context: GateContext): readonly Finding[] {
  const ir = requireIR(context, RULE_ID);
  const findings: Finding[] = [];
  for (const fact of ir.facts) {
    if (!isBareThrowFact(fact)) continue;
    findings.push(
      finding({
        ruleId: RULE_ID,
        severity: 'error',
        level: 'L1',
        title: 'Bare throw instead of a tagged @czap/error variant',
        detail: `${fact.file}:${fact.line ?? 0} throws a bare Error. Every failure path must be a tagged @czap/error variant so it carries a _tag, structured fields, and a catchable identity. (AST-precise: the throw statement itself, never a comment/string occurrence.)`,
        location: { file: fact.file, ...(fact.line !== undefined ? { line: fact.line } : {}) },
        coverageClass: fact.coverageClass,
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
  return findings;
}

/** A {@link GateContext} carrying ONLY an in-memory IR (no file map) — fixtures. */
function irContext(ir: RepoIR): GateContext {
  return { ...memoryContext({}), ir };
}

/** An in-memory IR with one `bare-throw`/`ts-ast` fact at `file:line`. */
function irWithBareThrow(file: string, line: number): RepoIR {
  return makeRepoIR({
    files: [{ id: file, contentDigest: 'placeholder:no-content-address', packageName: null }],
    facts: [{ file, line, property: 'bare-throw', value: true, oracleId: 'ts-ast', coverageClass: 'file-proxy-only' }],
  });
}

/**
 * The IR-fold no-bare-throw gate — fixtures are in-memory {@link RepoIR}s (not
 * text maps), proving the gate folds the AST oracle's facts. Self-proves via the
 * same ratchet as every gate.
 */
export const noBareThrowIRGate: Gate = defineGate({
  id: RULE_ID,
  level: 'L1',
  describe:
    "Flags bare `throw new Error(...)` by folding the IR's AST-precise `bare-throw` facts (the IR-fold twin of no-bare-throw).",
  run: fold,
  fixtures: {
    red: {
      name: 'an IR carrying a bare-throw fact',
      context: irContext(irWithBareThrow('bad.ts', 2)),
    },
    green: {
      name: 'an IR with no bare-throw facts',
      context: irContext(
        makeRepoIR({
          files: [{ id: 'good.ts', contentDigest: 'placeholder:no-content-address', packageName: null }],
          // A non-bare-throw fact (a different property) must NOT be folded.
          facts: [
            {
              file: 'good.ts',
              line: 1,
              property: 'is-default-export',
              value: true,
              oracleId: 'ts-ast',
              coverageClass: 'file-proxy-only',
            },
          ],
        }),
      ),
    },
    mutation: {
      describe:
        "A mutant that folds facts WITHOUT checking the property (counts every fact as a bare-throw) flags the green IR's is-default-export fact — the green fixture must then go red and kill it.",
      mutate: (gate: Gate): Gate => ({
        ...gate,
        run: (context: GateContext): readonly Finding[] => {
          const ir = requireIR(context, RULE_ID);
          // Mutant: ignore the property/oracle guard — fold EVERY fact. The green
          // fixture (which has a non-bare-throw fact) then yields a finding, so the
          // mutant fails green-clean and is killed.
          return ir.facts.map((f) =>
            finding({ ruleId: RULE_ID, severity: 'error', level: 'L1', title: 'mutant', detail: f.file }),
          );
        },
      }),
    },
  },
});
