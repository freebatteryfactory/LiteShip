/**
 * GPU renderer → tier classification patterns — the SINGLE source of truth.
 *
 * These regex groups are consumed in two places that MUST never diverge:
 *
 *   1. {@link classifyGPURenderer} (`detect.ts`) — the runtime classifier the
 *      `@czap/detect` sweep and capsule/edge consumers call.
 *   2. The `@czap/astro` head-inline GPU probe — which cannot `import` at
 *      runtime (it runs in the document `<head>` before any module graph
 *      exists), so its classifier script is GENERATED from these same patterns
 *      by {@link emitDetectUpgradeScript} (`head-probe.ts`).
 *
 * Because both derive from this one array, a hand-copy is structurally
 * impossible: there is no second list of patterns to type. A prior release
 * (0.2.3 "detect-ladder") shipped a real drift bug from exactly such a
 * hand-copy; the cure is to have one datum, not two texts.
 *
 * @module
 */

import type { GPUTier } from './detect.js';

/**
 * Regex groups indexed by the {@link GPUTier} they classify (`0`..`3`).
 * Each entry is the set of unmasked-renderer-string fragments that mark a
 * device as that tier. The fragments are unanchored and group-free, so the
 * head-probe emitter can safely fold a group into a single `a|b|c` alternation
 * with identical match semantics to testing each pattern in turn.
 */
export const GPU_TIER_PATTERNS: readonly [readonly RegExp[], readonly RegExp[], readonly RegExp[], readonly RegExp[]] =
  [
    // Tier 0 — software / virtualized.
    [/swiftshader/i, /llvmpipe/i, /software/i, /virtualbox/i, /vmware/i, /microsoft basic/i],
    // Tier 1 — integrated.
    [
      /intel.*hd/i,
      /intel.*uhd/i,
      /intel.*iris/i,
      /mali-[gt][0-9]/i,
      /adreno.*[0-3][0-9]{2}/i,
      /powervr/i,
      /apple gpu/i,
    ],
    // Tier 2 — mid-range.
    [
      /adreno.*[4-5][0-9]{2}/i,
      /mali-g[0-9]{2}/i,
      /geforce.*[0-9]{3}m/i,
      /geforce.*mx/i,
      /radeon.*rx\s*[0-5][0-9]{2}/i,
      /radeon.*vega/i,
      /intel.*arc/i,
      /apple.*m[12]/i,
    ],
    // Tier 3 — discrete high-end.
    [
      /geforce.*rtx/i,
      /radeon.*rx\s*[6-9][0-9]{2,}/i,
      /radeon.*rx\s*7[0-9]{3}/i,
      /apple.*m[3-9]/i,
      /adreno.*[6-9][0-9]{2}/i,
      /mali-g[7-9][0-9]/i,
      /nvidia.*a[0-9]{3,}/i,
    ],
  ] as const;

/**
 * The order tiers are tested in, highest-fidelity-overlap first. A renderer
 * can match multiple groups (e.g. an "RTX" string also contains "geforce");
 * resolving most-specific (3) before mid (2) before integrated (1) — with
 * software (0) first as an absolute override — is the canonical precedence
 * both the runtime classifier and the emitted head-probe follow.
 */
export const GPU_TIER_PRECEDENCE: readonly GPUTier[] = [0, 3, 2, 1] as const;

/** The tier an unmatched renderer falls back to (integrated, conservative). */
export const GPU_TIER_DEFAULT: GPUTier = 1;
