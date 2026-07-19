/**
 * The validated-model-output envelope — the ONE discipline shared by every AI
 * cast projection target (GraphPatch proposals AND genui GeneratedUITree
 * proposals).
 *
 * THE LOAD-BEARING SECURITY PROPERTY (encoded in the type SHAPE, not just docs):
 * a model's raw output is NEVER directly actionable. The only way to obtain a
 * {@link ValidatedProposal} is through {@link mintValidated}, which this module
 * keeps PRIVATE to validator call-sites: the envelope carries a branded
 * {@link ApplyToken} that no caller can construct (the brand's witness is a
 * unique symbol this module never exports). Therefore "unvalidated model output
 * → mutation" is UNREPRESENTABLE — a host's `apply` step demands a
 * `ValidatedProposal`, and a `ValidatedProposal` can only exist downstream of a
 * passing validation.
 *
 * This is the framework PRIMITIVE half of "AI": LiteShip teaches graphs how to
 * speak to models; products decide whether model suggestions become action. The
 * envelope is the seam between the two — it is what a validator MINTS and what a
 * host's admission layer INSPECTS, but the framework never auto-applies it.
 *
 * The envelope is a pure VALUE: it content-addresses (the same fnv1a∘CanonicalCbor
 * kernel as every other cast) and carries a receipt subject id, so a validated
 * proposal is replayable and citable without re-running the model.
 *
 * @module
 */

import { InvariantViolationError } from '@liteship/error';
import type { ContentAddress } from './brands.js';
import { contentAddressOf } from './content-address.js';
import type { ReceiptSubject } from './receipt.js';

/**
 * The unforgeable witness for {@link ApplyToken}. A REAL, module-private symbol
 * (never exported) keyed into the token — it is what makes the apply token
 * un-constructable outside the validators in this module. Because the symbol
 * itself never escapes the module, no code elsewhere can produce an object with
 * this key, so no code elsewhere can fabricate a `ValidatedProposal`. (A real
 * value, not a `declare const` phantom — the key has to exist at runtime to brand
 * the token, while staying invisible to the rest of the program.)
 */
const ApplyTokenWitness: unique symbol = Symbol('liteship.validated-output.apply-token-witness');

/**
 * A validation-minted, host-authorized apply token. Branded with a private
 * witness so it is impossible to construct except inside {@link mintValidated}.
 * Its value is the content address of the validated payload — so the token both
 * (a) proves validation happened and (b) binds to the EXACT payload validated
 * (a host cannot swap the payload after the token is minted without invalidating
 * the address match; see {@link assertTokenBinds}).
 */
export interface ApplyToken {
  readonly [ApplyTokenWitness]: true;
  /** Content address of the validated payload — the token is bound to THIS payload. */
  readonly subject: ContentAddress;
  /** The projection target the proposal was validated against (diagnostic + routing). */
  readonly target: ProposalTarget;
}

/** The closed set of projection targets a validated proposal can carry. */
export type ProposalTarget = 'graph-patch' | 'generated-ui';

/**
 * A model proposal that has PASSED validation — the only artifact a host's
 * admission layer is allowed to act on. The `token` is the load-bearing field:
 * it cannot be forged (its witness type is private), and it binds to `payload`
 * by content address. `subject` is the receipt subject id (== `token.subject`),
 * surfaced for citation/caching without reaching into the branded token.
 *
 * There is NO public constructor for this type. The framework exposes
 * `apply`-style host steps that CONSUME it, but never a path that produces one
 * from raw model output bypassing validation.
 */
export interface ValidatedProposal<T> {
  readonly _tag: 'ValidatedProposal';
  readonly _version: 1;
  readonly target: ProposalTarget;
  /** The validated payload (a GraphPatch, a GeneratedUINode, …). */
  readonly payload: T;
  /** Content address of the payload — the proposal's stable identity / receipt subject. */
  readonly subject: ContentAddress;
  /** The unforgeable, validation-minted apply authorization. */
  readonly token: ApplyToken;
}

/**
 * Module-private registry of authentically-minted apply tokens. Authenticity is an
 * IDENTITY question (was this exact token minted here?), answered by membership —
 * unforgeable by reflection, unlike an own-property symbol brand. Weak so a token
 * the host drops is GC'd without a leak.
 */
const mintedTokens = new WeakSet<ApplyToken>();

/**
 * Mint a {@link ValidatedProposal}. PRIVATE to validators (not re-exported from
 * the package index): this is the single mint site for the apply token, exactly
 * as `sealGraph`/`makeEntityId` are the single mint sites for their addresses.
 * Validators call this ONLY after their check passes, so the existence of a
 * `ValidatedProposal` is proof a passing validation ran.
 */
export function mintValidated<T>(target: ProposalTarget, payload: T): ValidatedProposal<T> {
  const subject = contentAddressOf({ target, payload });
  const token: ApplyToken = { [ApplyTokenWitness]: true, subject, target };
  // FROZEN so the bound `subject` cannot be mutated in place to re-point a real,
  // registry-member token at a different payload. (Frozen in place so the literal
  // `true`/`1` types are not widened by `Object.freeze`'s return type.)
  Object.freeze(token);
  // Register by IDENTITY in the module-private WeakSet — this, not the own-property
  // witness, is the runtime authenticity proof. The witness symbol's VALUE is
  // reflectable off any real token a consumer holds (`Object.getOwnPropertySymbols`),
  // so a property-based brand can be copied onto a forged object; WeakSet membership
  // cannot — only tokens this function minted are members (and it leaks nothing: no
  // strong reference). The symbol stays on the type as the COMPILE-TIME unforgeable
  // brand; `mintedTokens` is the RUNTIME one.
  mintedTokens.add(token);
  const proposal: ValidatedProposal<T> = { _tag: 'ValidatedProposal', _version: 1, target, payload, subject, token };
  Object.freeze(proposal);
  return proposal;
}

