/**
 * Gate: check-negative-control — the negative-control PARTITION meta-gate.
 *
 * The acceptance criterion is "every BLOCKING check has a negative control". This
 * gate makes that TOTAL and ENFORCED: over the blocking checks it proves a total,
 * disjoint partition — each blocking check is classified EXACTLY once. It EITHER
 *
 *   (a) DECLARES a `negativeControl` (a red-fixture / regression-guard / self-proving
 *       gate that plants a regression the check catches) whose path EXISTS, OR
 *   (b) is a key of `NEGATIVE_CONTROL_EXEMPT` — a documented, reasoned decision that
 *       a planted-regression fixture would be vacuous (the tool / harness / measurement
 *       IS the oracle, or there is no source behavior to plant a bug in).
 *
 * Three findings, one per way the partition can break:
 *   - DANGLING     — declares a control whose path does NOT exist (a broken safety
 *                    claim: the check asserts a proof file that is gone).
 *   - UNCLASSIFIED — a blocking check that neither declares an existing control nor
 *                    is exempt (a partition HOLE — the criterion silently unmet).
 *   - CONFLICT     — a blocking check that is BOTH (declares a control AND is exempt),
 *                    breaking disjointness (the classification is ambiguous).
 *
 * Before this gate the scope was only "a DECLARED control must EXIST", which left
 * every no-control blocking check un-judged — the criterion was unenforced. Now
 * nothing falls through: a new blocking check with no control and no exemption REDS.
 *
 * LEAN BY CONSTRUCTION — a {@link FactGate}: it does NOT read the filesystem. A HOST
 * folds each blocking check's declared path + on-disk existence + its
 * `NEGATIVE_CONTROL_EXEMPT` membership into the injected
 * {@link CheckGovernanceFacts.negativeControls}; this gate only decides. Earns
 * blocking authority via red/green/mutation fixtures; absent facts fold an empty verdict.
 *
 * @module
 */

import { defineFactGate, type FactBundle, type FactGate, type Gate, type GateContext } from '../gate.js';
import { finding, type Finding } from '../finding.js';
import { memoryContext } from '../engine.js';
import type { CheckGovernanceFacts, NegativeControlFact } from '../facts/check-governance-facts.js';

/** The gate id — namespaces every {@link Finding} it emits. */
const RULE_ID = 'gauntlet/check-negative-control';

/** Build one dangling-negative-control finding — a declared control whose path is gone. */
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
        `Restore the negativeControl file "${entry.negativeControl ?? ''}" for "${entry.id}", or update the registry entry to a path that exists.`,
      ],
    },
  });
}

/** Build one unclassified finding — a blocking check with no control AND no exemption (a partition hole). */
function unclassifiedFinding(entry: NegativeControlFact): Finding {
  return finding({
    ruleId: RULE_ID,
    severity: 'error',
    level: 'L2',
    title: `Blocking check "${entry.id}" has neither a negative control nor an exemption`,
    detail: `The blocking check "${entry.id}" declares no negativeControl and is not a key of NEGATIVE_CONTROL_EXEMPT. Every blocking check must be classified: either declare a real negative control (a fixture/test that plants a regression it catches) or record a reasoned exemption. An unclassified check is a hole — the "every blocking check has a negative control" criterion is silently unmet for it.`,
    location: { file: 'packages/command/src/checks/registry.ts', line: 1 },
    remediation: {
      kind: 'instruction',
      description: 'Classify the blocking check: declare a negativeControl OR add a NEGATIVE_CONTROL_EXEMPT entry.',
      steps: [
        `Add a negativeControl path to "${entry.id}" pointing at a real red-fixture / regression test that it catches, OR add "${entry.id}" to NEGATIVE_CONTROL_EXEMPT with a one-line rationale.`,
      ],
    },
  });
}

/** Build one conflict finding — a blocking check that BOTH declares a control AND is exempt (breaks disjointness). */
function conflictFinding(entry: NegativeControlFact): Finding {
  return finding({
    ruleId: RULE_ID,
    severity: 'error',
    level: 'L2',
    title: `Blocking check "${entry.id}" is BOTH exempt and declares a negative control`,
    detail: `The blocking check "${entry.id}" declares negativeControl "${entry.negativeControl ?? ''}" AND is a key of NEGATIVE_CONTROL_EXEMPT. The partition must be DISJOINT — a check is classified exactly once. A check that has a real negative control is not exempt; a check that is exempt does not declare one.`,
    location: { file: 'packages/command/src/checks/negative-control-exempt.ts', line: 1 },
    remediation: {
      kind: 'instruction',
      description: 'Resolve the ambiguity: keep the negativeControl OR the exemption, not both.',
      steps: [
        `Remove "${entry.id}" from NEGATIVE_CONTROL_EXEMPT (it has a real control), or drop its negativeControl (it is genuinely exempt).`,
      ],
    },
  });
}

