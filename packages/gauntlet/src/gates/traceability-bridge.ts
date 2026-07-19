/**
 * Gate: traceability-bridge — the avionics-tier (L4) fold over the host-supplied
 * {@link TraceabilityFacts} (the requirements-traceability ledger, DO-178B-style).
 *
 * Every system INVARIANT (a LAW — determinism / CRDT convergence / content-address
 * identity / assurance propagation / hermeticity) must be TRACED to a proving test
 * or covered by a waiver-with-teeth. A LAW with no proof is a hole in the safety
 * case. This gate is how that bidirectional trace is PINNED into the assurance
 * ratchet: it folds the host's already-decided lifecycle states into Findings —
 *
 *  - UNTRACED: an invariant declared in `traceability/invariants.yaml` with no
 *    proving test AND no waiver → a Finding at the invariant's level (an L3/L4
 *    untraced invariant is an `error` that BLOCKS; below L3 it is a `warning`).
 *  - EXPIRED WAIVER: an invariant a waiver covered, whose owner-signed expiry is past
 *    the injected wall-clock date (the two-clock law: a CALENDAR comparison, never
 *    `systemClock`) → a Finding (the debt came due, the suppression lost its teeth).
 *  - DIVERGENCE: the two halves of the trace disagree — a test `PROVES` an INV absent
 *    from the ledger (`undeclared-proof`), a ledger entry claims a test whose header
 *    does not name the invariant (`unbacked-claim`), or a claimed test does not exist
 *    (`missing-test`) → a Finding (the ledger and the LIVE test headers must agree —
 *    the head-probe LAW).
 *
 * LEAN BY CONSTRUCTION (ADR-0012): the gate parses NO YAML, scans NO corpus, and
 * reads NO clock. The HOST (the CLI's `packages/cli/src/lib/traceability.ts` state
 * machine) computes the facts and injects them via {@link GateContext.traceability};
 * this gate only FOLDS. REPORT-not-DECIDE: the host's state machine decides each
 * invariant's resolved state; the gate reports it at the right level.
 *
 * It ships red / green / mutation fixtures, so it self-proves against the authority
 * ratchet.
 *
 * @module
 */

import { defineGate, type GateContext, type Gate } from '../gate.js';
import { factAccessEvidenceDigest } from '../verdict-cache.js';
import { finding, type Finding } from '../finding.js';
import { rankOf, type AssuranceLevel } from '../assurance.js';
import { memoryContext } from '../engine.js';
import type { TraceabilityFacts, ResolvedInvariant, TraceabilityDivergence } from '../facts/traceability-facts.js';

const RULE_NS = 'gauntlet/traceability';

/**
 * The severity of an untraced/expired invariant by its level: an L3/L4 invariant
 * (the trust tier — "if this lies, downstream trusts bad reality") HARD-FAILS as an
 * `error`; an L0–L2 invariant is a tracked `warning` (surfaced, not blocking). A
 * level-keyed matrix, not a code branch, so the policy is one redlinable place.
 */
function severityForLevel(level: AssuranceLevel): 'error' | 'warning' {
  return rankOf(level) >= rankOf('L3') ? 'error' : 'warning';
}

/** Project an UNTRACED invariant into a Finding at its level. */
function untracedFinding(inv: ResolvedInvariant, reason: string): Finding {
  return finding({
    ruleId: `${RULE_NS}/untraced`,
    severity: severityForLevel(inv.level),
    level: inv.level,
    title: `Untraced invariant: ${inv.id}`,
    detail: `${inv.id} (${inv.law}) is DECLARED in traceability/invariants.yaml but has no proving test and no waiver covering it. ${reason} An untraced ${inv.level} invariant is a hole in the safety case — a LAW the system claims to uphold with nothing proving it.`,
    location: { file: 'traceability/invariants.yaml' },
    remediation: {
      kind: 'instruction',
      description: `Trace ${inv.id} to a real proving test, or sign an owner waiver.`,
      steps: [
        `Add a deterministic test that PROVES the law: "${inv.law}".`,
        `Add a \`// PROVES: ${inv.id}\` header near the top of that test (the head-probe trace).`,
        `Map ${inv.id} → [its file::test-name] under \`traces:\` in traceability/testing-ledger.yaml.`,
        `OR, if the proof is genuinely deferred, add an owner-signed waiver { owner, justification, expiry } — NEVER fake a PROVES header to clear it (that is laundering).`,
      ],
    },
  });
}

