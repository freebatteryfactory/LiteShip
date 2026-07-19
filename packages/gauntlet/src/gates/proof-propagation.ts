/**
 * The PROOF-PROPAGATION gate (the LOCAL-VS-GLOBAL correctness family — the
 * lax-functor: local proof ≤ weakest dependency). The lean half: it FOLDS the
 * host-injected {@link ProofFacts} (the per-module blended proof scalars), PROPAGATES
 * them along the IR's dep DAG via the {@link propagateProofStrength} `min`-fixpoint
 * (the dual of {@link propagateAssuranceLevels}), and reports each trust-spine module
 * whose EFFECTIVE (global) proof drops below its level's floor BECAUSE of a weak
 * dependency — naming the exact weak-link path to strengthen.
 *
 * THE BIG IDEA, restated as a gate. A module can be LOCALLY well-proven (killed
 * mutants, high coverage, a property test, an enrolled invariant) yet sit on an
 * UNDER-PROVEN dependency. Local proof does NOT compose past a weak dependency: if
 * `A` calls into `B` and `B` is unproven, `A`'s correctness is conditioned on `B`'s
 * — so `A`'s GLOBAL proof = `min(localProof(A), effective(B))`. A file (transitively)
 * depending on a weak module inherits that module's low proof. When a CRITICAL
 * module's effective proof falls below the floor for its level, that is the finding:
 * the weak link must be strengthened OR the criticality reassessed.
 *
 * AIM THE CANNON (the floor by level). The severity scales with the file's EFFECTIVE
 * assurance level (the {@link propagateAssuranceLevels} fixpoint over the IR's import
 * graph — THE LAW: computed from the live IR, never a hardcoded level beside the
 * file). A drop below the floor:
 *   - at L4 → `error` (BLOCKS — the trust spine's proof must compose; floor 0.90).
 *   - at L3 → `error` (deterministic runtime paths; floor 0.75).
 *   - at L2 → `warning` (floor 0.50).
 *   - at L1/L0 → `advisory` (calibrating debt; no floor — 0).
 * A module whose effective proof equals its LOCAL proof (no weaker dep dragged it
 * down) and is still below the floor is a LOCAL gap, NOT a composition gap — this
 * gate reports ONLY the GLOBAL drops it owns (effective < local: the weak link is a
 * DEPENDENCY); a purely-local gap is the mutation/coverage families' job, so this
 * gate stays in its lane and never double-counts.
 *
 * REPORT-not-DECIDE. The gate names the module, its effective proof, the floor it
 * fell under, and the EXACT weak-link dependency path ({@link weakestLinkPath}), and
 * reports it; the human/agent strengthens the dependency or reassesses the
 * criticality. The engine picks no winner. SOUND AS A RISK SIGNAL — it never claims
 * the module is globally CORRECT (Rice: undecidable); it reports that the module's
 * proof does not compose past a measured weak link.
 *
 * It reads the IR for the dep graph + level propagation and reads {@link ProofFacts};
 * when the facts are ABSENT it reports an honest advisory "not-evidenced" finding
 * (never a silent green). It {@link requireIR} (the dep DAG is mandatory), so it runs
 * only on the host `--ir` path. Composition over inheritance: a fold + standalone
 * functions, no class.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE DEEPER #47 FOLLOW-UP (NOTE — DELIBERATELY NOT BUILT IN THIS PASS).
 *
 * This gate + the composition-coverage gate are the two BUILDABLE, mostly-cheap
 * analyses of the LOCAL-VS-GLOBAL family: a deterministic `min`-fold over the dep DAG,
 * and a structural over-approximation of integration coverage. They are STRUCTURAL
 * risk signals — they never decide semantic global correctness. The deepest member of
 * the family is BOUNDED SEMANTIC MODEL-CHECKING over the DST-seeded state space, and
 * it needs its OWN design (it is not this pass):
 *
 *   - APPROACH. The DST world (`packages/core/src/simulation/` — `world` / `scheduler`
 *     / `scenario` / `trace`) already mints a SEEDED, deterministic state machine over
 *     the HLC / graph-patch / compositor trust spine. A model checker would enumerate
 *     the REACHABLE states of that machine from a seed up to a BOUNDED depth/breadth
 *     (a bounded BFS/DFS over the scheduler's choice points — message orderings, fault
 *     injections), and assert a GLOBAL invariant (e.g. "HLC.compare stays a total
 *     order across every reachable interleaving", "every applied graph-patch preserves
 *     the DocumentGraph's content-address identity") holds in EVERY reachable state —
 *     not just the handful a scenario happens to walk. A counterexample is a concrete
 *     seeded trace the existing `simulationDeterminismGate` shape can already replay
 *     byte-for-byte.
 *
 *   - WHY DECIDABLE-FOR-BOUNDED / ADVISORY-UNBOUNDED (the Rice boundary, stated
 *     honestly). For a FIXED bound (depth k, a finite seed/choice frontier) the
 *     reachable set is FINITE, so checking the invariant over it is DECIDABLE — a hard
 *     gate (a bounded counterexample is a real, replayable bug). UNBOUNDED — "the
 *     invariant holds across ALL reachable states for ALL seeds" — is the general
 *     safety-verification problem, UNDECIDABLE (Rice): we can never CLAIM the global
 *     invariant from a bounded exploration, only that NO violation was found within the
 *     bound. So the unbounded verdict is ADVISORY ("checked to depth k, clean"), never
 *     a global-correctness claim. This is the same hard-where-decidable /
 *     advisory-where-semantic rail this gate already rides.
 *
 *   - WHY NOT NOW. State-space enumeration over the scheduler's choice points needs a
 *     bounded-search engine + an invariant-spec language + state-deduplication
 *     (content-addressing reachable states) — a substantial design in its own right.
 *     Proof-propagation + composition-coverage deliver the family's cheap, deterministic
 *     value first; the model checker is the queued deep follow-up.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * @module
 */