/**
 * Host-side guard: re-derive the payload's content address and assert it matches
 * the token's bound subject. A host's admission layer calls this immediately
 * before applying — it catches any attempt to swap the payload after minting
 * (the token binds to the bytes that were validated, not merely to "some
 * validation happened"). Returns the payload narrowed when bound; throws on
 * mismatch.
 *
 * This is defense-in-depth ON TOP of the unforgeable token: even a correctly
 * minted token cannot be paired with a different payload at apply time.
 *
 * It enforces, at runtime, the same three properties the type encodes:
 *  1. PROVENANCE — the token carries the module-private witness, so it was minted
 *     by {@link mintValidated} (a runtime brand check that backs the type-level
 *     guarantee against a structurally-shaped but un-minted impostor token).
 *  2. TARGET CONSISTENCY — `token.target === proposal.target` (no target/token
 *     divergence routing a payload through the wrong validator's authority).
 *  3. PAYLOAD BINDING — the re-derived content address matches the token subject
 *     (no post-validation payload swap).
 */
export function assertTokenBinds<T>(proposal: ValidatedProposal<T>): T {
  // PROVENANCE by identity: only a token THIS module minted is in the registry. A
  // reflection-forged token (symbol copied off a real token onto a new object) is
  // NOT a member, so it is refused here even though it carries the witness symbol.
  if (!mintedTokens.has(proposal.token)) {
    throw InvariantViolationError(
      'validated-output.token',
      `ValidatedProposal token is not validator-minted (target=${proposal.target}); ` +
        'refusing to surface it for apply.',
    );
  }
  if (proposal.token.target !== proposal.target) {
    throw InvariantViolationError(
      'validated-output.token',
      `ValidatedProposal target mismatch (proposal=${proposal.target}, token=${proposal.token.target}); ` +
        'refusing to surface it for apply.',
    );
  }
  const rederived = contentAddressOf({ target: proposal.target, payload: proposal.payload });
  if (rederived !== proposal.subject || proposal.token.subject !== proposal.subject) {
    throw InvariantViolationError(
      'validated-output.token',
      `ValidatedProposal token does not bind to its payload (target=${proposal.target}). ` +
        'The proposal was altered after validation; refusing to surface it for apply.',
    );
  }
  return proposal.payload;
}

/**
 * The content address (== receipt subject id) of a validated proposal. Exposed
 * so a host can cite/cache a proposal by identity without touching the branded
 * token.
 */
export function proposalSubject<T>(proposal: ValidatedProposal<T>): ContentAddress {
  // Provenance-gated like unwrapValidated/apply: a forged or post-validation-tampered
  // proposal must not surface a citable identity, so re-assert the token binds first.
  assertTokenBinds(proposal);
  return proposal.subject;
}

/**
 * RESOLVED (open question #1 — the generated-UI apply seam). The graph-patch
 * target has a host-authorized framework step (`AICast.applyValidatedPatch`): the
 * framework owns the re-addressing kernel, so it exposes (never invokes) apply.
 * The generated-UI target has NO such framework step — rendering belongs to the
 * host's renderer, and core stays renderer-FREE (the product boundary). So the
 * seam is an `unwrapValidated` ACCESSOR, not a framework-calls-renderer path:
 * the framework hands back the validated payload + asserts the token still binds;
 * the host then calls its OWN renderer with the returned tree.
 *
 * This is the SAME binding guard `AICast.applyValidatedPatch` runs before it
 * mutates — defense-in-depth against a post-validation payload swap — generalized
 * to ANY target. Concretely: `unwrapValidated` is `assertTokenBinds` named for
 * the host's intent (its return value is what you feed your renderer/applier),
 * so there is exactly one un-bypassable door for BOTH targets and the framework
 * never reaches into a renderer it does not own.
 */
export function unwrapValidated<T>(proposal: ValidatedProposal<T>): T {
  return assertTokenBinds(proposal);
}

/**
 * RESOLVED (open question #7 — receipt integration). A full {@link
 * ReceiptEnvelope} is async (it hashes via `crypto.subtle`/SHA-256 inside an
 * `Effect`, exactly like `GraphPatch.receipt`). Folding that into the validators
 * would force `validateGraphPatchProposal`/`validateGeneratedUIProposal` async and
 * pull the whole cast-IN path into Effect — a scope balloon for no extra safety,
 * since the envelope's unforgeability already lives in the apply token, not a
 * receipt.
 *
 * Instead we wire the SMALL, real, SYNCHRONOUS integration that composes cleanly:
 * a `ValidatedProposal` already carries a content-address `subject` (the fnv1a∘
 * CanonicalCbor identity — the same kernel `GraphPatch.receipt` subject-keys its
 * envelope on via `{ type: 'artifact', id }`). This derives the EXACT
 * {@link ReceiptSubject} a host would mint a receipt against, so a host can chain
 * the proposal into its receipt DAG WITHOUT re-running the model and without core
 * taking on the async hashing path. The full `ReceiptEnvelope` mint stays a
 * host-side step (the host owns timestamps/`previous`/chain authority — the
 * product boundary), seeded by this subject. That is the next step, not a stub:
 * the citable identity is real and pinned (see the content-address-subject law in
 * the capsule + unit tests).
 */
export function proposalReceiptSubject<T>(proposal: ValidatedProposal<T>): ReceiptSubject {
  // Provenance-gated: a host chaining a receipt must not derive a subject from a forged
  // or post-validation-tampered proposal. Run the same binding check apply/unwrap use.
  assertTokenBinds(proposal);
  return { type: 'artifact', id: proposal.subject };
}
