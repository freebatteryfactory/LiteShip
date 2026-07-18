/**
 * The SPINE-RELATION gate (Wave 8.5 — the constitution's STATIC-projection half, the
 * capstone that finally closes Conflict-1 / S5.2 without an authority gap). The lean
 * fold: it FOLDS the host-injected {@link SpineRelationFacts} into self-explaining
 * {@link Finding}s, the same REPORT-not-DECIDE shape the transition / mutation /
 * oracle-divergence gates use.
 *
 * THE BIG IDEA, restated as a gate (constitution Axiom 3, §7.3–7.4). The
 * `_spine/*.d.ts` mirror is a DECLARED PROJECTION of the runtime type surface: a
 * hand-curated public-contract subset (the SOURCE), observed by a relation with a
 * declared fidelity. Each admitted mirror type is classified on TWO orthogonal axes —
 * **Authority** `{spine | runtime | generated}` and **SurfaceRelation** `{exact |
 * public-narrower | public-wider | opaque | brand-reanchored | runtime-exists |
 * intentionally-omitted}` — grounded in ADR-0010 (the spine OWNS branded types; other
 * declarations MIRROR runtime types). The host probes each type's bidirectional
 * assignability and records the OBSERVED relation; this gate flags every observation
 * whose observed relation no longer satisfies its ADMITTED (frozen) relation — the
 * exact drift class the frozen spine-conformance `IsEqual` pins caught by hand
 * (CapSet `Set`→array, `Millis` brand loss, WGSL omission), now caught mechanically
 * over the COMPLETE admitted set so no Codec-class type is ever forgotten again.
 *
 * NO AUTHORITY GAP (the S-conflict discipline). This gate is authored RED against the
 * three historical drift fixtures and must KILL each before the frozen pins are
 * absorbed — only a gate that reproduces the pins' catches earns the right to replace
 * them. It seeds its conformance set from the CURRENT pin pairs (the relocated
 * guarantee — S5.2 / Conflict-1). The pins are never deleted ahead of this green gate.
 *
 * REPORT-not-DECIDE. The gate names the drift, its two axes, and the assignability it
 * observed, and reports it; the human/agent decides whether to fix the mirror or
 * deliberately re-admit the new relation (never silently accept the divergence). It
 * derives the RELATION, never the mirror bytes (§7.4: the byte generator was the
 * superseded S5.2 premise).
 *
 * It {@link requireSpineRelation}, so it runs ONLY on the opt-in host path (the CLI
 * probes + injects the facts); the lean MCP/command path does not run it. Earns
 * blocking authority via the SHIPPED ratchet ({@link verifyGate}: redCaught ∧
 * greenClean ∧ mutationKilled — Axiom 5).
 *
 * @module
 */

import { defineGate, requireSpineRelation, type GateContext, type Gate } from '../gate.js';
import { finding, type Finding } from '../finding.js';
import { memoryContext } from '../engine.js';
import { factAccessEvidenceDigest } from '../verdict-cache.js';
import { relationSatisfied, type SpineRelationFacts, type SpineRelationObservation } from '../spine-relation-facts.js';

/** The gate id — namespaces every finding (traceability). */
const GATE_ID = 'gauntlet/spine-relation';

/**
 * The finding for an UNRESOLVED observation — a mirror type (or its runtime twin)
 * that no longer imports/typecheck-resolves. This is the CapSet CLASS of slip at its
 * hardest: a renamed or removed type. Always an L4 error (a broken published
 * contract — a consumer's `.d.ts` reference would dangle).
 */