import { defineGate, requireIR, type GateContext, type Gate } from '../gate.js';
import { factAccessEvidenceDigest } from '../verdict-cache.js';
import { finding, type Finding, type Severity } from '../finding.js';
import { memoryContext } from '../engine.js';
import { makeRepoIR, PLACEHOLDER_DIGEST, type RepoIR, type FileId } from '../repo-ir.js';
import { levelOf } from '../assurance-map.js';
import { propagateAssuranceLevels } from '../assurance-propagation.js';
import { propagateProofStrength, weakestLinkPath } from '../proof-propagation.js';
import type { AssuranceLevel } from '../assurance.js';
import { UNMEASURED_PROOF, type ProofFacts, type ModuleProof } from '../facts/proof-facts.js';

/** The gate id — namespaces every finding (traceability). */
const GATE_ID = 'gauntlet/proof-propagation';

/**
 * The minimum acceptable EFFECTIVE proof per level — the floor a global drop must
 * clear, exported DATA a downstream owner can redline (sibling to the
 * mutation kill-floor matrix). L4/L3 demand a high composed proof; L1/L0 have no
 * floor (proof debt is calibrating there). A module whose effective proof is below
 * its level's floor BECAUSE of a weak dependency is the finding.
 */
export const PROOF_FLOOR_BY_LEVEL: Readonly<Record<AssuranceLevel, number>> = {
  L4: 0.9,
  L3: 0.75,
  L2: 0.5,
  L1: 0,
  L0: 0,
} as const;

/**
 * The severity a sub-floor GLOBAL drop earns at a given effective level — the
 * calibration, exported DATA a downstream owner can redline. L4/L3 BLOCK; L2 warns;
 * L1/L0 are advisory debt.
 */
export const PROOF_SEVERITY_BY_LEVEL: Readonly<Record<AssuranceLevel, Severity>> = {
  L4: 'error',
  L3: 'error',
  L2: 'warning',
  L1: 'advisory',
  L0: 'advisory',
} as const;

/**
 * The EFFECTIVE level of every file — the {@link propagateAssuranceLevels} fixpoint
 * over the live IR's import graph, with the glob {@link levelOf} as the floor (THE
 * LAW: computed from the live IR, never a hardcoded level).
 */
