/**
 * THE SPINE-RELATION GATE — the two-axis public-contract drift proof (Wave 8.5, #156) run
 * OVER THE REAL REPO.
 *
 * Sibling of {@link file://./standards-integrity-gate.ts} / {@link file://./capability-gate.ts}
 * and `plumb:gate`: the CONSTITUTION / public-surface INTEGRITY family. The `spineRelationGate`
 * fold is exercised in unit tests with INJECTED facts (`tests/unit/audit/spine-relation.test.ts`)
 * — that proves the fold; but a gate nothing runs over the real repo is a hole. This script
 * closes it: it builds the SAME {@link SpineRelationFacts} the production `liteship check --ir
 * --spine-relation` path builds (the host probes each admitted `@liteship/_spine` mirror type's
 * bidirectional assignability against its runtime source via a `ts.Program`/checker, classified
 * against the LiteShip-LOCAL {@link LITESHIP_SPINE_ADMISSIONS}) and reds on any mirror whose
 * OBSERVED relation no longer satisfies its ADMITTED (frozen) relation — or no longer resolves.
 *
 * Why a standalone phase (not folded into `gauntlet:full`'s default `liteship check --ir`): the
 * avionics IR gates (taint/mutate/…) are opt-in and NOT CI-wired, and the spine probe is a
 * SECOND `ts.Program` build (~3.25s) too heavy for the default `--ir` run — but it belongs to
 * the constitution-integrity family (`standards:gate` / `capability:gate`) that IS CI-gating,
 * so it runs HERE, next to them, as its own `ts.Program` phase, guaranteeing the L4 public-
 * contract check runs on every PR (reachable, never fixture-only). The equivalent opt-in path
 * is `liteship check --ir --spine-relation`.
 *
 * FAIL-CLOSED: an UNRESOLVED admitted mirror (a renamed/removed type) is a failing result, never
 * a silent drop, so the gate proves the WHOLE admission table or reds.
 *
 * @module
 */

import { repoRoot } from '../vitest.shared.js';
import { buildSpineRelationFacts } from '../packages/audit/src/index.js';
import { spineRelationGate, memoryContext, type Finding } from '../packages/gauntlet/src/index.js';
import { LITESHIP_SPINE_ADMISSIONS } from '../packages/cli/src/lib/spine-relation-policy.js';
import { isDirectExecution } from './audit/shared.js';

/** Build the spine-relation facts over `root` through the production admission table, then fold the gate. */
export function runSpineRelationGate(root = repoRoot): {
  readonly admissions: number;
  readonly findings: readonly Finding[];
} {
  const facts = buildSpineRelationFacts(LITESHIP_SPINE_ADMISSIONS, root);
  const findings = spineRelationGate.run({ ...memoryContext({}), spineRelation: facts });
  return { admissions: facts.observations.length, findings };
}

export function main(root = repoRoot): void {
  const { admissions, findings } = runSpineRelationGate(root);
  console.log(
    `spine-relation-gate: probed ${admissions} admitted @liteship/_spine mirror type(s) against their runtime sources (bidirectional assignability).`,
  );
  if (findings.length > 0) {
    for (const f of findings) {
      console.error(`  FAIL [${f.severity}] ${f.title}`);
    }
    throw new Error(
      `Spine-relation gate failed — ${findings.length} public-contract drift(s): an admitted mirror whose observed relation no longer satisfies its admitted (frozen) relation, or a mirror that no longer resolves. Fix the \`_spine/*.d.ts\` mirror to restore the admitted relation, or — if the runtime surface deliberately changed — re-admit the new relation in packages/cli/src/lib/spine-relation-policy.ts with review (never a silent widening).`,
    );
  }
  console.log('Spine-relation gate passed — every admitted mirror conforms to its frozen two-axis relation.');
}

if (isDirectExecution(import.meta.url)) {
  main();
}
