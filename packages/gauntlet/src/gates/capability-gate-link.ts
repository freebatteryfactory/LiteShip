/**
 * Gate: capability-gate-link — the fold over the host-supplied {@link CapabilityLinkFacts} (codex
 * round-8, #1b). Proves every sanctioned capability-gated skip's GUARD DERIVES FROM its declared
 * capability's probe, not merely that it is conditional.
 *
 * THE BIG IDEA. The R7 conditionality proof closed `if (true)` (a vacuous guard is no gate), but
 * conditional ≠ gated-BY-THE-DECLARED-capability: an `if (Math.random()) { it.skip("ffmpeg…") }` is a
 * runtime condition unrelated to ffmpeg, and a skip guarded by a wasm probe but LABELED `ffmpeg-absent`
 * is a mislabel. Both pass conditionality. This gate closes them with a dataflow PROOF: the host's
 * linker resolves each guard's symbols through the checker and reports which capability probe it
 * derives from; a skip whose guard derives from NO capability probe, or from the WRONG one, is a
 * finding — a placeholder dressed as a gate, or a mislabel. REPORT-not-DECIDE.
 *
 * LEAN BY CONSTRUCTION (ADR-0012 / D7b): the gate builds NO `ts.Program`, walks NO checker, and names
 * NO LiteShip capability. The HOST (`@liteship/audit`'s capability-link oracle, fed the canonical
 * capability-module SET + the sanctioned sites the `@liteship/cli` host injects) does the linking and
 * injects the flat facts via {@link GateContext.capabilityLink}; this gate only folds. It REQUIRES the
 * facts (capability-link is opt-in: `liteship check gates --ir --capability-gate`) — when absent it is simply not
 * in the set, so there is no Program-over-tests cost on a default run.
 *
 * LEVEL: L4 — a sanctioned skip is a deliberate hole in the test suite; proving it is a genuine
 * capability gate (and not a laundered placeholder) is a trust-spine assurance. The finding's location
 * is the skip site.
 *
 * It ships red / green / mutation fixtures, so it self-proves against the authority ratchet.
 *
 * @module
 */

import { defineGate, requireCapabilityLink, type GateContext, type Gate } from '../gate.js';
import { factAccessEvidenceDigest } from '../verdict-cache.js';
import { finding, type Finding } from '../finding.js';
import { memoryContext } from '../engine.js';
import type { CapabilityLinkFacts, CapabilityLinkResult } from '../facts/capability-link-facts.js';

/** The gate id — namespaces every {@link Finding} it emits (traceability). */
const RULE_NS = 'gauntlet/capability-gate-link';

/** Project ONE unlinked sanctioned skip into a blocking Finding at the skip site. */
function unlinkedFinding(r: CapabilityLinkResult): Finding {
  const derived =
    r.linkedCapabilities.length === 0
      ? 'NO capability probe (the guard is conditional but unrelated to any declared capability — a placeholder dressed as a gate)'
      : `\`${r.linkedCapabilities.join('`, `')}\` — NOT its declared \`${r.declaredCapability}\` (a MISLABEL)`;
  return finding({
    ruleId: `${RULE_NS}/${r.declaredCapability}`,
    severity: 'error',
    level: 'L4',
    title: `Capability-gate not proven: ${r.file}:${r.line} (${r.declaredCapability})`,
    detail: `The sanctioned skip at ${r.file}:${r.line} declares capability \`${r.declaredCapability}\`, but its guard \`${r.guardText || '(none found)'}\` derives from ${derived}. A sanctioned capability-gated skip must DERIVE FROM its declared capability's probe (the canonical capability symbol table) — conditionality alone does not prove the gate is genuine. Route the guard through the canonical capability export (\`${r.declaredCapability}\` camelCased), or correct the declared capability; do not waive the gate.`,
    location: { file: r.file, line: r.line },
    coverageClass: 'symbol-evidenced',
    remediation: {
      kind: 'instruction',
      description: 'Make the skip guard derive from its declared capability probe.',
      steps: [
        `Confirm the skip at ${r.file}:${r.line} is genuinely gated on \`${r.declaredCapability}\` (not a dev-convenience or unrelated condition).`,
        `Reference the canonical capability export for \`${r.declaredCapability}\` in the guard (single-source it in the capability symbol table), then re-run \`liteship check gates --ir --capability-gate\` so the linker re-proves it — fix the guard, never waive.`,
      ],
    },
  });
}

