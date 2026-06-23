/**
 * Gate: standards-integrity — the AGENT-SAFETY META-GAUNTLET (the "raccoon rule"),
 * phase A: the UNCONDITIONAL COMMIT BACKSTOP that guards the gauntlet's OWN rigor
 * standards from silent erosion.
 *
 * "The repairman may be a raccoon with commit access." This gate is the meta-level
 * analogue of the api-surface snapshot gate (`tests/unit/meta/api-surface.*`): a
 * content-addressed SNAPSHOT of the gauntlet's STANDARDS SURFACE (the gate set,
 * each gate's self-proving fixtures, the assurance map, the waivers, the invariants
 * ledger, the numeric floors), diffed on change → each change classified STRENGTHEN
 * (OK) vs WEAKEN (blocking unless owner-signed). It checks COMMITTED REALITY (not
 * anyone's declaration), so it catches a weakening regardless of who/how it landed.
 *
 * It folds the host-supplied {@link StandardsIntegrityFacts} (the
 * `packages/cli/src/lib/standards-surface.ts` extractor has ALREADY diffed the live
 * surface vs the committed snapshot, classified every change, and applied the owner
 * sign-offs against the injected wall-clock date) into Findings:
 *
 *  - UNSIGNED WEAKENING → the raccoon caught: a BLOCKING `error` (L4).
 *  - FORBIDDEN sign-off → a sign-off that tried to authorize an always-blocking
 *    weakening (the placeholder/skip floor) is VOID → a BLOCKING `error` (and the
 *    weakening it tried to cover stays unsigned).
 *  - EXPIRED sign-off → the deferral came due → a BLOCKING `error`.
 *  - SIGNED weakening → allowed + RECORDED as an audit `advisory` (the honest escape).
 *  - UN-REGENERATED STRENGTHEN / NEUTRAL drift → a `warning` ("regenerate the
 *    snapshot intentionally"), NOT blocking-as-weakening (a stale-but-safe snapshot).
 *
 * LEAN BY CONSTRUCTION (ADR-0012): the gate reads NO config off disk, content-
 * addresses NOTHING (the fnv1a kernel lives in `@czap/core`), and reads NO clock.
 * The HOST extractor does all of that and injects the decided facts via
 * {@link GateContext.standards}; this gate only FOLDS. REPORT-not-DECIDE.
 *
 * It is ALWAYS-ON (the standards backstop must run every time the host runs the
 * `--ir` path), the same wiring as `traceabilityBridgeGate`. It ships red / green /
 * mutation fixtures, so it self-proves against the authority ratchet.
 *
 * @module
 */

import { defineGate, type GateContext, type Gate } from '../gate.js';
import { injectedFactEvidenceDigest } from '../verdict-cache.js';
import { finding, type Finding } from '../finding.js';
import { memoryContext } from '../engine.js';
import type { StandardsIntegrityFacts, StandardsChange } from '../standards-facts.js';

const RULE_NS = 'gauntlet/standards-integrity';

/** Project an UNSIGNED weakening into a BLOCKING L4 Finding (the raccoon caught). */
function unsignedFinding(change: StandardsChange): Finding {
  return finding({
    ruleId: `${RULE_NS}/weakened`,
    severity: 'error',
    level: 'L4',
    title: `Standards WEAKENED without sign-off: ${change.elementKey}`,
    detail: `${change.detail} The committed standards snapshot was SILENTLY WEAKENED (class "${change.weakening ?? 'unknown'}"). This is the raccoon rule: an edit must not weaken the gauntlet's own rigor standards. A weakening is permitted ONLY via an explicit, owner-signed standards-waiver naming this exact element + class + an expiry. Until then it BLOCKS — regardless of who or how it landed.`,
    location: { file: 'traceability/standards-snapshot.json' },
    remediation: {
      kind: 'instruction',
      description: `Reverse the weakening, or sign it off explicitly.`,
      steps: [
        `If this weakening is UNINTENDED (a raccoon edit, an accidental gate drop / level demotion / floor relaxation), REVERT it — the standards must not erode silently.`,
        `If it is GENUINELY intended, add an owner-signed standards-waiver to traceability/standards-waivers.json: { elementKey: "${change.elementKey}", weakening: "${change.weakening ?? ''}", owner, justification, expiry } — then regenerate the snapshot (CZAP_UPDATE_STANDARDS_SNAPSHOT=1).`,
        `NEVER widen the snapshot to launder a weakening without the matching sign-off (that is the laundering the backstop exists to catch).`,
      ],
    },
  });
}