function unresolvedFinding(o: SpineRelationObservation): Finding {
  return finding({
    ruleId: GATE_ID,
    severity: 'error',
    level: 'L4',
    title: `Spine mirror "${o.typeName}" no longer resolves (authority: ${o.authority})`,
    detail: `The admitted mirror type \`${o.typeName}\` (authority: ${o.authority}, admitted relation: ${o.admittedRelation}) did not typecheck-resolve on both sides — the spine mirror or its runtime twin was renamed or removed.${o.detail ? ` ${o.detail}` : ''} A dangling mirror is a broken public contract: a consumer's published \`.d.ts\` reference would fail to resolve. Restore the type on both sides, or — if the removal is deliberate — retire the admission and the mirror together.`,
    remediation: {
      kind: 'instruction',
      description: 'Restore the resolvable mirror↔runtime pair, or retire the admission and mirror together.',
      steps: [
        `Check whether \`${o.typeName}\` was renamed or removed on the spine side (\`packages/_spine/*.d.ts\`) or the runtime side.`,
        `If it should still exist, restore the declaration (and re-anchor per ADR-0010 if it is a branded type).`,
        `If the removal is intentional, remove the admission row AND the mirror declaration in the same change — never leave a dangling admission.`,
      ],
    },
  });
}

/**
 * The finding for a DRIFTED observation — the observed relation no longer satisfies
 * the admitted one. Names both axes and the assignability directions so the reader
 * sees EXACTLY how the mirror diverged from the runtime surface. Always an L4 error
 * (the published surface is the trust spine).
 */
function driftFinding(o: SpineRelationObservation): Finding {
  return finding({
    ruleId: GATE_ID,
    severity: 'error',
    level: 'L4',
    title: `Spine relation drift in "${o.typeName}": observed ${o.observedRelation}, admitted ${o.admittedRelation}`,
    detail: `The mirror type \`${o.typeName}\` (authority: ${o.authority}) is admitted to hold the \`${o.admittedRelation}\` relation to its runtime source, but the assignability probe OBSERVED \`${o.observedRelation}\` (spine→runtime assignable: ${o.assignableSpineToRuntime}; runtime→spine assignable: ${o.assignableRuntimeToSpine}). The hand-curated mirror drifted from the runtime surface — the exact class the frozen spine-conformance pins caught (CapSet Set→array, Millis brand loss, WGSL omission), now caught mechanically. Fix the mirror to restore the admitted relation, or — if the runtime surface deliberately changed — re-admit the new relation with review (never silently accept the divergence).`,
    remediation: {
      kind: 'instruction',
      description: 'Restore the admitted relation, or deliberately re-admit the new relation.',
      steps: [
        `Compare the spine declaration of \`${o.typeName}\` against its runtime source; the observed \`${o.observedRelation}\` says which direction of assignability broke.`,
        `If the mirror is stale, edit the \`_spine/*.d.ts\` declaration to restore the \`${o.admittedRelation}\` relation (ADR-0010: brand additions land in _spine BEFORE the runtime re-exports them).`,
        `If the runtime surface intentionally changed, update the admission row to the new observed relation and record the surface change in the api/type-export snapshots — a reviewed re-admission, never a silent widening.`,
      ],
    },
  });
}

/**
 * The shared fold — folds the injected spine-relation facts. Each UNRESOLVED
 * observation → an unresolved finding; each RESOLVED observation whose observed
 * relation does not satisfy its admitted relation → a drift finding. A conforming
 * observation produces nothing. Findings are emitted in a deterministic order
 * (unresolved before drift, then by type name).
 */
function foldSpineRelation(context: GateContext): readonly Finding[] {
  const facts = requireSpineRelation(context, GATE_ID);
  const findings: Finding[] = [];
  for (const o of facts.observations) {
    if (!o.resolved) {
      findings.push(unresolvedFinding(o));
      continue;
    }
    if (!relationSatisfied(o.observedRelation, o.admittedRelation)) {
      findings.push(driftFinding(o));
    }
  }
  const rank = (f: Finding): number => (f.title.includes('no longer resolves') ? 0 : 1);
  findings.sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title));
  return findings;
}

// ── Fixtures (in-memory, no ts.Program) ───────────────────────────────────────

/** A {@link GateContext} carrying in-memory spine-relation facts — for the fixtures. */
function spineRelationContext(facts: SpineRelationFacts): GateContext {
  return { ...memoryContext({}), spineRelation: facts };
}

