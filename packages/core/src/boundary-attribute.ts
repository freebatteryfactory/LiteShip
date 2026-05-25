/**
 * BoundaryAttribute — the shared policy for which attribute keys may cross the
 * boundary/runtime projection seam (ARIA / data projection).
 *
 * One law, two consumers: `@czap/compiler` filters compiled ARIA attribute maps
 * with it, and `@czap/astro` filters runtime boundary-state attributes with it.
 * Homing it here (both already depend on `@czap/core`, and astro must not depend
 * on the compiler) means the predicate lives in exactly one place instead of
 * two same-shape copies kept in sync by hand. Pure and dependency-free.
 *
 * @module
 */

/**
 * Whether an attribute key may cross the boundary projection seam: any `aria-*`
 * attribute, or the exact `role` key. Case-sensitive, matching the HTML
 * attribute namespace it gates — `ARIA-LABEL` and `roles` are not allowed.
 */
function isAllowedKey(key: string): boolean {
  return key.startsWith('aria-') || key === 'role';
}

/** Shared boundary-attribute policy (ADR-0001 namespace-object style). */
export const BoundaryAttribute = { isAllowedKey } as const;