/**
 * THE DECISION — data in, findings out, NO context. Over the BLOCKING checks it
 * enforces the total, disjoint negative-control partition: one finding per way a
 * blocking check breaks it (dangling / unclassified / conflict). Advisory checks
 * emit nothing.
 */
export function decideCheckNegativeControl(facts: FactBundle): readonly Finding[] {
  const pack: CheckGovernanceFacts | undefined = facts.checkGovernance;
  if (pack === undefined) return [];
  const findings: Finding[] = [];
  for (const entry of pack.negativeControls) {
    if (!entry.blocking) continue;
    const declares = entry.negativeControl !== null;
    if (declares && !entry.exists) findings.push(danglingFinding(entry));
    if (declares && entry.exempt) findings.push(conflictFinding(entry));
    if (!declares && !entry.exempt) findings.push(unclassifiedFinding(entry));
  }
  return findings;
}

// ── Fixtures (synthetic negative-control rows exercising each partition break) ──

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

/**
 * RED — the three partition breaks together: a dangling declared control, an
 * UNCLASSIFIED blocking check (no control, not exempt), and a CONFLICT (both).
 */
const RED_FACTS = governance([
  Object.freeze({
    id: 'check/example-dangling',
    blocking: true,
    negativeControl: 'packages/gauntlet/src/gates/does-not-exist.ts',
    exists: false,
    exempt: false,
    exemptReason: null,
  }),
  Object.freeze({
    id: 'check/example-unclassified',
    blocking: true,
    negativeControl: null,
    exists: false,
    exempt: false,
    exemptReason: null,
  }),
  Object.freeze({
    id: 'check/example-conflict',
    blocking: true,
    negativeControl: 'packages/gauntlet/src/gates/standards-integrity.ts',
    exists: true,
    exempt: true,
    exemptReason: 'TOOL-ORACLE: (a synthetic conflict — both classified)',
  }),
]);

/**
 * GREEN — a fully-classified partition: a blocking check with an existing control,
 * a blocking check that is exempt-with-reason, and an advisory check (never judged).
 */
const GREEN_FACTS = governance([
  Object.freeze({
    id: 'check/example-declared',
    blocking: true,
    negativeControl: 'packages/gauntlet/src/gates/standards-integrity.ts',
    exists: true,
    exempt: false,
    exemptReason: null,
  }),
  Object.freeze({
    id: 'check/example-exempt',
    blocking: true,
    negativeControl: null,
    exists: false,
    exempt: true,
    exemptReason: 'TOOL-ORACLE: the tool reds on any violating input by construction.',
  }),
  Object.freeze({
    id: 'check/example-advisory',
    blocking: false,
    negativeControl: null,
    exists: false,
    exempt: false,
    exemptReason: null,
  }),
]);

/**
 * The check-negative-control gate — the negative-control PARTITION backstop. Self-proves
 * via synthetic rows (each partition break red, a fully-classified green); a host injects
 * each blocking check's declared path + on-disk existence + exemption membership.
 */
export const checkNegativeControlGate: FactGate = defineFactGate({
  id: RULE_ID,
  level: 'L2',
  describe:
    'FactGate: declares it consumes CheckGovernanceFacts and enforces the total, disjoint negative-control partition over the blocking checks — every blocking check EITHER declares a negativeControl that EXISTS or is a documented exemption; a dangling, unclassified, or double-classified check reds.',
  requires: ['checkGovernance'],
  decide: (facts) => decideCheckNegativeControl(facts),
  fixtures: {
    red: {
      name: 'a dangling declared control, an unclassified blocking check, and a both-classified conflict',
      context: factContext(RED_FACTS),
    },
    green: {
      name: 'a fully-classified partition (an existing control, a reasoned exemption, an advisory check)',
      context: factContext(GREEN_FACTS),
    },
    mutation: {
      describe:
        'A mutant that IGNORES the facts (returns no findings) reports NO partition break on the red fixture — the dangling / unclassified / conflict checks are no longer flagged and the mutant is killed.',
      mutate: (gate: Gate): Gate => {
        const blind = (): readonly Finding[] => [];
        return { ...gate, decide: blind, run: (): readonly Finding[] => blind() };
      },
    },
  },
});