/**
 * A CONFORMING observation — the observed relation satisfies the admitted one (no
 * finding). Models a correctly-mirrored runtime-authority type.
 */
function conformingObservation(typeName: string): SpineRelationObservation {
  return {
    typeName,
    authority: 'runtime',
    admittedRelation: 'exact',
    observedRelation: 'exact',
    assignableSpineToRuntime: true,
    assignableRuntimeToSpine: true,
    resolved: true,
  };
}

/**
 * A DRIFTED observation — admitted `exact`, but the mirror lost a member so the
 * probe observed `public-wider` (runtime→spine holds, spine→runtime fails). This is
 * exactly the WGSL-omission / Millis-brand-loss shape (a member the runtime carries
 * that the spine dropped). The gate MUST flag it.
 */
function driftedObservation(typeName: string): SpineRelationObservation {
  return {
    typeName,
    authority: 'runtime',
    admittedRelation: 'exact',
    observedRelation: 'public-wider',
    assignableSpineToRuntime: false,
    assignableRuntimeToSpine: true,
    resolved: true,
  };
}

/**
 * The red/green/mutation fixtures — the authority ratchet's evidence, all in-memory.
 *  - RED: facts carrying a DRIFTED observation → ≥1 finding (the gate catches the
 *    mirror that diverged from the runtime — the CapSet/WGSL/Millis class).
 *  - GREEN: facts carrying only a CONFORMING observation → 0 findings.
 *  - MUTATION: a gate that trusts the admitted relation without checking the observed
 *    one (drops the `relationSatisfied` comparison) does NOT fire on the red fixture's
 *    drifted observation → red no longer caught → the mutant is killed.
 */
const FIXTURES = {
  red: {
    name: 'spine-relation facts with a DRIFTED observation (a mirror that diverged from its runtime source)',
    context: spineRelationContext({ observations: [driftedObservation('CompositeState')] }),
  },
  green: {
    name: 'spine-relation facts with only a CONFORMING observation (the mirror matches its runtime source)',
    context: spineRelationContext({ observations: [conformingObservation('CompositeState')] }),
  },
  mutation: {
    describe:
      "A gate that trusts the admitted relation and skips the observed-vs-admitted comparison does not fire on the red fixture's drifted observation — red is no longer caught and the mutant is killed.",
    mutate: (gate: Gate): Gate => ({
      ...gate,
      run: (context: GateContext): readonly Finding[] => {
        const facts = requireSpineRelation(context, GATE_ID);
        // The corruption: only flag UNRESOLVED observations; trust every resolved
        // observation's admitted relation without checking what was observed.
        return facts.observations.filter((o) => !o.resolved).map((o) => unresolvedFinding(o));
      },
    }),
  },
} as const;

/**
 * The two-axis spine-relation gate — each admitted mirror type whose OBSERVED relation
 * no longer satisfies its ADMITTED (frozen) relation becomes a self-explaining Finding
 * naming both axes; each unresolved mirror is a broken-contract Finding. Folds
 * host-injected {@link SpineRelationFacts}. REPORT-not-DECIDE. It
 * {@link requireSpineRelation}, so it runs only on the opt-in host path. Earns
 * blocking authority via the shipped ratchet.
 */
export const spineRelationGate: Gate = defineGate({
  id: GATE_ID,
  level: 'L4',
  describe:
    'Reports each admitted spine mirror type whose observed relation (bidirectional assignability against its runtime source) no longer satisfies its admitted two-axis relation, plus each mirror that no longer resolves, as a public-contract drift. Folds host-injected SpineRelationFacts. Reports, never decides.',
  run: foldSpineRelation,
  // OUT-OF-IR evidence: the injected SpineRelationFacts come from a ts.Program probe
  // over BOTH the spine mirror and the runtime surface — NOT from any single IR source
  // byte. Fold the fact content so the cache refolds on a relation flip even when the
  // IR source is byte-identical (the soundness keystone).
  evidenceDigest: (context: GateContext): string | undefined =>
    factAccessEvidenceDigest('spineRelation', context.spineRelation),
  fixtures: FIXTURES,
});
