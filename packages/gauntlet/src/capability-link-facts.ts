/**
 * CAPABILITY-LINK FACTS — the host-computed proof that every sanctioned capability-gated skip's GUARD
 * DERIVES FROM its declared capability's probe (codex round-8, #1b). Generic FACTS the lean engine
 * folds; the heavy `ts.Program`/checker dataflow that produces them lives in `@liteship/audit`'s
 * capability-link oracle, injected via `GateContext.capabilityLink` (the ADR-0012 / D7b boundary —
 * the lean gauntlet carries no `typescript`).
 *
 * THE PROOF MODEL (the "linker"). Each capability is DEFINED ONCE as an export of a canonical
 * capability symbol-table module (`tests/helpers/capabilities.ts` / `.browser.ts` / `ffmpeg.ts`),
 * the export NAME being the capability id (camelCase ↔ kebab). The oracle resolves each sanctioned
 * skip's guard condition through the checker and asks: does the guard's symbol-closure reach the
 * probe symbols of the capability it DECLARES? `linkedCapabilities` is the set of capability ids the
 * guard derives from; `linked` is `declaredCapability ∈ linkedCapabilities`. An `if (Math.random())`
 * guard reaches NO capability probe → `linked: false` → a finding: a placeholder dressed as a gate.
 *
 * @module
 */

/** One sanctioned-skip link result — the guard's resolved capability derivation vs what it declares. */
export interface CapabilityLinkResult {
  /** Repo-relative file of the sanctioned skip. */
  readonly file: string;
  /** 1-based line of the skip. */
  readonly line: number;
  /** The capability id the skip's `SANCTIONED_SKIPS` entry DECLARES (e.g. `ffmpeg-absent`). */
  readonly declaredCapability: string;
  /** The capability ids the guard's dataflow actually DERIVES FROM (via the canonical probe symbols). */
  readonly linkedCapabilities: readonly string[];
  /** True iff the declared capability is among the derived ones — the guard genuinely gates on it. */
  readonly linked: boolean;
  /** The guard source text (for the finding's self-explanation); empty when no guard was found. */
  readonly guardText: string;
}

/** The flat facts the `capabilityGateLinkGate` folds — one result per sanctioned skip site. */
export interface CapabilityLinkFacts {
  readonly _tag: 'capability-link-facts';
  /** The canonical capability ids the symbol table defines (export-name-derived) — for self-description. */
  readonly definedCapabilities: readonly string[];
  /** Per sanctioned-skip link results. */
  readonly results: readonly CapabilityLinkResult[];
}
