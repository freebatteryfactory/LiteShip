/**
 * Gate: taint-flow — the TAINT-ANALYSIS family fold over the host-supplied
 * {@link TaintFacts} (untrusted SOURCE → dangerous SINK dataflow).
 *
 * THE BIG IDEA. An untrusted value (a fetched shader source, an AI-cast graph
 * proposal, a runtime URL, a file/env read) that reaches a dangerous operation (a
 * `shaderSource`/`createShaderModule` compile, an `innerHTML` write, an
 * `applyValidatedPatch` graph-apply, a `fetch`) with NO sanitizer between them is
 * an injection / SSRF / untrusted-apply flow — a real security finding. A
 * sanitizer on the path (the AI-cast `validateGraphPatchProposal`, the URL
 * `resolveRuntimeUrl` allowlist, an HTML `sanitizeElementTree`) BREAKS the taint:
 * the flow is clean, reported only informationally (the genuine green proving the
 * seam is guarded). This gate is REPORT-not-DECIDE: an unsanitized flow becomes a
 * Finding naming the source, the sink, the path, and the missing sanitizer; the
 * human/agent triages — the gate auto-fixes nothing.
 *
 * LEAN BY CONSTRUCTION (ADR-0012 / D7b): the gate builds NO `ts.Program`, walks NO
 * checker, and references NO LiteShip-specific source/sink name. The HOST
 * (`@czap/audit`'s taint oracle, classified by the LiteShip-LOCAL registry the
 * `@czap/cli` host injects) traces the flows and injects them via
 * {@link GateContext.taint}; this gate only folds. The gate REQUIRES the facts
 * (taint is opt-in: `czap check --ir --taint`) — when absent it is simply not in
 * the set, so there is no whole-corpus trace cost and no noise on a default run.
 *
 * LEVEL: the gate's base level is L4 (the trust-spine seams — shader compile,
 * graph-apply — are the avionics-tier sinks). A finding's location is the SINK
 * site, so the engine's effective-level propagation can ELEVATE it to the sink
 * file's propagated assurance level. An unsanitized flow into a trust-spine sink
 * is an `error`; a sanitized flow is an `advisory` informational record.
 *
 * It ships red / green / mutation fixtures, so it self-proves against the
 * authority ratchet.
 *
 * @module
 */

import { defineGate, requireTaint, type GateContext, type Gate } from '../gate.js';
import { injectedFactEvidenceDigest } from '../verdict-cache.js';
import { finding, type Finding } from '../finding.js';
import { memoryContext } from '../engine.js';
import type { TaintFacts, TaintFlow } from '../taint-facts.js';

/** The gate id — namespaces every {@link Finding} it emits (traceability). */
const RULE_NS = 'gauntlet/taint-flow';

/** Render the ordered source→sink path as a human trail (never an opaque blob). */
function renderPath(flow: TaintFlow): string {
  const steps = flow.path.map((s) => `${s.via} (${s.file}:${s.line})`);
  // The endpoints anchor the trail even when the intermediate path is empty (a
  // direct source-argument-to-sink flow in one expression).
  const head = `${flow.source.callee} (${flow.source.file}:${flow.source.line})`;
  const tail = `${flow.sink.callee} (${flow.sink.file}:${flow.sink.line})`;
  return [head, ...steps, tail].join(' → ');
}

/** Project ONE unsanitized flow into a blocking Finding at the sink's level. */
function unsanitizedFinding(flow: TaintFlow): Finding {
  const trail = renderPath(flow);
  return finding({
    ruleId: `${RULE_NS}/${flow.source.callee}-to-${flow.sink.callee}`,
    severity: 'error',
    // The base level is the trust-spine tier; the engine elevates to the sink
    // file's PROPAGATED effective level when higher (the finding's location is the
    // sink site, so propagation aims criticality at the real assurance of the sink).
    level: 'L4',
    title: `Unsanitized taint flow: ${flow.source.callee} → ${flow.sink.callee}`,
    detail: `An untrusted value from \`${flow.source.callee}\` (${flow.source.note}) at ${flow.source.file}:${flow.source.line} reaches the dangerous sink \`${flow.sink.callee}\` (${flow.sink.note}) at ${flow.sink.file}:${flow.sink.line} with NO sanitizer on the path. Trail: ${trail}. This is a source→sink flow the taint oracle traced and found UNSANITIZED — an injection / SSRF / untrusted-apply seam. The engine reports; you triage.`,
    // Locate the finding at the SINK — that is the dangerous operation, and the
    // propagation map keys on the sink file's assurance level.
    location: { file: flow.sink.file, line: flow.sink.line },
    coverageClass: 'symbol-evidenced',
    remediation: {
      kind: 'instruction',
      description: 'Break the taint by sanitizing the untrusted value before the sink.',
      steps: [
        `Confirm the value from \`${flow.source.callee}\` at ${flow.source.file}:${flow.source.line} is genuinely untrusted (network / AI / config / env / file input).`,
        `Insert a sanitizer (a validator / allowlist / integrity check) on the path before \`${flow.sink.callee}\` at ${flow.sink.file}:${flow.sink.line}, then re-run the taint oracle so the flow re-traces as sanitized — fix the flow, never waive the gate.`,
      ],
    },
  });
}