function effectiveLevels(ir: RepoIR): ReadonlyMap<FileId, AssuranceLevel> {
  return propagateAssuranceLevels(ir, (file) => levelOf(file));
}

/** The effective level of one file — the propagated map, or the glob floor if absent. */
function levelForFile(file: FileId, levels: ReadonlyMap<FileId, AssuranceLevel>): AssuranceLevel {
  return levels.get(file) ?? levelOf(file);
}

/**
 * The local-proof lookup the propagation reads — a module the host measured maps to
 * its blended scalar; an UNMEASURED module maps to the documented
 * {@link UNMEASURED_PROOF} floor (the weakest link — the sound direction: it can only
 * LOWER an effective proof, never inflate it through a hole the host never looked at).
 */
function localProofLookup(facts: ProofFacts): (file: FileId) => number {
  const byFile = new Map<FileId, ModuleProof>();
  for (const m of facts.modules ?? []) byFile.set(m.file, m);
  return (file: FileId): number => byFile.get(file)?.localProof ?? UNMEASURED_PROOF;
}

/** A short, self-explaining breakdown of one module's proof signals (for the detail). */
function signalsLine(proof: ModuleProof | undefined): string {
  if (proof === undefined) return 'unmeasured (treated as the weakest link, 0)';
  const s = proof.signals;
  const mut = s.mutationScore === null ? 'unmeasured' : s.mutationScore.toFixed(2);
  const cov = s.coverage === null ? 'unmeasured' : s.coverage.toFixed(2);
  return `mutation=${mut}, coverage=${cov}, property-test=${s.hasPropertyTest ? 'yes' : 'no'}, enrolled-invariant=${s.hasEnrolledInvariant ? 'yes' : 'no'}`;
}

/**
 * Is a module's proof breakdown UNMEASURED on the two MEASURABLE fractions — i.e. the
 * host has neither a mutation score nor a coverage number for it? Such a module is a
 * MEASUREMENT-coverage gap (the host never looked), NOT a proven-weak link. The two
 * cases must be differentiated (the "undifferentiated red is itself a failure"
 * doctrine): a measured-and-weak dependency is the real BLOCKING finding; an unmeasured
 * one is the quieter "go measure this dep" advisory. A module absent from the facts
 * entirely (`undefined`) is also unmeasured.
 */
function isUnmeasured(proof: ModuleProof | undefined): boolean {
  if (proof === undefined) return true;
  return proof.signals.mutationScore === null && proof.signals.coverage === null;
}

/**
 * The severity a weak-link finding earns when the capping dependency is itself
 * UNMEASURED (a measurement-coverage gap, not a proven-weak link) — a quiet `advisory`
 * at every level (redlinable). A measured-and-weak link keeps the full
 * {@link PROOF_SEVERITY_BY_LEVEL} blocking severity. This is what keeps the cannon
 * aimed: the gate does not block a trust-spine module merely because the host has not
 * yet measured one of its dependencies — it surfaces that as a worklist to GO MEASURE
 * the dep, distinct from a dep that IS measured and IS weak (the real composition risk).
 */
export const UNMEASURED_WEAK_LINK_SEVERITY: Severity = 'advisory';

/**
 * Build the self-explaining weak-link finding for one module whose GLOBAL proof drops
 * below its floor because of a dependency. Names the effective proof, the floor, the
 * weak-link path, and the capping dependency's signal breakdown. The severity is
 * DIFFERENTIATED: a MEASURED-and-weak link blocks at the level's
 * {@link PROOF_SEVERITY_BY_LEVEL} severity; an UNMEASURED link (a measurement-coverage
 * gap) is the quiet {@link UNMEASURED_WEAK_LINK_SEVERITY} advisory (go measure the
 * dep), never blocking on a hole the host has not yet looked into. REPORT-not-DECIDE.
 */
