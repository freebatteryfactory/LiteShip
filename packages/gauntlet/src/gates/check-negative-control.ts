/**
 * Gate: check-negative-control — the negative-control existence meta-gate.
 *
 * A blocking check that DECLARES a `negativeControl` (a red-fixture path proving the
 * check CAN fail) must point at a path that EXISTS. A declared-but-dangling negative
 * control is a broken safety claim: the check asserts "here is my proof I catch my
 * target", but the proof file is gone. This gate flags every blocking check whose
 * declared negativeControl resolves to nothing.
 *
 * SCOPE — a blocking check with NO declared negativeControl is NOT flagged:
 * `negativeControl` is OPTIONAL in the registry (only the gate-family checks — the
 * capability / standards / spine-relation / transition gates and the red-team suite —
 * wire a real red-fixture module; a `format` / `lint` / `typecheck` check has no
 * red-fixture module to point at). The enforceable, always-true invariant is therefore
 * "a DECLARED negativeControl must EXIST", not "every blocking check must declare one".
 *
 * LEAN BY CONSTRUCTION — a {@link FactGate}: it does NOT read the filesystem. A HOST
 * folds each blocking check's declared path + its on-disk existence into the injected
 * {@link CheckGovernanceFacts.negativeControls}; this gate only decides. Earns blocking
 * authority via red/green/mutation fixtures; absent facts fold an empty verdict.
 *
 * @module
 */

import { defineFactGate, type FactBundle, type FactGate, type Gate, type GateContext } from '../gate.js';
import { finding, type Finding } from '../finding.js';
import { memoryContext } from '../engine.js';
import type { CheckGovernanceFacts, NegativeControlFact } from '../facts/check-governance-facts.js';

/** The gate id — namespaces every {@link Finding} it emits. */
const RULE_ID = 'gauntlet/check-negative-control';

/** Build one dangling-negative-control finding. */
function danglingFinding(entry: NegativeControlFact): Finding {
  return finding({
    ruleId: RULE_ID,
    severity: 'error',
    level: 'L2',
    title: `Blocking check "${entry.id}" declares a missing negative control`,
    detail: `The blocking check "${entry.id}" declares negativeControl "${entry.negativeControl ?? '(none)'}", but that path does NOT exist. A negative control is the red-fixture proof the check CAN fail; a dangling path is a broken safety claim — the check asserts a proof file that is gone.`,
    location: { file: entry.negativeControl ?? 'packages/command/src/checks/registry.ts', line: 1 },
    remediation: {
      kind: 'instruction',
      description: 'A declared negative control must point at a real red-fixture path.',
      steps: [
        `Restore the negativeControl file "${entry.negativeControl ?? ''}" for "${entry.id}", or update the registry entry to a path that exists (or drop the negativeControl if the check has no red-fixture module).`,
      ],
    },
  });
}

/**
 * THE DECISION — data in, findings out, NO context. One finding per blocking check
 * whose DECLARED negativeControl path does not exist. A blocking check with no declared
 * control, and any advisory check, emit nothing.
 */
export function decideCheckNegativeControl(facts: FactBundle): readonly Finding[] {
  const pack: CheckGovernanceFacts | undefined = facts.checkGovernance;
  if (pack === undefined) return [];
  const findings: Finding[] = [];
  for (const entry of pack.negativeControls) {
    if (entry.blocking && entry.negativeControl !== null && !entry.exists) {
      findings.push(danglingFinding(entry));
    }
  }
  return findings;
}

// ── Fixtures (synthetic negative-control rows — a present green, a dangling red) ──

function factContext(facts: CheckGovernanceFacts): GateContext {
  return { ...memoryContext({}), checkGovernance: facts };
}

/** A well-formed facts pack carrying only the given negative-control rows. */
function governance(negativeControls: readonly NegativeControlFact[]): CheckGovernanceFacts {
  return Object.freeze({
    partition: Object.freeze({
      scripts: Object.freeze([]),
      registered: Object.freeze([]),
      exempted: Object.freeze([]),
    }),
    negativeControls: Object.freeze([...negativeControls]),
    waivers: Object.freeze([]),
  });
}

/** RED — a blocking check declaring a negativeControl that does not exist. */
const RED_FACTS = governance([
  Object.freeze({
    id: 'check/example-gate',
    blocking: true,
    negativeControl: 'packages/gauntlet/src/gates/does-not-exist.ts',
    exists: false,
  }),
]);

/** GREEN — a blocking check whose declared control exists, plus one that declares none. */
const GREEN_FACTS = governance([
  Object.freeze({
    id: 'check/example-gate',
    blocking: true,
    negativeControl: 'packages/gauntlet/src/gates/standards-integrity.ts',
    exists: true,
  }),
  Object.freeze({ id: 'check/typecheck', blocking: true, negativeControl: null, exists: false }),
]);

/**
 * The check-negative-control gate — the negative-control existence backstop. Self-proves
 * via synthetic rows; a host injects each blocking check's declared path + on-disk existence.
 */
export const checkNegativeControlGate: FactGate = defineFactGate({
  id: RULE_ID,
  level: 'L2',
  describe:
    'FactGate: declares it consumes CheckGovernanceFacts and reports every blocking check whose DECLARED negativeControl path does not exist (a dangling red-fixture proof) — the negative-control existence guard.',
  requires: ['checkGovernance'],
  decide: (facts) => decideCheckNegativeControl(facts),
  fixtures: {
    red: {
      name: 'a blocking check declaring a negativeControl that does not exist',
      context: factContext(RED_FACTS),
    },
    green: {
      name: 'a blocking check whose declared control exists (plus one that declares none)',
      context: factContext(GREEN_FACTS),
    },
    mutation: {
      describe:
        'A mutant that IGNORES the facts (returns no findings) reports NO dangling control on the red fixture — the missing negativeControl is no longer flagged and the mutant is killed.',
      mutate: (gate: Gate): Gate => {
        const blind = (): readonly Finding[] => [];
        return { ...gate, decide: blind, run: (): readonly Finding[] => blind() };
      },
    },
  },
});
