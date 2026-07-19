/**
 * Taint facts — the pre-computed, host-built dataflow evidence the
 * {@link taintFlowGate} folds into {@link Finding}s (the TAINT-ANALYSIS family).
 *
 * This module defines the {@link TaintFacts} INTERFACE and nothing else. Like
 * {@link RepoIR}, {@link SupplyChainFacts}, and {@link MutationFacts}, it carries
 * no heavy dependency: `@liteship/gauntlet` stays the lean engine, so it never builds
 * a `ts.Program`, walks a checker, or traces a dataflow graph. A HOST
 * (`@liteship/audit`'s taint oracle, classified by the LiteShip-LOCAL source/sink/
 * sanitizer registry the `@liteship/cli` host injects) does the heavy lifting — trace
 * each value from a SOURCE call to a SINK call argument over the type-checker +
 * symbol references — and hands the engine these flat, already-traced facts. The
 * gate's only job is to FOLD them into Findings at the right (propagated)
 * assurance level (ADR-0012: the lean engine folds facts; the host computes them;
 * the LiteShip policy is host-injected, never baked into the published engine).
 *
 * THE BIG IDEA. An untrusted SOURCE (a shader-source fetch, an AI-cast proposal,
 * a runtime URL) whose value reaches a dangerous SINK (a `shaderSource`/
 * `createShaderModule` compile, an `innerHTML` write, an `applyValidatedPatch`
 * graph-apply, a `fetch`) with NO SANITIZER on the path is an injection/SSRF/
 * untrusted-apply flow — a self-explaining security finding. A SANITIZER on the
 * path (the AI-cast `validateGraphPatchProposal`, the URL `resolveRuntimeUrl`
 * allowlist, an HTML `sanitizeElementTree`) BREAKS the taint: the flow is clean.
 * REPORT-not-DECIDE: the gate reports an UNSANITIZED flow naming the source, the
 * sink, the path, and the missing sanitizer; the human/agent triages — the engine
 * auto-fixes nothing.
 *
 * @module
 */

/**
 * The host-supplied taint evidence over one run. The taint oracle is HEAVY (a
 * whole-corpus `ts.Program` + a checker walk + reference queries), so production
 * runs it OPT-IN (`liteship check --ir --taint`), cached; when the host did not run
 * taint this whole capability is simply ABSENT from the GateContext and the gate
 * is not in the set (no cost, no noise). When present it carries every traced
 * flow plus the depth the trace actually covered — the HONEST under-approximation
 * bound the gate surfaces in its report (a deeper flow the bounded trace cannot
 * follow is NOT claimed clean; it is simply not a fact, and the depth says so).
 */
export interface TaintFacts {
  /** Every traced source→sink flow — the substrate the gate folds. */
  readonly flows: readonly TaintFlow[];
  /**
   * The interprocedural hop depth the oracle's trace actually covered (the honest
   * under-approximation bound). `0` ⇒ intra-procedural only (a source and a sink
   * in the same function body, through direct assignments). `n > 0` ⇒ the trace
   * additionally followed up to `n` call-return / parameter hops. A flow that
   * would only surface at a HIGHER depth is NOT in `flows` and is NOT claimed
   * clean — the gate's report states this bound so "0 unsanitized flows" can never
   * be read as "provably no taint at any depth". Carried as data so the report is
   * self-describing.
   */
  readonly interproceduralDepth: number;
}

/**
 * One traced taint flow — a value that originates at an untrusted SOURCE and
 * reaches a dangerous SINK, with the sanitizer (if any) the trace observed on the
 * path between them. Flat + already-decided (the host did the checker work); the
 * gate reads `sanitizedBy` to decide clean-vs-finding and uses the rest to write a
 * self-explaining Finding.
 *
 * `_tag` is `'taint-flow'` — the discriminant (composition-over-inheritance: a
 * flow is data, differentiated by `_tag`, never a class).
 */
export interface TaintFlow {
  /** The discriminant — a closed tag (this family has one member today). */
  readonly _tag: 'taint-flow';
  /** The SOURCE end — where the untrusted value originates. */
  readonly source: TaintEndpoint;
  /** The SINK end — the dangerous operation the value reaches. */
  readonly sink: TaintEndpoint;
  /**
   * The sanitizer that broke the taint on the path, or `null` for an UNSANITIZED
   * flow (the real finding). When present the flow is clean — the gate reports it
   * only as an informational "sanitized flow" (the genuine green proving the seam
   * is guarded), never a blocking finding.
   */
  readonly sanitizedBy: SanitizerSite | null;
  /**
   * The ordered intermediate path the value took from source to sink — each step
   * the symbol/assignment the trace threaded through. Human-readable, so the
   * reader sees EXACTLY how the value flowed (never an opaque "it reaches it").
   * The first entry is at/after the source; the last is at/before the sink.
   */
  readonly path: readonly TaintPathStep[];
}

/** One end of a flow — a classified call site (the source or the sink). */
export interface TaintEndpoint {
  /**
   * The classified callee NAME the registry matched (e.g. `fetch`, `shaderSource`,
   * `createShaderModule`, `innerHTML`, `applyValidatedPatch`). This is the
   * registry KEY, not a re-derivation — it names WHY this site is a source/sink.
   */
  readonly callee: string;
  /** The repo-relative file — MUST be an IR file (the gate aims its level there). */
  readonly file: string;
  /** 1-based line of the call site (the finding's location). */
  readonly line: number;
  /** A short human description carried from the registry (the WHY of this seam). */
  readonly note: string;
}

/** The sanitizer the trace observed on a path — its callee name + where it sat. */
export interface SanitizerSite {
  /** The sanitizer's classified callee name (e.g. `validateGraphPatchProposal`). */
  readonly callee: string;
  /** The repo-relative file the sanitizer call sits in. */
  readonly file: string;
  /** 1-based line of the sanitizer call. */
  readonly line: number;
}

/** One step on the source→sink path — the symbol the value threaded through. */
export interface TaintPathStep {
  /** The symbol / expression the value was carried by at this step (human label). */
  readonly via: string;
  /** The repo-relative file of this step. */
  readonly file: string;
  /** 1-based line of this step. */
  readonly line: number;
}