function weakLinkFinding(
  file: FileId,
  level: AssuranceLevel,
  localProof: number,
  effectiveProof: number,
  floor: number,
  path: readonly FileId[],
  weakLinkProof: ModuleProof | undefined,
): Finding {
  const weakLink = path[path.length - 1] ?? file;
  const pathStr = path.join(' → ');
  const unmeasured = isUnmeasured(weakLinkProof);
  const severity = unmeasured ? UNMEASURED_WEAK_LINK_SEVERITY : PROOF_SEVERITY_BY_LEVEL[level];
  const measuredNote = unmeasured
    ? `The capping dependency \`${weakLink}\` is UNMEASURED (the host has no mutation/coverage signal for it) — so this is a MEASUREMENT-coverage gap (go measure the dep), reported as a quiet advisory rather than a blocking composition risk.`
    : `The capping dependency \`${weakLink}\` IS measured and IS weak — a genuine composition risk: ${file}'s proof does not compose past it.`;
  return finding({
    ruleId: GATE_ID,
    severity,
    level,
    title: `Globally under-proven via ${unmeasured ? 'an unmeasured' : 'a weak'} dependency: ${file} (${level})`,
    detail: `${file} is locally well-proven (local proof ${localProof.toFixed(2)}) but its EFFECTIVE (global) proof is only ${effectiveProof.toFixed(2)} — below the ${level} floor (${floor.toFixed(2)}) — because it depends (transitively) on a weaker module. Local proof does not compose past a weak dependency: the weak-link path is ${pathStr}, and the capping dependency \`${weakLink}\` has proof signals [${signalsLine(weakLinkProof)}]. ${measuredNote} This is a RISK signal (the module's proof genuinely does not compose past the measured weak link), NOT a claim the module is globally incorrect. The engine reports the weak link; you decide whether to strengthen it or reassess the criticality.`,
    location: { file },
    remediation: {
      kind: 'instruction',
      description:
        "Restore the module's global proof above its level floor by strengthening the weak dependency (or reassessing the level).",
      steps: [
        `The weak link is \`${weakLink}\` (proof signals: ${signalsLine(weakLinkProof)}).`,
        unmeasured
          ? `\`${weakLink}\` is UNMEASURED — first MEASURE it (a mutation score + coverage), then it either clears the floor (no risk) or surfaces as a real measured-weak link.`
          : `Strengthen \`${weakLink}\`: add/strengthen its tests (raise mutation score + coverage), add a property test, or enroll a system invariant that traces to it — until its proof clears the ${floor.toFixed(2)} floor.`,
        `OR, if \`${weakLink}\` is genuinely not on the trust spine, reassess the assurance map so ${file} no longer inherits a trust-spine floor through it.`,
      ],
    },
  });
}

/** The advisory finding emitted when the host injected NO proof facts (honest under-coverage). */
function notEvidencedFinding(): Finding {
  return finding({
    ruleId: GATE_ID,
    severity: 'advisory',
    level: 'L4',
    title: 'Proof-propagation not evidenced',
    detail:
      'No proof facts were injected, so the lax-functor proof-propagation could not run — the gate reports this honestly rather than passing silently. A host (the CLI `liteship check --ir --proof` path) reads the proof signals (mutation score, coverage, property tests, enrolled invariants), blends them into per-module scalars, and injects ProofFacts for this gate to propagate along the dep DAG.',
    remediation: {
      kind: 'instruction',
      description: 'Run the proof-propagation analysis so the global-proof composition is evidenced.',
      steps: ['Run `liteship check --ir --proof` so the host builds + injects ProofFacts.'],
    },
  });
}

/**
 * The shared fold — propagates the injected proof scalars along the dep DAG and
 * reports each trust-spine module whose GLOBAL proof dropped below its level floor
 * BECAUSE OF A DEPENDENCY (effective < local — a composition gap this gate owns; a
 * purely-local gap, effective === local, belongs to the mutation/coverage families
 * and is left to them, no double-counting). Findings are sorted by file for
 * determinism.
 */
