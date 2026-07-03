/**
 * The AI-apply SEAM (0.4.0 item D) — apply a VALIDATED graph-patch proposal to a
 * live runtime graph, re-casting only the delta.
 *
 * This is the HOST-SIDE half of the AI primitive, wired onto the runtime graph
 * spine (item B). It exposes two casts, and NOTHING ELSE:
 *
 *   castGraphContext(handle)            : cast OUT — build the model-facing
 *                                         {@link AIContext} from the LIVE graph.
 *   admitGraphPatchProposal(handle, c)  : cast IN  — validate an untrusted
 *                                         candidate against the live graph, and on
 *                                         success apply it + re-cast the delta,
 *                                         advancing the graph the handle reports.
 *
 * THE BOUNDARY THIS MODULE HONORS (the LiteShip rule): "LiteShip teaches graphs
 * how to speak to models; products decide whether model suggestions become
 * action." The thing that CALLS a model and produces the candidate is downstream
 * / out of scope — this module imports ZERO model / provider / credential API. It
 * only BUILDS the context a producer would feed to a model, and ADMITS what a
 * producer hands back.
 *
 * WHY IT CANNOT BE BYPASSED (the token witness): a raw candidate becomes a graph
 * mutation ONLY through `AICast.validateGraphPatchProposal` → `applyValidatedPatch`.
 * `applyValidatedPatch`'s signature DEMANDS a `ValidatedProposal`, which only the
 * validators in `@czap/core`'s ai-cast can MINT (the mint site, `mintValidated`, is
 * NOT re-exported from `@czap/core` — see core's index: "the envelope stays
 * un-forgeable outside the validators"). This seam therefore CANNOT hand the
 * runtime a patch that skipped validation: it must run the validator first to get a
 * proposal, and the validator re-pins `base`, re-seals every node (defeating
 * content-address forgery), and runs the structural preview before minting. We then
 * re-cast through item B's `castGraphDelta` (the SAME delta engine `recast` uses) —
 * NOT through `recast`'s raw `GraphPatch.apply`, which would skip the token witness.
 *
 * ATOMICITY: `validateGraphPatchProposal` + `applyValidatedPatch` run back-to-back
 * with NO `await` between them, so a concurrent graph advance cannot slip a stale
 * base through. `applyValidatedPatch` re-asserts `proposal.base === graph.id` at
 * apply time (the base-guard), so even a proposal validated against a since-advanced
 * graph is rejected cleanly rather than mis-applied.
 *
 * SSR-safe: the cast-out path is pure; the cast-in path drives item B's delta seam,
 * whose observer attachment is itself off-DOM-guarded.
 *
 * @module
 */

import { AICast, verifyAppliedGraph, type AIContext, type CastContextOptions, type DocumentGraph } from '@czap/core';
import { graphRuntimeInternals, type GraphRuntimeHandle } from './graph-runtime.js';

/**
 * Cast OUT: build the model-facing {@link AIContext} from the handle's LIVE graph.
 * Inert — LiteShip never calls a model; this only projects the current graph into
 * the deterministic, content-addressed context a downstream producer would feed to
 * one. The context's `base` (and summary `base`) is `handle.graph.id`, so the model
 * proposes a delta against EXACTLY the graph the host is live on.
 */
export function castGraphContext(handle: GraphRuntimeHandle, opts?: CastContextOptions): AIContext {
  return AICast.castContext(handle.graph, opts);
}

/**
 * The outcome of admitting a candidate patch: `ok: true` with the new (advanced)
 * graph, or `ok: false` with the structured rejection reasons and NO mutation.
 */
export interface AdmitPatchResult {
  readonly ok: boolean;
  /** The new sealed graph, present ONLY on `ok: true` (also reflected by `handle.graph`). */
  readonly graph?: DocumentGraph;
  /** The rejection reasons, present ONLY on `ok: false`. */
  readonly errors?: readonly string[];
}

