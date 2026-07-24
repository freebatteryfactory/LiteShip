/**
 * Gate: check-negative-control — blocking-authority falsification completeness.
 *
 * Every blocking check must declare an on-disk negative control: a deterministic
 * red fixture/test that executes the authority and proves it can fail. There is
 * deliberately no exemption path. A missing or dangling control is a blocking
 * governance finding; advisory checks are outside this theorem.
 *
 * LEAN BY CONSTRUCTION — a host folds declared paths + filesystem existence into
 * {@link CheckGovernanceFacts}; this FactGate only decides.
 *
 * @module
 */

import { defineFactGate, type FactBundle, type FactGate, type Gate, type GateContext } from '../gate.js';
import { finding, type Finding } from '../finding.js';
import { memoryContext } from '../engine.js';
import type { CheckGovernanceFacts, NegativeControlFact } from '../facts/check-governance-facts.js';

const RULE_ID = 'gauntlet/check-negative-control';

function danglingFinding(entry: NegativeControlFact): Finding {
  return finding({
    ruleId: RULE_ID,
    severity: 'error',
    level: 'L2',
    title: `Blocking check "${entry.id}" declares a missing negative control`,
    detail: `The blocking check "${entry.id}" declares negativeControl "${entry.negativeControl ?? '(none)'}", but that path does not exist. A dangling path cannot prove the authority catches a regression.`,
    location: { file: entry.negativeControl ?? 'packages/command/src/checks/registry.ts', line: 1 },
    remediation: {
      kind: 'instruction',
      description: 'A declared negative control must point at an executable red-fixture proof.',
      steps: [
        `Restore "${entry.negativeControl ?? ''}" for "${entry.id}", or point the registry at the real falsifying test.`,
      ],
    },
  });
}

function missingFinding(entry: NegativeControlFact): Finding {
  return finding({
    ruleId: RULE_ID,
    severity: 'error',
    level: 'L2',
    title: `Blocking check "${entry.id}" has no negative control`,
    detail: `The blocking check "${entry.id}" declares no negativeControl. Every blocker must execute a deterministic falsifying fixture that it catches; inability to prove failure is not exemptible.`,
    location: { file: 'packages/command/src/checks/registry.ts', line: 1 },
    remediation: {
      kind: 'instruction',
      description: 'Declare and execute a real falsifying negative control.',
      steps: [`Add a negativeControl path to "${entry.id}" pointing at a red fixture/test the authority catches.`],
    },
  });
}

export function decideCheckNegativeControl(facts: FactBundle): readonly Finding[] {
  const pack: CheckGovernanceFacts | undefined = facts.checkGovernance;
  if (pack === undefined) return [];
  const findings: Finding[] = [];
  for (const entry of pack.negativeControls) {
    if (!entry.blocking) continue;
    if (entry.negativeControl === null) findings.push(missingFinding(entry));
    else if (!entry.exists) findings.push(danglingFinding(entry));
  }
  return findings;
}

function factContext(facts: CheckGovernanceFacts): GateContext {
  return { ...memoryContext({}), checkGovernance: facts };
}

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

const RED_FACTS = governance([
  Object.freeze({
    id: 'check/example-dangling',
    blocking: true,
    negativeControl: 'packages/gauntlet/src/gates/does-not-exist.ts',
    exists: false,
  }),
  Object.freeze({
    id: 'check/example-missing',
    blocking: true,
    negativeControl: null,
    exists: false,
  }),
]);

const GREEN_FACTS = governance([
  Object.freeze({
    id: 'check/example-declared',
    blocking: true,
    negativeControl: 'packages/gauntlet/src/gates/standards-integrity.ts',
    exists: true,
  }),
  Object.freeze({
    id: 'check/example-advisory',
    blocking: false,
    negativeControl: null,
    exists: false,
  }),
]);

export const checkNegativeControlGate: FactGate = defineFactGate({
  id: RULE_ID,
  level: 'L2',
  describe:
    'FactGate: every blocking check declares an existing executable negative-control proof; missing and dangling controls block, with no exemption path.',
  requires: ['checkGovernance'],
  decide: (facts) => decideCheckNegativeControl(facts),
  fixtures: {
    red: {
      name: 'one dangling and one missing blocking negative control',
      context: factContext(RED_FACTS),
    },
    green: {
      name: 'an existing blocking control plus an advisory check',
      context: factContext(GREEN_FACTS),
    },
    mutation: {
      describe: 'A blind mutant ignores missing/dangling controls and is killed by the red fixture.',
      mutate: (gate: Gate): Gate => {
        const blind = (): readonly Finding[] => [];
        return { ...gate, decide: blind, run: (): readonly Finding[] => blind() };
      },
    },
  },
});