/** Project a FORBIDDEN sign-off (tried to authorize an always-blocking weakening) into a BLOCKING Finding. */
function forbiddenFinding(entry: {
  readonly elementKey: string;
  readonly owner: string;
  readonly detail: string;
}): Finding {
  return finding({
    ruleId: `${RULE_NS}/signoff-forbidden`,
    severity: 'error',
    level: 'L4',
    title: `Forbidden standards sign-off (void): ${entry.elementKey}`,
    detail: `${entry.detail} An always-blocking rule (the placeholder/skip family) can NEVER be weakened-in — the sign-off is VOID and the weakening it tried to cover is still blocking. You cannot sign away a lie.`,
    location: { file: 'traceability/standards-waivers.json' },
    remediation: {
      kind: 'instruction',
      description: `Delete the forbidden sign-off and restore the always-blocking floor.`,
      steps: [
        `Remove the standards-waiver targeting "${entry.elementKey}" (owner: ${entry.owner}) — it cannot exist.`,
        `Restore the always-blocking rule / floor it tried to weaken: the never-waivable floor must hold.`,
      ],
    },
  });
}

/** Project an EXPIRED sign-off into a BLOCKING Finding (the deferral came due). */
function expiredFinding(entry: {
  readonly elementKey: string;
  readonly owner: string;
  readonly expiry: string;
}): Finding {
  return finding({
    ruleId: `${RULE_NS}/signoff-expired`,
    severity: 'error',
    level: 'L4',
    title: `Expired standards sign-off: ${entry.elementKey}`,
    detail: `The standards-waiver by ${entry.owner} authorizing the weakening of ${entry.elementKey} expired ${entry.expiry}. The deferral came due: the weakening is now unsigned again and BLOCKS. Either reverse the weakening (restore the standard) or renew the sign-off with a fresh owner-signed expiry.`,
    location: { file: 'traceability/standards-waivers.json' },
    remediation: {
      kind: 'instruction',
      description: `Resolve or renew the expired standards sign-off for ${entry.elementKey}.`,
      steps: [
        `Reverse the weakening (restore the standard) — preferred.`,
        `Or renew the sign-off: bump its "expiry" past today, re-confirm the owner (${entry.owner}) + justification.`,
      ],
    },
  });
}

/** Project a SIGNED weakening into an audit `advisory` (allowed + recorded — the honest escape). */
function signedFinding(change: StandardsChange & { readonly owner: string; readonly justification: string }): Finding {
  return finding({
    ruleId: `${RULE_NS}/weakened-signed`,
    severity: 'advisory',
    level: 'L4',
    title: `Signed standards weakening (recorded): ${change.elementKey}`,
    detail: `${change.detail} This weakening is owner-signed by ${change.owner}: "${change.justification}". It is ALLOWED and RECORDED here (the only honest escape — a weakening with teeth). The advisory keeps it visible in every run so the sign-off cannot rot unnoticed.`,
    location: { file: 'traceability/standards-waivers.json' },
  });
}

/** Project un-regenerated STRENGTHEN / NEUTRAL drift into a `warning` ("regenerate intentionally"). */
function strengthenFinding(change: StandardsChange): Finding {
  return finding({
    ruleId: `${RULE_NS}/snapshot-stale`,
    severity: 'warning',
    level: 'L4',
    title: `Standards snapshot is stale (un-regenerated strengthen): ${change.elementKey}`,
    detail: `${change.detail} The live standards surface STRENGTHENED but the committed snapshot was not regenerated. This is SAFE (the standards grew, not shrank) but the snapshot must be kept current so the backstop diffs against truth. Regenerate it intentionally (CZAP_UPDATE_STANDARDS_SNAPSHOT=1) and review the diff.`,
    location: { file: 'traceability/standards-snapshot.json' },
    remediation: {
      kind: 'instruction',
      description: `Regenerate the committed standards snapshot.`,
      steps: [
        `Run CZAP_UPDATE_STANDARDS_SNAPSHOT=1 <the standards-integrity meta-check> and commit the updated traceability/standards-snapshot.json.`,
      ],
    },
  });
}

/** The fold: project the injected standards-integrity facts into Findings. */
function fold(context: GateContext): readonly Finding[] {
  const facts: StandardsIntegrityFacts | undefined = context.standards;
  // ABSENT facts ⇒ the host did not run the extractor (the gate is composed onto the
  // set ONLY when the host injects facts), so an empty fold is the honest no-op — not
  // a silent green over a present-but-undiffed standards surface.
  if (facts === undefined) return [];

  const findings: Finding[] = [];
  for (const change of facts.unsignedWeakenings) findings.push(unsignedFinding(change));
  for (const entry of facts.forbiddenSignoffs) findings.push(forbiddenFinding(entry));
  for (const entry of facts.expiredSignoffs) findings.push(expiredFinding(entry));
  for (const change of facts.signedWeakenings) findings.push(signedFinding(change));
  for (const change of facts.unregeneratedStrengthens) findings.push(strengthenFinding(change));
  return findings;
}