/**
 * Cast IN: admit an untrusted `candidate` (parsed model output) against the handle's
 * LIVE graph. On success, apply it through the token-witness validation chain and
 * re-cast ONLY the changed entities (item B's delta seam), advancing the graph the
 * handle reports; on any failure, return the reasons and leave the runtime UNCHANGED.
 *
 * THE CHAIN (no path skips validation):
 *   1. `validateGraphPatchProposal(graph, candidate)` — re-pin `base`, re-seal every
 *      node (content-address forgery → corrected, dangling edge → caught), structural
 *      preview, then MINT a `ValidatedProposal`. A forged / malformed / stale-base
 *      candidate never mints.
 *   2. `applyValidatedPatch(graph, proposal)` — DEMANDS the minted proposal (the
 *      unforgeable token witness) AND re-asserts `proposal.base === graph.id` (the
 *      apply-time base-guard). Steps 1–2 are synchronous + adjacent (no `await`), so a
 *      concurrent advance cannot slip a stale base between them.
 *   3. `castGraphDelta(prev, next, …)` — re-cast only the entities the delta touched,
 *      through item B's exported seam, then advance the handle's live graph.
 *
 * Returns `{ ok: false }` (UNCHANGED) when the handle is not a `loadGraphRuntime`
 * handle, when validation rejects, or when the base-guard rejects a stale proposal
 * (surfaced as a clean error string, never an escaping throw).
 */
export function admitGraphPatchProposal(handle: GraphRuntimeHandle, candidate: unknown): AdmitPatchResult {
  const internals = graphRuntimeInternals(handle);
  if (internals === null) {
    return {
      ok: false,
      errors: ['admitGraphPatchProposal: handle is not a loadGraphRuntime handle (no runtime internals).'],
    };
  }

  // Snapshot the live graph ONCE; validate + apply against that exact identity with
  // no await between, so a concurrent advance cannot change the base mid-admission.
  const prev = handle.graph;

  // CAST IN, step 1 — validate the untrusted candidate. Only this can MINT the
  // ValidatedProposal that `applyValidatedPatch` demands; `mintValidated` is not
  // re-exported, so there is no other path to a proposal this seam could apply.
  const checked = AICast.validateGraphPatchProposal(prev, candidate as never);
  if (!checked.ok) {
    return { ok: false, errors: checked.errors };
  }

  // CAST IN, step 2 — apply the validated proposal. The base-guard inside
  // `applyValidatedPatch` enforces `proposal.base === prev.id`; surface its rejection
  // (and any structural throw) cleanly rather than letting it escape into host code.
  let next: DocumentGraph;
  try {
    next = AICast.applyValidatedPatch(prev, checked.proposal);
  } catch (e) {
    return { ok: false, errors: [`applyValidatedPatch rejected the proposal: ${String(e)}`] };
  }

  // CAST IN, step 3 — re-cast ONLY the changed cells through item B's delta seam and
  // advance the graph the handle reports. `advance` runs `castGraphDelta(prev, next)`
  // against the SAME live GraphCastState, then makes `next` current.
  internals.advance(next);

  return { ok: true, graph: next };
}

/**
 * Adopt a SERVER-APPLIED graph onto the live runtime — the channel counterpart of
 * {@link admitGraphPatchProposal}. Where `admit` validates a client-side CANDIDATE PATCH
 * locally, `adopt` takes the full graph a mutation endpoint returned (`status: 'applied'`),
 * re-proves it through the same adopt guard the sender uses (`verifyAppliedGraph` — decode,
 * reseal, id/digest, uniqueness, topology), then re-casts the delta and advances the handle.
 * `value` is `unknown` on purpose: never trust a wire graph, even one you asked for.
 *
 * `advance` runs the runtime's structural delta cast before swapping the handle's graph.
 * The next graph need not descend from the current graph: a missed intervening update is
 * absorbed as a full structural difference and the live cast state advances to the server's
 * applied truth.
 */
export function adoptAppliedGraph(handle: GraphRuntimeHandle, value: unknown): AdmitPatchResult {
  const internals = graphRuntimeInternals(handle);
  if (internals === null) {
    return {
      ok: false,
      errors: ['adoptAppliedGraph: handle is not a loadGraphRuntime handle (no runtime internals).'],
    };
  }
  const verified = verifyAppliedGraph(value);
  if (!verified.ok) {
    return { ok: false, errors: [verified.message] };
  }
  internals.advance(verified.graph);
  return { ok: true, graph: verified.graph };
}
