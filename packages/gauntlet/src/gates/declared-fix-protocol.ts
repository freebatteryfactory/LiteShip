/**
 * Gate: declared-fix-protocol — the AGENT-SAFETY META-GAUNTLET (the "raccoon rule"),
 * phases B + C: the agent-fix ADMISSION gate.
 *
 * Phase A's {@link standardsIntegrityGate} is the unconditional COMMIT backstop: it
 * catches a silent weakening regardless of who/how it landed. This gate guards the
 * OTHER face of the raccoon — an agent's AUTO-FIX (the `--fix` / apply path) that
 * declares "I'm fixing X" while actually creeping scope, exceeding its declared size,
 * weakening a standard, or forging its receipts.
 *
 * It folds the host-supplied {@link DeclaredFixFacts} (the host already ran
 * {@link verifyDeclaredFix} — at the APPLY moment in phase B, and/or freshly at the
 * commit moment in phase C — and hands the engine the verdict). A `rejected` verdict
 * folds to a BLOCKING L4 Finding PER reason, each self-explaining by class:
 *
 *  - SCOPE-CREEP        → the fix touched a file / standards element it did not declare.
 *  - SIZE-EXCEEDED      → the fix is larger than its declared cap.
 *  - UNSIGNED-WEAKENING → the fix weakened a standard with no owner sign-off (phase A).
 *  - FORBIDDEN-WEAKENING→ the fix weakened the never-signable floor (placeholder/skip).
 *  - FORGED-RECEIPT     → a receipt is missing / forged / hides a touched file.
 *
 * When NO declared-fix facts are present (a normal commit, not an agent-fix), the gate
 * is SILENT — phase A's commit backstop already guards that path, so this gate adds no
 * noise to a non-agent-fix run. An `admitted` verdict folds to NOTHING (the green): an
 * in-scope, sized, non-weakening, receipted fix is admitted clean.
 *
 * LEAN BY CONSTRUCTION (ADR-0012): the gate reads NO config off disk, content-addresses
 * NOTHING (the host minted the receipts via `@liteship/core`'s kernel), and reads NO clock
 * (the host injected `now` into the verifier). It only FOLDS the decided verdict.
 * REPORT-not-DECIDE.
 *
 * ONE ENGINE, TWO MOMENTS: the verdict this gate folds is produced by the SAME
 * {@link verifyDeclaredFix} the runtime apply seam (phase B) calls to admit-or-reject a
 * proposed fix. The agent declares its fix once; the verifier checks declaration-vs-
 * reality + no-weakening at the apply moment AND here at the commit gate.
 *
 * It ships red / green / mutation fixtures, so it self-proves against the authority
 * ratchet.
 *
 * @module
 */

import { defineGate, type GateContext, type Gate } from '../gate.js';
import { factAccessEvidenceDigest } from '../verdict-cache.js';
import { finding, type Finding } from '../finding.js';
import { memoryContext } from '../engine.js';
import type { DeclaredFixFacts, FixRejection, FixRejectionClass } from '../declared-fix.js';

const RULE_NS = 'gauntlet/declared-fix-protocol';

/** The per-class rule-id suffix + title fragment — so each rejection class is separately traceable. */
const CLASS_RULE: Readonly<Record<FixRejectionClass, { readonly suffix: string; readonly title: string }>> = {
  'scope-creep': { suffix: 'scope-creep', title: 'Agent-fix SCOPE CREEP' },
  'size-exceeded': { suffix: 'size-exceeded', title: 'Agent-fix SIZE EXCEEDED' },
  'unsigned-weakening': { suffix: 'unsigned-weakening', title: 'Agent-fix UNSIGNED standards weakening' },
  'forbidden-weakening': { suffix: 'forbidden-weakening', title: 'Agent-fix FORBIDDEN standards weakening' },
  'forged-receipt': { suffix: 'forged-receipt', title: 'Agent-fix FORGED / missing receipt' },
};

/** Project one rejection reason into a BLOCKING L4 Finding (the raccoon caught on the apply path). */
function rejectionFinding(intent: string, reason: FixRejection): Finding {
  const rule = CLASS_RULE[reason.class];
  return finding({
    ruleId: `${RULE_NS}/${rule.suffix}`,
    severity: 'error',
    level: 'L4',
    title: `${rule.title}: declared "${intent}"`,
    detail: `${reason.detail} This is the raccoon rule on the APPLY path: an agent's auto-fix must DECLARE its intent + scope + size-cap + before/after receipts, and the verifier admits it ONLY when the actual change matches the declaration AND weakens nothing. This fix was REJECTED (class "${reason.class}") — it is not admitted.`,
    location: { file: 'traceability/declared-fix.json' },
    remediation: {
      kind: 'instruction',
      description: `Make the fix match its declaration, or revise the declaration to the truth — then re-verify.`,
      steps: [
        `If the fix overreached (touched a file / standards element it did not declare, or grew past its size cap), SHRINK it back to the declared scope + size — a declared fix does exactly what it declared, no more.`,
        `If the fix WEAKENED a standard, reverse the weakening — or add an owner-signed standards-waiver (elementKey + class + expiry). An always-blocking weakening (placeholder/skip) can NEVER be signed; it must be reversed.`,
        `If a receipt is missing / forged / hides a touched file, re-mint BOTH receipts honestly from the real before/after standards surface + the real touched files — an agent cannot claim a fix it did not actually run.`,
        `NEVER widen the declaration to launder an overreach — that is the laundering the protocol exists to catch.`,
      ],
    },
  });
}

