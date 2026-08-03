/**
 * The seed every EMITTED property assertion pins.
 *
 * THE CLASS RULE — ANCHOR: every `fc.assert` a harness arm writes into a
 * generated suite. ALLOWLIST: this one constant. A generated property that
 * picks a fresh seed per run cannot replay the failure it reports, so its red is
 * a rumour rather than evidence.
 *
 * This exists because the omission was not local. Every emitted BENCH sampler
 * in this directory already pinned `seed: 0x5eed`, while every emitted TEST
 * property pinned only `numRuns` — twelve sites across six arms, each written
 * beside a correct sibling. Twelve independent chances to notice is what a
 * missing authority looks like, so the value is named once here and
 * interpolated, rather than spelled twelve more times.
 *
 * The value is the repository's existing seed idiom. It is a STRING because it
 * is emitted as source text into the generated suite, not evaluated here.
 *
 * @module
 */

/** Emitted source text for the seed pinned by every generated property. */
export const EMITTED_PROPERTY_SEED = '0x5eed';