/** Project an EXPIRED-waiver invariant into a Finding at its level. */
function expiredFinding(inv: ResolvedInvariant): Finding {
  const w = inv.state._tag === 'expired' ? inv.state : undefined;
  const owner = w?.owner ?? 'unknown';
  const expiry = w?.expiry ?? 'unknown';
  return finding({
    ruleId: `${RULE_NS}/waiver-expired`,
    severity: severityForLevel(inv.level),
    level: inv.level,
    title: `Expired traceability waiver: ${inv.id}`,
    detail: `The waiver by ${owner} covering the untraced invariant ${inv.id} (${inv.law}) expired ${expiry}. The deferral came due: the invariant is now untraced again. Pay the debt (add a real proving test) or renew the waiver with a fresh owner-signed expiry — a placeholder is never shippable, never waivable.`,
    location: { file: 'traceability/testing-ledger.yaml' },
    remediation: {
      kind: 'instruction',
      description: `Resolve or renew the expired waiver for ${inv.id}.`,
      steps: [
        `Add a deterministic proving test + a \`// PROVES: ${inv.id}\` header (preferred — pay the debt down).`,
        `Map ${inv.id} → its test ref under \`traces:\` and DELETE the waiver.`,
        `Or renew: bump the waiver's "expiry" past today and re-confirm the owner (${owner}) + justification.`,
      ],
    },
  });
}

/** Project a ledger⇔header DIVERGENCE into a Finding at L4 (a trust-spine break). */
function divergenceFinding(d: TraceabilityDivergence): Finding {
  return finding({
    ruleId: `${RULE_NS}/divergence/${d.kind}`,
    severity: 'error',
    level: 'L4',
    title: `Traceability divergence (${d.kind}): ${d.invariantId}`,
    detail: `${d.detail} The ledger (traceability/*.yaml) and the LIVE test \`// PROVES:\` headers must agree — the trace is computed from the headers, never hardcoded. A divergence means a hardcoded claim drifted from the real corpus (the head-probe LAW).`,
    location: { file: d.subject },
    remediation: {
      kind: 'instruction',
      description: `Reconcile the ledger with the live PROVES headers for ${d.invariantId}.`,
      steps: [
        d.kind === 'undeclared-proof'
          ? `A test PROVES "${d.invariantId}" but it is not declared in traceability/invariants.yaml — either declare it (with its level + category) or fix the typo in the PROVES header.`
          : d.kind === 'missing-test'
            ? `The ledger claims "${d.subject}" proves ${d.invariantId}, but that test does not exist in the corpus — fix the ref or restore the test.`
            : `The ledger claims "${d.subject}" proves ${d.invariantId}, but that test's header does not name ${d.invariantId} — add the PROVES header or fix the claim.`,
      ],
    },
  });
}

/** The fold: project the injected traceability facts into Findings. */
function fold(context: GateContext): readonly Finding[] {
  const facts: TraceabilityFacts | undefined = context.traceability;
  // ABSENT facts ⇒ the gate is simply not exercised (the host did not run the ledger
  // state machine). The gate is composed onto the set ONLY when the host injects
  // facts, so an empty fold here is the honest no-op, not a silent green over a
  // present-but-unparsed ledger.
  if (facts === undefined) return [];

  const findings: Finding[] = [];
  for (const inv of facts.invariants) {
    switch (inv.state._tag) {
      case 'proven':
      case 'waived':
        // PROVEN (a real proving test exists + the header matches) or WAIVED (a
        // non-expired owner-signed deferral) — no finding. The happy / sanctioned path.
        break;
      case 'untraced':
        findings.push(untracedFinding(inv, inv.state.reason));
        break;
      case 'expired':
        findings.push(expiredFinding(inv));
        break;
    }
  }
  for (const d of facts.divergences) findings.push(divergenceFinding(d));
  return findings;
}