/** The fold: project the injected declared-fix verdict into Findings. */
function fold(context: GateContext): readonly Finding[] {
  const facts: DeclaredFixFacts | undefined = context.declaredFix;
  // ABSENT facts ⇒ NO agent-fix is being validated (a normal commit) ⇒ the gate is
  // SILENT (phase A's commit backstop already guards that path). This is the honest
  // no-op — not a silent green over a present-but-unverified fix.
  if (facts === undefined) return [];
  // An `admitted` verdict folds to NOTHING — the green (an in-scope, sized,
  // non-weakening, receipted fix is admitted clean).
  if (facts.verdict._tag === 'admitted') return [];
  return facts.verdict.reasons.map((reason) => rejectionFinding(facts.intent, reason));
}

/** A GateContext carrying a literal DeclaredFixFacts record (fixture helper). */
function factsContext(facts: DeclaredFixFacts): GateContext {
  return { ...memoryContext({}), declaredFix: facts };
}

/**
 * A clean ADMITTED fix — the green floor (an in-scope, sized, non-weakening, receipted
 * fix the verifier admitted). The gate must fold this to ZERO findings.
 */
const ADMITTED_FACTS: DeclaredFixFacts = {
  intent: 'fix the fnv off-by-one in packages/core/src/fnv.ts',
  verdict: { _tag: 'admitted' },
};

/**
 * A REJECTED fix whose ONLY reason is SCOPE-CREEP — the red. It is scope-creep-only by
 * design so the mutation fixture (a fold that turns a blind eye to scope-creep) is
 * GENUINELY killed: against this red the mutant yields ZERO findings (it dropped the
 * only reason), so the red is no longer caught → the ratchet kills it (a mutation with
 * teeth, not theatre). The BITE proofs for the OTHER rejection classes (size, unsigned
 * + forbidden weakening, forged receipt) drive the real {@link verifyDeclaredFix} in
 * the test suite, where each class is exercised against real measured reality.
 */
const REJECTED_FACTS: DeclaredFixFacts = {
  intent: 'claimed: fix one typo in packages/core/src/fnv.ts',
  verdict: {
    _tag: 'rejected',
    reasons: [
      {
        class: 'scope-creep',
        detail:
          'the fix touched "packages/gauntlet/src/gates/no-placeholder.ts", which is OUTSIDE its declared scope (globs: packages/core/src/fnv.ts).',
      },
    ],
  },
};

/** The qualified gate — fixtures included, so it self-proves via the ratchet. */
export const declaredFixProtocolGate: Gate = defineGate({
  id: RULE_NS,
  level: 'L4',
  describe:
    'Avionics-tier agent-fix ADMISSION gate (the raccoon rule, phases B+C): folds the host-supplied declared-fix verdict — a fix REJECTED for scope-creep, size-exceeded, an unsigned/forbidden standards weakening (reusing phase A), or a forged/missing receipt is a BLOCKING Finding per reason; an ADMITTED (in-scope, sized, non-weakening, receipted) fix is clean; no declared fix present (a normal commit) is silent (phase A guards that path).',
  run: fold,
  // OUT-OF-IR evidence: the injected DeclaredFixFacts are derived from the EXTERNAL
  // working-tree change + the before/after standards receipts + the declaration — NONE in
  // the IR. The verdict varies with the declared fix, not package source, so fold the fact
  // content so the cache refolds on any admission-verdict change (the soundness keystone).
  evidenceDigest: (context: GateContext): string | undefined =>
    factAccessEvidenceDigest('declaredFix', context.declaredFix),
  fixtures: {
    red: {
      name: 'a rejected agent-fix whose sole reason is scope-creep (a file touched outside its declared scope)',
      context: factsContext(REJECTED_FACTS),
    },
    green: {
      name: 'an admitted agent-fix (in-scope, sized, non-weakening, receipted) — folds to zero findings',
      context: factsContext(ADMITTED_FACTS),
    },
    mutation: {
      describe:
        'A gate that IGNORES scope-creep (folds every rejection reason EXCEPT scope-creep) lets a scope-creeping fix through. The red fixture is scope-creep-ONLY, so against it the mutant yields ZERO findings → the red is no longer caught → the ratchet KILLS the mutant. This is the exact laundering the gate exists to stop: a fix that creeps scope must never be admitted.',
      mutate: (gate: Gate): Gate => ({
        ...gate,
        // Mutant: a verifier-fold that turns a BLIND EYE to scope-creep — it folds every
        // rejection reason EXCEPT 'scope-creep'. The red fixture is scope-creep-ONLY, so
        // the mutant produces zero findings on it → red not caught → killed.
        run: (context: GateContext): readonly Finding[] => {
          const facts = context.declaredFix;
          if (facts === undefined || facts.verdict._tag === 'admitted') return [];
          return facts.verdict.reasons
            .filter((r) => r.class !== 'scope-creep')
            .map((r) => rejectionFinding(facts.intent, r));
        },
      }),
    },
  },
});
