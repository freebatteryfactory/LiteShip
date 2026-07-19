/**
 * THE TRANSITION-CONFORMANCE GATE — the reactive BISIMULATION proof (Wave 5.5, the
 * transition cage) run OVER THE NATIVE TRANSPORTS, in release CI.
 *
 * Sibling of {@link file://./spine-relation-gate.ts} / {@link file://./capability-gate.ts}:
 * the CONSTITUTION / conformance INTEGRITY family. The lean `transitionConformanceGate` fold
 * is exercised in unit tests with INJECTED facts (`tests/unit/gauntlet/transition-conformance.test.ts`)
 * — that proves the fold; but a gate nothing runs over the real transports is a hole. This
 * script is the repo-local HOST (ADR-0043 layering: `@czap/gauntlet` owns only the lean fact
 * FOLD; the reference model + native-transport oracle stay LiteShip-local): it drives the SAME
 * pinned corpus the property test exercises (the SHARED runner
 * `tests/support/reactive-conformance.ts` — one model, one corpus, one law table) over BOTH the
 * reference model and the native CellKernel-backed primitives, folds each family's decided
 * {@link buildTransitionFacts} through {@link transitionConformanceGate}, and reds on any
 * regression from the CURRENT declared model.
 *
 * DELIBERATE DIVERGENCES ARE PRODUCT LAW, NOT FAILURES. Each family is compared under its
 * DECLARED EmissionPolicy (the CHOSEN post-migration contract), never the retired Effect
 * baseline: the no-dedup families under `{all}`, Derived + Timeline under `{distinct}` (so
 * Derived's leading republish and Timeline's state dedup are conformant, not false L4 errors).
 * The one above-kernel delta (Derived's recompute-teardown on dispose) is a RECORDED delta the
 * property test pins — it is deliberately NOT in the must-hold corpus.
 *
 * WHY A STANDALONE PHASE (not the published `czap check` CLI): the model + native-transport
 * oracle are LiteShip-specific product machinery living in the test tree (a reactive-history
 * capture over `@czap/core`). Per ADR-0012 / ADR-0023 that laboratory stays repo-local rather
 * than being inflated into a shipped consumer CLI feature; the gate is HOSTED here, next to the
 * other constitution-integrity phases (`spine-relation:gate` / `capability:gate`), guaranteeing
 * the L4 bisimulation proof runs on every PR (reachable, never fixture-only).
 *
 * FAIL-CLOSED: any `divergent` case (a pinned history that bisimulates today flips to divergent)
 * or an `unevidenced` regression is a failing finding, never a silent drop.
 *
 * @module
 */

import {
  FAMILY_LAWS,
  buildFamilyTransitionFacts,
  GATE_CORPUS,
  type FamilyLaw,
} from '../tests/support/reactive-conformance.js';
import { transitionConformanceGate, memoryContext, type Finding, type TransitionFacts } from '@czap/gauntlet';
import { isDirectExecution } from './audit/shared.js';

/** One family's decided facts + the gate's fold over them. */
interface FamilyResult {
  readonly family: string;
  readonly facts: TransitionFacts;
  readonly findings: readonly Finding[];
}

/** Fold one family's declared-law corpus into its gate findings. */
async function runFamily(law: FamilyLaw): Promise<FamilyResult> {
  const facts = await buildFamilyTransitionFacts(law);
  const findings = transitionConformanceGate.run({ ...memoryContext({}), transition: facts });
  return { family: law.family, facts, findings };
}

/** The machine-readable, deterministic receipt one family contributes (no wall-clock). */
interface FamilyReceipt {
  readonly family: string;
  readonly policy: string;
  readonly cases: number;
  readonly equivalent: number;
  readonly divergent: number;
  readonly unevidenced: number;
  readonly modelDigest: string;
  readonly implementationDigest: string;
  readonly findings: number;
}

/** Tally a family's per-case verdicts into its receipt row. */
function familyReceipt(law: FamilyLaw, result: FamilyResult): FamilyReceipt {
  const count = (status: string): number => result.facts.cases.filter((c) => c.status === status).length;
  return {
    family: result.family,
    policy: law.policy.kind,
    cases: result.facts.cases.length,
    equivalent: count('equivalent'),
    divergent: count('divergent'),
    unevidenced: count('unevidenced'),
    modelDigest: result.facts.modelDigest,
    implementationDigest: result.facts.implementationDigest,
    findings: result.findings.length,
  };
}

/**
 * Run the transition-conformance gate over every declared family's pinned corpus, fold the
 * lean gate, and return the per-family results + the flat findings. The SINGLE reusable entry
 * (the unit test seam mirrors {@link file://./spine-relation-gate.ts}'s `runSpineRelationGate`).
 */
export async function runTransitionConformanceGate(): Promise<{
  readonly results: readonly FamilyResult[];
  readonly findings: readonly Finding[];
}> {
  const results: FamilyResult[] = [];
  for (const law of FAMILY_LAWS) {
    results.push(await runFamily(law));
  }
  const findings = results.flatMap((r) => r.findings);
  return { results, findings };
}

export async function main(): Promise<void> {
  const { results, findings } = await runTransitionConformanceGate();

  const receipts = results.map((r) =>
    familyReceipt(
      FAMILY_LAWS.find((l) => l.family === r.family)!,
      r,
    ),
  );
  const totalCases = receipts.reduce((n, r) => n + r.cases, 0);
  // A deterministic, content-bound receipt (no wall-clock) — the machine-readable evidence.
  const receipt = {
    gate: 'transition-conformance',
    families: receipts,
    totalFamilies: receipts.length,
    totalCases,
    totalFindings: findings.length,
  };
  console.log(JSON.stringify(receipt, null, 2));
  console.log(
    `transition-conformance-gate: folded ${totalCases} pinned bisimulation case(s) across ${receipts.length} reactive family(ies) (${GATE_CORPUS.length} corpus histories) against the CURRENT declared model.`,
  );

  if (findings.length > 0) {
    for (const f of findings) {
      console.error(`  FAIL [${f.severity}] ${f.title}`);
    }
    throw new Error(
      `Transition-conformance gate failed — ${findings.length} bisimulation regression(s): a pinned op history that bisimulated the declared model now DIVERGES on the native transport (or an unevidenced case regressed above its baseline). Replay the named seed against BOTH the reference model (tests/support/reactive-model.ts) and the native primitive, then fix the transport OR — if the divergence is a deliberate new product law — re-pin the declared family law in tests/support/reactive-conformance.ts with review (never a silent widening).`,
    );
  }
  console.log(
    'Transition-conformance gate passed — every declared reactive family bisimulates its current model over the pinned corpus (deliberate EmissionPolicy deltas conformant under their declared tolerance).',
  );
}

if (isDirectExecution(import.meta.url)) {
  void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
