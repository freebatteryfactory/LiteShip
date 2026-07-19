/**
 * The COMPOSITION-COVERAGE gate (the LOCAL-VS-GLOBAL correctness family — "locally
 * green, globally untested interaction"). The lean half: it FOLDS the host-injected
 * {@link CompositionFacts} (the interaction edges between individually-tested units,
 * each already classified covered/uncovered) into self-explaining {@link Finding}s,
 * reporting each UNCOVERED composition edge at the edge's (propagated) level.
 *
 * THE BIG IDEA, restated as a gate. Two units can each be individually green — `A`
 * has tests, `B` has tests — while NO integration test exercises the COMPOSITION
 * `A → B` (the call from `A` into `B`). The interaction is locally proven on both
 * sides but globally untested. The host computes (the EXACT definition):
 *
 *   uncovered-composition-edges =
 *     { (A, B) : A calls into B in the IR call graph
 *                AND A is individually tested AND B is individually tested
 *                AND no integration test exercises A and B TOGETHER }
 *
 * THE HONEST LIMIT (carried into every finding). "Exercises A and B together" is a
 * test in whose EXECUTION both endpoints appear. The precise signal is a per-test
 * execution-coverage probe ({@link CoverageEvidence} `execution`); when unavailable
 * the host falls back to the SOUND static proxy — a test that REFERENCES both
 * endpoints (`static-reference`) — and the gate STATES which class decided the
 * verdict. A `static-reference`-covered edge is an OVER-APPROXIMATION of integration
 * coverage (the test names both but may not drive the call), so a "covered" verdict
 * is never read as stronger than the proxy that produced it. The gate reports the
 * edge + its evidence class; it claims only what the host measured.
 *
 * AIM THE CANNON (the severity by level). The severity scales with the edge's
 * EFFECTIVE level — the MORE-CRITICAL of the two endpoints' propagated levels (the
 * {@link propagateAssuranceLevels} fixpoint — THE LAW: from the live IR, never
 * hardcoded), because an untested interaction is as critical as its critical end:
 *   - an L4 uncovered edge → `error` (BLOCKS — the trust spine's interactions must
 *     be integration-tested).
 *   - an L3 uncovered edge → `error`.
 *   - an L2 uncovered edge → `warning`.
 *   - an L1/L0 uncovered edge → `advisory` (calibrating debt).
 *
 * REPORT-not-DECIDE. The gate names the edge (`from → to via symbol`), the level, and
 * the evidence class searched, and reports it; the human/agent writes the integration
 * test that drives `A` through into `B`. The engine picks no winner.
 *
 * It reads the IR for level propagation and folds {@link CompositionFacts}; when the
 * facts are ABSENT it reports an honest advisory "not-evidenced" finding (never a
 * silent green). It {@link requireIR}, so it runs only on the host `--ir` path.
 * Composition over inheritance: a fold + standalone functions, no class.
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
import { maxLevel, type AssuranceLevel } from '../assurance.js';
import type { CompositionFacts, InteractionEdge, CoverageEvidence } from '../facts/composition-facts.js';

/** The gate id — namespaces every finding (traceability). */
const GATE_ID = 'gauntlet/composition-coverage';

/**
 * The severity an UNCOVERED composition edge earns at its effective level — the
 * calibration, exported DATA a downstream owner can redline (sibling to the proof
 * floor + mutation kill-floor matrices). L4/L3 BLOCK; L2 warns; L1/L0 advisory debt.
 */
export const COMPOSITION_SEVERITY_BY_LEVEL: Readonly<Record<AssuranceLevel, Severity>> = {
  L4: 'error',
  L3: 'error',
  L2: 'warning',
  L1: 'advisory',
  L0: 'advisory',
} as const;

/**
 * The effective levels of every file — the {@link propagateAssuranceLevels} fixpoint
 * over the live IR's import graph, glob-floored (THE LAW: from the live IR).
 */
function effectiveLevels(ir: RepoIR): ReadonlyMap<FileId, AssuranceLevel> {
  return propagateAssuranceLevels(ir, (file) => levelOf(file));
}

/** The effective level of one file — the propagated map, or the glob floor if absent. */
function levelForFile(file: FileId, levels: ReadonlyMap<FileId, AssuranceLevel>): AssuranceLevel {
  return levels.get(file) ?? levelOf(file);
}

/**
 * The EDGE'S effective level — the MORE-CRITICAL of its two endpoints' levels. An
 * untested interaction is as critical as its critical end: a call from an L1 helper
 * INTO the L4 content-address kernel is an L4-critical interaction.
 */