/** A GateContext carrying a literal TraceabilityFacts record (fixture helper). */
function factsContext(facts: TraceabilityFacts): GateContext {
  return { ...memoryContext({}), traceability: facts };
}

/** A fully-traceable ledger — every L4 invariant PROVEN, no divergence (the green floor). */
const CLEAN_FACTS: TraceabilityFacts = {
  invariants: [
    {
      id: 'INV-FIXTURE-PROVEN',
      law: 'a fixture law proven by a fixture test',
      level: 'L4',
      category: 'crdt',
      state: { _tag: 'proven', provingTests: ['tests/fixture.test.ts::proves it'] },
    },
    {
      id: 'INV-FIXTURE-WAIVED',
      law: 'a fixture law deferred under a live waiver',
      level: 'L4',
      category: 'crdt',
      state: {
        _tag: 'waived',
        owner: 'fixture-owner',
        justification: 'a fixture deferral with a future expiry',
        expiry: '2999-01-01',
      },
    },
  ],
  divergences: [],
  ledgerAddress: 'fnv1a:clean000',
};

/**
 * A ledger with one UNTRACED L4 invariant, one EXPIRED waiver, and one DIVERGENCE —
 * the red. Each of the three fold paths fires, so the gate must flag ≥1.
 */
const DIRTY_FACTS: TraceabilityFacts = {
  invariants: [
    {
      id: 'INV-FIXTURE-UNTRACED',
      law: 'a fixture law with no proof and no waiver',
      level: 'L4',
      category: 'determinism',
      state: { _tag: 'untraced', reason: 'no proving test was found and no waiver covers it.' },
    },
    {
      id: 'INV-FIXTURE-EXPIRED',
      law: 'a fixture law whose waiver came due',
      level: 'L4',
      category: 'determinism',
      state: {
        _tag: 'expired',
        owner: 'fixture-owner',
        justification: 'a fixture deferral whose expiry is in the past',
        expiry: '2000-01-01',
      },
    },
  ],
  divergences: [
    {
      kind: 'undeclared-proof',
      invariantId: 'INV-FIXTURE-GHOST',
      detail: 'a fixture test PROVES INV-FIXTURE-GHOST, which is not declared in the ledger.',
      subject: 'tests/fixture.test.ts',
    },
  ],
  ledgerAddress: 'fnv1a:dirty000',
};

/** The qualified gate — fixtures included, so it self-proves via the ratchet. */
export const traceabilityBridgeGate: Gate = defineGate({
  id: RULE_NS,
  level: 'L4',
  describe:
    "Avionics-tier fold over the host-supplied requirements-traceability facts: every system INVARIANT (a LAW) is traced to a proving test or a waiver-with-teeth; an untraced invariant, an expired waiver, or a ledger⇔header divergence is a self-explaining Finding at the invariant's level (the bidirectional-trace / test-honesty rail).",
  run: fold,
  // OUT-OF-IR evidence: the injected TraceabilityFacts are derived from EXTERNAL
  // artifacts (the `traceability/*.yaml` ledger + the test-corpus `// PROVES:` headers +
  // the injected date) — NONE in the IR. Editing the ledger or a confirmer header WITHOUT
  // touching package source must refold. Fold the fact content (the soundness keystone).
  evidenceDigest: (context: GateContext): string | undefined =>
    factAccessEvidenceDigest('traceability', context.traceability),
  fixtures: {
    red: {
      name: 'a ledger with an untraced L4 invariant, an expired waiver, and a ledger⇔header divergence',
      context: factsContext(DIRTY_FACTS),
    },
    green: {
      name: 'a fully-traceable ledger (every L4 invariant proven or live-waived, zero divergence)',
      context: factsContext(CLEAN_FACTS),
    },
    mutation: {
      describe:
        "A gate that treats every resolved state as fine (folds nothing) leaves the red fixture's untraced invariant + expired waiver + divergence unflagged — the mutant must then fail the red.",
      mutate: (gate: Gate): Gate => ({
        ...gate,
        // Mutant: ignore the resolved states entirely (a toothless fold). The red
        // fixture then yields zero findings → red not caught → the ratchet kills it.
        run: (): readonly Finding[] => [],
      }),
    },
  },
});