/** A GateContext carrying a literal StandardsIntegrityFacts record (fixture helper). */
function factsContext(facts: StandardsIntegrityFacts): GateContext {
  return { ...memoryContext({}), standards: facts };
}

/** A clean surface — no weakening, no stale strengthen (the green floor). */
const CLEAN_FACTS: StandardsIntegrityFacts = {
  unsignedWeakenings: [],
  signedWeakenings: [],
  unregeneratedStrengthens: [],
  forbiddenSignoffs: [],
  expiredSignoffs: [],
  committedAddress: 'fnv1a:clean000',
  liveAddress: 'fnv1a:clean000',
};

/**
 * A surface with one UNSIGNED weakening, one FORBIDDEN sign-off, and one EXPIRED
 * sign-off — the red. Each blocking fold path fires, so the gate must flag ≥1.
 */
const DIRTY_FACTS: StandardsIntegrityFacts = {
  unsignedWeakenings: [
    {
      elementKey: 'gate::LITESHIP_IR_GATES::gauntlet/crdt-laws-pinned',
      changeClass: 'weaken',
      weakening: 'gate-removed',
      detail: 'gate gauntlet/crdt-laws-pinned REMOVED from set LITESHIP_IR_GATES — a self-proving gate dropped.',
    },
  ],
  signedWeakenings: [],
  unregeneratedStrengthens: [],
  forbiddenSignoffs: [
    {
      elementKey: 'always-blocking::gauntlet/no-placeholder',
      owner: 'fixture-raccoon',
      detail: 'sign-off tried to authorize removing the always-blocking rule gauntlet/no-placeholder.',
    },
  ],
  expiredSignoffs: [
    {
      elementKey: 'floor::mutation-score::packages/canonical/src/fnv.ts',
      owner: 'fixture-owner',
      expiry: '2000-01-01',
    },
  ],
  committedAddress: 'fnv1a:committed0',
  liveAddress: 'fnv1a:weakened0',
};

/** The qualified gate — fixtures included, so it self-proves via the ratchet. */
export const standardsIntegrityGate: Gate = defineGate({
  id: RULE_NS,
  level: 'L4',
  describe:
    'Avionics-tier UNCONDITIONAL COMMIT BACKSTOP (the raccoon rule): folds the host-diffed standards surface vs its committed content-addressed snapshot — an UNSIGNED weakening (removed gate, reduced fixtures, lowered floor/level, new/extended waiver, removed/lowered invariant) is a BLOCKING Finding; a forbidden or expired sign-off blocks; a signed weakening is allowed + recorded; a stale strengthen is a regenerate warning.',
  run: fold,
  // OUT-OF-IR evidence: the injected StandardsIntegrityFacts are derived from EXTERNAL
  // artifacts (the LIVE standards surface + the committed content-addressed snapshot +
  // the owner sign-offs + the injected date) — the snapshot is NOT in the IR. Editing the
  // snapshot or a sign-off WITHOUT touching package source must refold. Fold the fact
  // content so the cache refolds on any standards-diff change (the soundness keystone).
  evidenceDigest: (context: GateContext): string | undefined =>
    injectedFactEvidenceDigest('standards', context.standards),
  fixtures: {
    red: {
      name: 'a surface with an unsigned weakening, a forbidden sign-off, and an expired sign-off',
      context: factsContext(DIRTY_FACTS),
    },
    green: {
      name: 'a surface that matches its committed snapshot (no weakening, no stale strengthen)',
      context: factsContext(CLEAN_FACTS),
    },
    mutation: {
      describe:
        "A gate that ignores the unsigned weakenings (folds only the benign strengthens) leaves the red fixture's unsigned weakening + forbidden + expired sign-offs unflagged — the mutant must then fail the red.",
      mutate: (gate: Gate): Gate => ({
        ...gate,
        // Mutant: fold ONLY the (benign) un-regenerated strengthens — the toothless
        // variant that lets a weakening through. The red fixture (an unsigned
        // weakening + a forbidden + an expired sign-off, but ZERO strengthens) then
        // yields zero findings → red not caught → the ratchet kills it.
        run: (context: GateContext): readonly Finding[] => {
          const facts = context.standards;
          if (facts === undefined) return [];
          return facts.unregeneratedStrengthens.map(strengthenFinding);
        },
      }),
    },
  },
});