function edgeLevel(edge: InteractionEdge, levels: ReadonlyMap<FileId, AssuranceLevel>): AssuranceLevel {
  return maxLevel(levelForFile(edge.fromFile, levels), levelForFile(edge.toFile, levels));
}

/** A human label for the evidence class the host SEARCHED (carried into the finding). */
function evidenceLabel(evidence: CoverageEvidence): string {
  switch (evidence._tag) {
    case 'execution':
      return `precise execution-coverage probe (test \`${evidence.testId}\`)`;
    case 'static-reference':
      return `static-reference over-approximation (test \`${evidence.testId}\` names both endpoints)`;
    case 'none':
      return 'no test references both endpoints at all';
  }
}

/**
 * Build the self-explaining finding for one uncovered composition edge. Names the
 * edge, the level, and the evidence class searched (the honest limit). REPORT-not-
 * DECIDE: the remediation is "write the integration test that drives A through B".
 */
function uncoveredEdgeFinding(edge: InteractionEdge, level: AssuranceLevel): Finding {
  const arrow = `${edge.fromFile} → ${edge.toFile} (via \`${edge.viaSymbol}\`)`;
  return finding({
    ruleId: GATE_ID,
    severity: COMPOSITION_SEVERITY_BY_LEVEL[level],
    level,
    title: `Untested composition edge: ${arrow} (${level})`,
    detail: `${edge.fromFile} calls into ${edge.toFile} (via \`${edge.viaSymbol}\`) and BOTH units are individually tested, but no integration test exercises them TOGETHER (${evidenceLabel(edge.evidence)}). The interaction is locally green on both sides but globally untested — a composition the units' own tests can never cover. This is a STRUCTURAL over-approximation of integration coverage: "covered together" means a single test in whose execution both endpoints appear; the host searched and found ${edge.evidence._tag === 'none' ? 'no such test' : 'no execution evidence'}. The engine reports the edge; you decide whether to add the integration test.`,
    location: { file: edge.fromFile },
    remediation: {
      kind: 'instruction',
      description:
        'Cover the composition edge with an integration test that drives the calling unit through into the called unit.',
      steps: [
        `Write a test that exercises ${edge.fromFile}'s path which CALLS \`${edge.viaSymbol}\` in ${edge.toFile} (not a unit test of either in isolation).`,
        `Assert the COMPOSED behaviour (the result that depends on both ${edge.fromFile} and ${edge.toFile} being correct TOGETHER), so a regression in either endpoint's interaction with the other is caught.`,
        edge.evidence._tag === 'static-reference'
          ? `A test already NAMES both endpoints but no execution probe confirmed it drives the call — verify it actually exercises the interaction, or strengthen it.`
          : `No existing test touches both endpoints — this interaction is entirely uncovered.`,
      ],
    },
  });
}

/** The advisory finding emitted when the host injected NO composition facts (honest under-coverage). */
function notEvidencedFinding(): Finding {
  return finding({
    ruleId: GATE_ID,
    severity: 'advisory',
    level: 'L4',
    title: 'Composition-coverage not evidenced',
    detail:
      'No composition facts were injected, so the untested-interaction analysis could not run — the gate reports this honestly rather than passing silently. A host (the CLI `liteship check --ir --composition` path) derives the interaction edges from the IR call graph, decides which units are individually tested, decides which edges an integration test covers together, and injects CompositionFacts for this gate to fold.',
    remediation: {
      kind: 'instruction',
      description: 'Run the composition-coverage analysis so the untested interactions are evidenced.',
      steps: ['Run `liteship check --ir --composition` so the host builds + injects CompositionFacts.'],
    },
  });
}

/**
 * The shared fold — folds the injected interaction edges. Each UNCOVERED edge
 * (`integrationCovered: false`) → a finding at the edge's effective level; a covered
 * edge produces nothing. Findings are sorted by (from, to, symbol) for determinism.
 */
function foldComposition(context: GateContext): readonly Finding[] {
  const ir = requireIR(context, GATE_ID);
  const facts = context.composition;
  // Absent / empty facts → an honest advisory, never a silent green.
  if (facts === undefined || (facts.edges ?? []).length === 0) {
    return [notEvidencedFinding()];
  }
  const levels = effectiveLevels(ir);
  const findings: Finding[] = [];
  for (const edge of facts.edges ?? []) {
    if (edge.integrationCovered) continue; // the composition is covered together — clean.
    findings.push(uncoveredEdgeFinding(edge, edgeLevel(edge, levels)));
  }
  findings.sort(
    (a, b) => (a.location?.file ?? '').localeCompare(b.location?.file ?? '') || a.title.localeCompare(b.title),
  );
  return findings;
}

