/**
 * Gate: check-waiver-freshness — the two-store waiver-expiry meta-gate.
 *
 * A waiver is a time-boxed, owner-signed suppression; the moment its `expires` date
 * passes, the debt comes due and the suppression must NOT silently keep holding. Two
 * stores carry waivers with an expiry: the gauntlet's own `waivers.ts` registry
 * ({@link LITESHIP_WAIVERS}) and the traceability ledger (`testing-ledger.yaml`'s
 * `waiver: { owner, justification, expiry }` deferrals). This gate extends the ONE
 * expiry rule across BOTH stores: any expired waiver, in either store, is a finding.
 *
 * DETERMINISM (the TWO-CLOCK LAW): the gate never reads a clock. Expiry is a CALENDAR
 * comparison the HOST decides against an injected wall-clock date, folding the decided
 * `expired` verdict into {@link CheckGovernanceFacts.waivers} — so the gate is a pure
 * data fold, exactly like the traceability-bridge gate's expired-waiver path. LEAN BY
 * CONSTRUCTION — a {@link FactGate}: no `yaml`, no fs, no clock. Earns blocking authority
 * via red/green/mutation fixtures; absent facts fold an empty verdict.
 *
 * @module
 */

import { defineFactGate, type FactBundle, type FactGate, type Gate, type GateContext } from '../gate.js';
import { finding, type Finding } from '../finding.js';
import { memoryContext } from '../engine.js';
import type { CheckGovernanceFacts, WaiverFreshnessFact } from '../facts/check-governance-facts.js';

/** The gate id — namespaces every {@link Finding} it emits. */
const RULE_ID = 'gauntlet/check-waiver-freshness';

/** Human label for a waiver store. */
function storeLabel(store: WaiverFreshnessFact['store']): string {
  return store === 'gauntlet'
    ? 'the gauntlet waivers registry (waivers.ts)'
    : 'the traceability ledger (testing-ledger.yaml)';
}

/** Build one expired-waiver finding. */
function expiredFinding(entry: WaiverFreshnessFact): Finding {
  return finding({
    ruleId: RULE_ID,
    severity: 'error',
    level: 'L2',
    title: `Expired waiver in ${storeLabel(entry.store)}: ${entry.id}`,
    detail: `The waiver "${entry.id}" in ${storeLabel(entry.store)} expired ${entry.expires} — the debt came due. An expired waiver no longer holds: the finding (or the untraced obligation) it covered is live again. Fix the underlying issue or renew the waiver with a fresh owner-signed expiry.`,
    location: {
      file: entry.store === 'gauntlet' ? 'packages/gauntlet/src/waivers.ts' : 'traceability/testing-ledger.yaml',
      line: 1,
    },
    remediation: {
      kind: 'instruction',
      description: 'An expired waiver blocks — resolve or renew it.',
      steps: [
        `Fix the underlying issue "${entry.id}" covered (preferred — pay the debt down).`,
        `Or renew the waiver: bump its expiry past today, re-confirming the owner + reason.`,
      ],
    },
  });
}

/**
 * THE DECISION — data in, findings out, NO context. One finding per EXPIRED waiver,
 * across both the gauntlet registry and the traceability ledger. Fresh waivers emit nothing.
 */
export function decideCheckWaiverFreshness(facts: FactBundle): readonly Finding[] {
  const pack: CheckGovernanceFacts | undefined = facts.checkGovernance;
  if (pack === undefined) return [];
  const findings: Finding[] = [];
  for (const entry of pack.waivers) {
    if (entry.expired) findings.push(expiredFinding(entry));
  }
  return findings;
}

// ── Fixtures (synthetic waiver rows — a fresh green, an expired red) ─────────────

function factContext(facts: CheckGovernanceFacts): GateContext {
  return { ...memoryContext({}), checkGovernance: facts };
}

/** A well-formed facts pack carrying only the given waiver rows. */
function governance(waivers: readonly WaiverFreshnessFact[]): CheckGovernanceFacts {
  return Object.freeze({
    partition: Object.freeze({
      scripts: Object.freeze([]),
      registered: Object.freeze([]),
      exempted: Object.freeze([]),
    }),
    negativeControls: Object.freeze([]),
    waivers: Object.freeze([...waivers]),
  });
}

/** RED — an expired ledger waiver (the debt came due). */
const RED_FACTS = governance([
  Object.freeze({ store: 'ledger', id: 'INV-EXAMPLE', expires: '2020-01-01', expired: true }),
]);

/** GREEN — fresh waivers in both stores (neither expired). */
const GREEN_FACTS = governance([
  Object.freeze({ store: 'gauntlet', id: 'gauntlet/no-nondeterminism@a.ts:1', expires: '2099-01-01', expired: false }),
  Object.freeze({ store: 'ledger', id: 'INV-EXAMPLE', expires: '2099-01-01', expired: false }),
]);

/**
 * The check-waiver-freshness gate — the two-store expiry backstop. Self-proves via
 * synthetic rows; a host decides each waiver's expiry against an injected wall-clock date.
 */
export const checkWaiverFreshnessGate: FactGate = defineFactGate({
  id: RULE_ID,
  level: 'L2',
  describe:
    'FactGate: declares it consumes CheckGovernanceFacts and reports every EXPIRED waiver across BOTH stores — the gauntlet waivers.ts registry and the traceability ledger (testing-ledger.yaml). The host decides expiry against an injected wall-clock date (the TWO-CLOCK LAW).',
  requires: ['checkGovernance'],
  decide: (facts) => decideCheckWaiverFreshness(facts),
  fixtures: {
    red: {
      name: 'an expired ledger waiver',
      context: factContext(RED_FACTS),
    },
    green: {
      name: 'fresh waivers in both stores (neither expired)',
      context: factContext(GREEN_FACTS),
    },
    mutation: {
      describe:
        'A mutant that IGNORES the facts (returns no findings) reports NO expired waiver on the red fixture — the due debt is no longer flagged and the mutant is killed.',
      mutate: (gate: Gate): Gate => {
        const blind = (): readonly Finding[] => [];
        return { ...gate, decide: blind, run: (): readonly Finding[] => blind() };
      },
    },
  },
});