/**
 * The fold: project the injected link results into Findings. ONLY an UNLINKED result is a finding —
 * a linked skip (its guard derives from the declared capability's probe) is genuinely a capability gate
 * and the gate emits NOTHING for it.
 */
function fold(context: GateContext): readonly Finding[] {
  const facts: CapabilityLinkFacts = requireCapabilityLink(context, RULE_NS);
  return facts.results
    .filter((r) => !r.linked)
    .map(unlinkedFinding)
    .sort(
      (a, b) =>
        (a.location?.file ?? '').localeCompare(b.location?.file ?? '') ||
        (a.location?.line ?? 0) - (b.location?.line ?? 0) ||
        a.ruleId.localeCompare(b.ruleId),
    );
}

/** A GateContext carrying a literal CapabilityLinkFacts record (fixture helper). */
function factsContext(facts: CapabilityLinkFacts): GateContext {
  return { ...memoryContext({}), capabilityLink: facts };
}

/** A LINKED result — the guard derives from its declared capability's probe (clean). */
const LINKED: CapabilityLinkResult = {
  file: 'tests/x/ffmpeg.test.ts',
  line: 12,
  declaredCapability: 'ffmpeg-absent',
  linkedCapabilities: ['ffmpeg-absent'],
  linked: true,
  guardText: '!FFMPEG_RENDER_CAPABLE',
};

/** An UNLINKED result — a conditional-but-unrelated guard claiming a capability (the laundering). */
const UNLINKED: CapabilityLinkResult = {
  file: 'tests/x/fake.test.ts',
  line: 7,
  declaredCapability: 'ffmpeg-absent',
  linkedCapabilities: [],
  linked: false,
  guardText: 'Math.random() > 0.5',
};

/** A run with one UNLINKED skip — the red (the gate MUST flag an error finding). */
const RED_FACTS: CapabilityLinkFacts = {
  _tag: 'capability-link-facts',
  definedCapabilities: ['ffmpeg-absent'],
  results: [UNLINKED],
};

/** A run where the skip links to its declared capability — the green (ZERO findings). */
const GREEN_FACTS: CapabilityLinkFacts = {
  _tag: 'capability-link-facts',
  definedCapabilities: ['ffmpeg-absent'],
  results: [LINKED],
};

/**
 * The qualified gate — fixtures included, so it self-proves via the ratchet.
 *
 * - RED: an `if (Math.random())` guard declaring `ffmpeg-absent` → a blocking `error` finding.
 * - GREEN: a guard that derives from the ffmpeg probe → ZERO findings (a genuine gate).
 * - MUTATION: a gate that treats EVERY result as linked (ignores `linked`) folds no finding — it leaves
 *   the red's unlinked skip unflagged, so the mutant fails the red.
 */
export const capabilityGateLinkGate: Gate = defineGate({
  id: RULE_NS,
  level: 'L4',
  describe:
    'Capability-link fold over host-supplied dataflow facts: a sanctioned capability-gated skip whose guard does NOT derive from its declared capability probe (an unrelated runtime condition, or a mislabel) is a blocking finding; a guard that derives from its declared capability is a genuine gate (green). REPORT-not-DECIDE.',
  run: fold,
  // OUT-OF-IR evidence: the injected facts come from an EXTERNAL ts.Program/checker link over the
  // tests corpus (a result flips linked↔unlinked as a guard or the capability table changes), NOT
  // captured by the IR coverage digest. Fold the fact content so the cache refolds on a link change.
  evidenceDigest: (context: GateContext): string | undefined =>
    factAccessEvidenceDigest('capabilityLink', context.capabilityLink),
  fixtures: {
    red: {
      name: 'a sanctioned skip whose if(Math.random()) guard declares ffmpeg-absent but derives from no capability probe',
      context: factsContext(RED_FACTS),
    },
    green: {
      name: 'a sanctioned skip whose guard derives from its declared ffmpeg-absent probe (a genuine gate)',
      context: factsContext(GREEN_FACTS),
    },
    mutation: {
      describe:
        'A gate that ignores `linked` and treats every result as a proven gate (folds no finding) leaves the red fixture unflagged — the mutant must then fail the red.',
      mutate: (gate: Gate): Gate => ({
        ...gate,
        run: (context: GateContext): readonly Finding[] => {
          requireCapabilityLink(context, RULE_NS);
          return [];
        },
      }),
    },
  },
});