function foldProofPropagation(context: GateContext): readonly Finding[] {
  const ir = requireIR(context, GATE_ID);
  const facts = context.proof;
  // Absent / empty facts → an honest advisory, never a silent green.
  if (facts === undefined || (facts.modules ?? []).length === 0) {
    return [notEvidencedFinding()];
  }

  const localProofOf = localProofLookup(facts);
  const effective = propagateProofStrength(ir, localProofOf);
  const levels = effectiveLevels(ir);
  const byFile = new Map<FileId, ModuleProof>();
  for (const m of facts.modules ?? []) byFile.set(m.file, m);

  const findings: Finding[] = [];
  for (const file of [...ir.files.keys()].sort((a, b) => a.localeCompare(b))) {
    const level = levelForFile(file, levels);
    const floor = PROOF_FLOOR_BY_LEVEL[level];
    if (floor <= 0) continue; // L1/L0 carry no floor — no global-proof obligation.
    const effectiveProof = effective.get(file)!;
    if (effectiveProof >= floor) continue; // global proof clears the floor — clean.
    const localProof = localProofOf(file);
    // ONLY the GLOBAL drops this gate owns: effective < local means a DEPENDENCY
    // dragged the proof down (the composition gap). effective === local is a purely
    // LOCAL gap — the mutation/coverage families own it; this gate stays in its lane.
    if (effectiveProof >= localProof - Number.EPSILON) continue;
    const path = weakestLinkPath(ir, file, effective, localProofOf);
    const weakLink = path[path.length - 1];
    findings.push(
      weakLinkFinding(
        file,
        level,
        localProof,
        effectiveProof,
        floor,
        path,
        weakLink !== undefined ? byFile.get(weakLink) : undefined,
      ),
    );
  }
  return findings;
}

// ── Fixtures (in-memory, no host build) ───────────────────────────────────────

/** A {@link GateContext} carrying an in-memory IR + proof facts — for the fixtures. */
function proofContext(ir: RepoIR, proof: ProofFacts): GateContext {
  return { ...memoryContext({}), ir, proof };
}

/** A fixtures-only L4 file id (matches the `core/schema/brands.ts` L4 glob in the map). */
const L4_FILE = 'packages/core/src/schema/brands.ts';
/** A fixtures-only weak dependency the L4 file imports. */
const WEAK_DEP = 'packages/core/src/weak-helper.ts';

/**
 * The RED IR: the L4 file is locally well-proven (0.95) but imports a WEAK dependency
 * (0.2). The min-fold caps the L4 file's effective proof at 0.2 — below the 0.90 L4
 * floor, and BELOW its own local proof (a dependency dragged it down) → the finding.
 */
function redIR(): RepoIR {
  return makeRepoIR({
    files: [
      { id: L4_FILE, contentDigest: PLACEHOLDER_DIGEST, packageName: '@liteship/core' },
      { id: WEAK_DEP, contentDigest: PLACEHOLDER_DIGEST, packageName: '@liteship/core' },
    ],
    imports: [{ fromFile: L4_FILE, specifier: './weak-helper.js', kind: 'relative', targetFile: WEAK_DEP }],
  });
}

/** A module proof with explicit signals — the self-describing fixture shape. */
function moduleProof(file: string, localProof: number, signals: ModuleProof['signals']): ModuleProof {
  return { file, localProof, signals };
}

const STRONG_SIGNALS: ModuleProof['signals'] = {
  mutationScore: 1,
  coverage: 0.98,
  hasPropertyTest: true,
  hasEnrolledInvariant: true,
};
const WEAK_SIGNALS: ModuleProof['signals'] = {
  mutationScore: 0.2,
  coverage: 0.3,
  hasPropertyTest: false,
  hasEnrolledInvariant: false,
};

/**
 * The red/green/mutation fixtures — the authority ratchet's evidence, all in-memory.
 *  - RED: an L4 file with strong LOCAL proof but a WEAK dependency → its effective
 *    proof is capped below the L4 floor by the dep → ≥1 weak-link finding.
 *  - GREEN: the SAME graph but the dependency is now strongly proven → the L4 file's
 *    effective proof clears the floor → 0 findings.
 *  - MUTATION: a mutant gate that MAXIMIZES instead of minimizes (uses the dep's proof
 *    only when it is HIGHER) never caps the L4 file → red goes clean → killed.
 */