// ── Fixtures (in-memory, no host build) ───────────────────────────────────────

/** A {@link GateContext} carrying an in-memory IR + composition facts — for the fixtures. */
function compositionContext(ir: RepoIR, composition: CompositionFacts): GateContext {
  return { ...memoryContext({}), ir, composition };
}

/** A fixtures-only L4 file id (matches the `core/.../brands.ts` L4 glob in the map). */
const L4_FILE = 'packages/core/src/schema/brands.ts';
/** A fixtures-only caller of the L4 file. */
const CALLER = 'packages/core/src/caller.ts';

/** A literal IR carrying the caller + the L4 callee (the caller imports the callee). */
function fixtureIR(): RepoIR {
  return makeRepoIR({
    files: [
      { id: CALLER, contentDigest: PLACEHOLDER_DIGEST, packageName: '@liteship/core' },
      { id: L4_FILE, contentDigest: PLACEHOLDER_DIGEST, packageName: '@liteship/core' },
    ],
    imports: [{ fromFile: CALLER, specifier: './brands.js', kind: 'relative', targetFile: L4_FILE }],
  });
}

/** An interaction edge with the given coverage verdict + evidence. */
function edge(integrationCovered: boolean, evidence: CoverageEvidence): InteractionEdge {
  return { fromFile: CALLER, toFile: L4_FILE, viaSymbol: 'addressOf', integrationCovered, evidence };
}

/**
 * The red/green/mutation fixtures — the authority ratchet's evidence, all in-memory.
 *  - RED: an UNCOVERED L4 interaction edge (both ends tested, no test together) →
 *    ≥1 finding.
 *  - GREEN: the SAME edge but integration-COVERED (an execution probe found both) →
 *    0 findings.
 *  - MUTATION: a mutant gate that ignores `integrationCovered` and reports EVERY edge
 *    fires on the green fixture's covered edge → green dirty → killed.
 */
const FIXTURES = {
  red: {
    name: 'an uncovered L4 composition edge (both units tested, no integration test together)',
    context: compositionContext(fixtureIR(), { edges: [edge(false, { _tag: 'none' })] }),
  },
  green: {
    name: 'the same edge but integration-covered (an execution probe found both endpoints)',
    context: compositionContext(fixtureIR(), {
      edges: [edge(true, { _tag: 'execution', testId: 'tests/integration/brands.test.ts' })],
    }),
  },
  mutation: {
    describe:
      "A mutant gate that ignores the coverage verdict and reports EVERY edge fires on the green fixture's covered edge — green is no longer clean and the mutant is killed.",
    mutate: (gate: Gate): Gate => ({
      ...gate,
      run: (context: GateContext): readonly Finding[] => {
        const ir = requireIR(context, GATE_ID);
        const facts = context.composition;
        if (facts === undefined || (facts.edges ?? []).length === 0) return [notEvidencedFinding()];
        const levels = effectiveLevels(ir);
        // The corruption: emit a finding for EVERY edge (treats covered as uncovered).
        return (facts.edges ?? []).map((e) => uncoveredEdgeFinding(e, edgeLevel(e, levels)));
      },
    }),
  },
} as const;

/**
 * The composition-coverage gate — each UNCOVERED interaction edge between two
 * individually-tested units becomes a self-explaining Finding at the edge's
 * propagated level. REPORT-not-DECIDE. It reads the IR (level propagation) + folds the
 * host-injected CompositionFacts (advisory when absent), so it runs only on the opt-in
 * host `--composition` path. Earns blocking authority via the existing ratchet.
 */
export const compositionCoverageGate: Gate = defineGate({
  id: GATE_ID,
  level: 'L4',
  describe:
    "Reports each uncovered composition edge (A calls B, both individually tested, no integration test exercises them together) at the edge's propagated level. A structural over-approximation of integration coverage, honestly stated. Folds host-injected CompositionFacts. Reports, never decides.",
  run: foldComposition,
  // OUT-OF-IR evidence: the injected CompositionFacts carry the interaction-edge coverage
  // classification derived from an EXTERNAL per-test execution probe / static-reference
  // scan over the TEST corpus (an edge flips covered↔uncovered as an integration test
  // changes), NOT from any IR source byte alone. Fold the fact content so the cache
  // refolds on an edge-coverage change (the soundness keystone for this gate).
  evidenceDigest: (context: GateContext): string | undefined =>
    factAccessEvidenceDigest('composition', context.composition),
  fixtures: FIXTURES,
});