/**
 * The fold: project the injected taint flows into Findings. ONLY an UNSANITIZED
 * flow is a finding — a sanitized flow is genuinely clean (the taint is broken) and
 * the gate emits NOTHING for it (the green floor is "no finding"; the sanitized
 * seams are surfaced informationally by the HOST report off the same facts, never
 * as gate findings that would muddy the false-positive floor).
 */
function fold(context: GateContext): readonly Finding[] {
  const facts: TaintFacts = requireTaint(context, RULE_NS);
  const findings: Finding[] = [];
  for (const flow of facts.flows) {
    if (flow.sanitizedBy === null) findings.push(unsanitizedFinding(flow));
  }
  // Deterministic order — by sink location, then source — so the report is
  // byte-stable regardless of the host's flow iteration order.
  return findings.sort(
    (a, b) =>
      (a.location?.file ?? '').localeCompare(b.location?.file ?? '') ||
      (a.location?.line ?? 0) - (b.location?.line ?? 0) ||
      a.ruleId.localeCompare(b.ruleId),
  );
}

/** A GateContext carrying a literal TaintFacts record (fixture helper). */
function factsContext(facts: TaintFacts): GateContext {
  return { ...memoryContext({}), taint: facts };
}

/** A fixtures-only unsanitized flow — a fetched shader source into a compile sink. */
const UNSANITIZED_FLOW: TaintFlow = {
  _tag: 'taint-flow',
  source: {
    callee: 'fetch',
    file: 'packages/x/src/gpu.ts',
    line: 40,
    note: 'a network fetch of shader source — untrusted',
  },
  sink: {
    callee: 'createShaderModule',
    file: 'packages/x/src/gpu.ts',
    line: 88,
    note: 'WGSL shader compilation — an injection sink',
  },
  sanitizedBy: null,
  path: [{ via: 'wgslSource', file: 'packages/x/src/gpu.ts', line: 41 }],
};

/** A fixtures-only sanitized flow — the same shape, but with a sanitizer on the path. */
const SANITIZED_FLOW: TaintFlow = {
  _tag: 'taint-flow',
  source: {
    callee: 'fetch',
    file: 'packages/x/src/gpu.ts',
    line: 40,
    note: 'a network fetch of shader source — untrusted',
  },
  sink: {
    callee: 'createShaderModule',
    file: 'packages/x/src/gpu.ts',
    line: 88,
    note: 'WGSL shader compilation — an injection sink',
  },
  sanitizedBy: { callee: 'resolveRuntimeUrl', file: 'packages/x/src/gpu.ts', line: 35 },
  path: [{ via: 'allowedUrl', file: 'packages/x/src/gpu.ts', line: 36 }],
};

/** A run with one UNSANITIZED flow — the red (the gate MUST flag an error finding). */
const RED_FACTS: TaintFacts = { flows: [UNSANITIZED_FLOW], interproceduralDepth: 2 };

/** A run with one SANITIZED flow — the green (the gate MUST emit no error finding). */
const GREEN_FACTS: TaintFacts = { flows: [SANITIZED_FLOW], interproceduralDepth: 2 };

/**
 * The qualified gate — fixtures included, so it self-proves via the ratchet.
 *
 * - RED: an unsanitized fetch→createShaderModule flow → a blocking `error` finding.
 * - GREEN: the same flow sanitized by `resolveRuntimeUrl` → ZERO findings (the taint
 *   is broken — the seam is guarded, so there is nothing to report).
 * - MUTATION: a gate that treats EVERY flow as clean (ignores `sanitizedBy`) folds
 *   no finding at all — it leaves the red's unsanitized flow unflagged, so the mutant
 *   fails the red (it can no longer catch the known-bad flow).
 */
export const taintFlowGate: Gate = defineGate({
  id: RULE_NS,
  level: 'L4',
  describe:
    'TAINT-ANALYSIS fold over host-supplied source→sink dataflow facts: an untrusted SOURCE (fetched shader source, AI-cast proposal, runtime URL, file/env) reaching a dangerous SINK (shader compile, innerHTML, graph-apply, fetch) with NO sanitizer is a blocking flow; a sanitized flow is the guarded-seam green. REPORT-not-DECIDE.',
  run: fold,
  // OUT-OF-IR evidence: the injected TaintFacts come from an EXTERNAL whole-corpus
  // ts.Program dataflow trace (a flow flips sanitized↔unsanitized as the registry /
  // corpus changes), NOT captured by the IR coverage digest alone. Fold the fact
  // content so the cache refolds on a flow change (the soundness keystone for this gate).
  evidenceDigest: (context: GateContext): string | undefined => injectedFactEvidenceDigest('taint', context.taint),
  fixtures: {
    red: {
      name: 'a run with an unsanitized fetch → createShaderModule shader-injection flow',
      context: factsContext(RED_FACTS),
    },
    green: {
      name: 'a run where the fetch → createShaderModule flow is sanitized by resolveRuntimeUrl (guarded seam)',
      context: factsContext(GREEN_FACTS),
    },
    mutation: {
      describe:
        'A gate that ignores `sanitizedBy` and treats every flow as already clean (folds no unsanitized finding) leaves the red fixture unflagged — the mutant must then fail the red.',
      mutate: (gate: Gate): Gate => ({
        ...gate,
        // Mutant: pretend every traced flow is already sanitized — never emit the
        // unsanitized (blocking) finding. A toothless fold the red must kill.
        run: (context: GateContext): readonly Finding[] => {
          requireTaint(context, RULE_NS);
          return [];
        },
      }),
    },
  },
});