const FIXTURES = {
  red: {
    name: 'an L4 module locally well-proven but depending on a weak module (global proof drops below floor)',
    context: proofContext(redIR(), {
      modules: [moduleProof(L4_FILE, 0.95, STRONG_SIGNALS), moduleProof(WEAK_DEP, 0.2, WEAK_SIGNALS)],
    }),
  },
  green: {
    name: 'the same dep graph with the dependency now strongly proven (effective proof clears the floor)',
    context: proofContext(redIR(), {
      modules: [moduleProof(L4_FILE, 0.95, STRONG_SIGNALS), moduleProof(WEAK_DEP, 0.95, STRONG_SIGNALS)],
    }),
  },
  mutation: {
    describe:
      'A mutant gate that MAXIMIZES the dependency proof (a max-fold, the wrong functor) never caps the L4 file at the weak dep, so the red fixture goes clean — the fixtures kill it.',
    mutate: (gate: Gate): Gate => ({
      ...gate,
      run: (context: GateContext): readonly Finding[] => {
        const ir = requireIR(context, GATE_ID);
        const facts = context.proof;
        if (facts === undefined || (facts.modules ?? []).length === 0) return [notEvidencedFinding()];
        const localProofOf = localProofLookup(facts);
        // The corruption: take the MAX along deps (raises instead of caps) — a weak
        // dep can never lower an importer, so no global drop is ever found.
        const effective = new Map<FileId, number>();
        for (const id of ir.files.keys()) effective.set(id, localProofOf(id));
        let changed = true;
        while (changed) {
          changed = false;
          for (const edge of ir.imports) {
            if (edge.targetFile === undefined) continue;
            const from = effective.get(edge.fromFile)!;
            const dep = effective.get(edge.targetFile)!;
            if (dep > from) {
              effective.set(edge.fromFile, dep);
              changed = true;
            }
          }
        }
        const levels = effectiveLevels(ir);
        const out: Finding[] = [];
        for (const file of [...ir.files.keys()].sort((a, b) => a.localeCompare(b))) {
          const level = levelForFile(file, levels);
          const floor = PROOF_FLOOR_BY_LEVEL[level];
          if (floor <= 0) continue;
          const eff = effective.get(file)!;
          if (eff >= floor) continue;
          if (eff >= localProofOf(file) - Number.EPSILON) continue;
          out.push(weakLinkFinding(file, level, localProofOf(file), eff, floor, [file], undefined));
        }
        return out;
      },
    }),
  },
} as const;

/**
 * The proof-propagation gate — each trust-spine module whose EFFECTIVE (global) proof
 * drops below its level floor BECAUSE of a weak dependency becomes a self-explaining
 * Finding naming the exact weak-link path. REPORT-not-DECIDE. It reads the IR (dep DAG
 * + level propagation) + folds the host-injected ProofFacts (advisory when absent), so
 * it runs only on the opt-in host `--proof` path. Earns blocking authority via the
 * existing ratchet.
 */
export const proofPropagationGate: Gate = defineGate({
  id: GATE_ID,
  level: 'L4',
  describe:
    'Propagates a per-module proof scalar along the dep DAG (min-fixpoint, the lax-functor) and reports each trust-spine module whose global proof drops below its level floor because of a weak dependency, naming the weak-link path. Folds host-injected ProofFacts. Reports, never decides.',
  run: foldProofPropagation,
  // OUT-OF-IR evidence: the gate propagates over the IR dep DAG (in the coverage digest)
  // BUT seeds it with the injected ProofFacts derived from EXTERNAL signals (the
  // mutation-score ratchet, the coverage report, the enrolled-invariant ledger) — NONE in
  // the IR. A weakened signal flips a module below its floor WITHOUT touching source, so
  // fold the fact content too (the soundness keystone for this gate).
  evidenceDigest: (context: GateContext): string | undefined => factAccessEvidenceDigest('proof', context.proof),
  fixtures: FIXTURES,
});
