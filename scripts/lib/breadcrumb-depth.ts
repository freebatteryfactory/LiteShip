/**
 * Breadcrumb-depth rewrite for the experimental sharded TypeDoc build (#142).
 *
 * The sharded builder (`scripts/build-api-docs.ts`, `docs:build:sharded` — NOT
 * wired to `docs:build`/`docs:check`) emits each package with a doubled
 * `<pkg>/<pkg>/src` prefix, then FLATTENS it to `<pkg>/src` to match the caged
 * monolith layout. Flattening relocates every page UP one directory level, but
 * TypeDoc had already written the page's breadcrumb links (`[LiteShip](../../…/
 * modules.md)`, `[**LiteShip**](../../…/README.md)`) with the `../`-depth of the
 * DOUBLED tree — so after the move those links over-climb by one level and 404.
 *
 * This module is the pure, unit-tested core of the fix: given a page's markdown
 * and its depth below the (post-flatten) `src` root, it decrements the leading
 * `../` run of links that ESCAPE the relocated `src` subtree — the ones pointing
 * at the shard root — while leaving links that stay within `src` (which moved
 * together with the page) untouched. Kept as a separate module so the FS walk in
 * `build-api-docs.ts` can import it without that script's `void main()` running
 * on import; the script itself stays experimental and unwired.
 *
 * @module
 */

/** `](` followed by one or more `../` segments — a relative markdown link that climbs at least one level. */
const RELATIVE_LINK_RE = /\]\((\.\.\/)+/g;

/**
 * Rewrite the breadcrumb `../`-depth of a single markdown page that the flatten
 * stage relocated UP by `levelsRemoved` directory levels.
 *
 * A relative link whose leading `../` run is DEEPER than the page's own
 * `depthBelowSrc` climbs above the `src` subtree: its target did not move with
 * the page, so its prefix is now `levelsRemoved` too deep and is trimmed. A link
 * whose run is `<= depthBelowSrc` resolves within `src` (both endpoints moved by
 * the same amount) and is left exactly as TypeDoc wrote it.
 *
 * @param content       the page's markdown
 * @param depthBelowSrc how many directory levels the page sits below its `src` root (0 = directly in `src`)
 * @param levelsRemoved how many levels the flatten collapsed (the inner `<pkg>` segment ⇒ 1)
 */
export function rewriteBreadcrumbDepth(content: string, depthBelowSrc: number, levelsRemoved = 1): string {
  if (depthBelowSrc < 0) throw new Error(`rewriteBreadcrumbDepth: depthBelowSrc must be >= 0 (got ${depthBelowSrc})`);
  return content.replace(RELATIVE_LINK_RE, (match) => {
    const upCount = (match.match(/\.\.\//g) ?? []).length;
    // Only links that escape the moved `src` subtree change depth.
    if (upCount <= depthBelowSrc) return match;
    const kept = Math.max(upCount - levelsRemoved, 0);
    return `](${'../'.repeat(kept)}`;
  });
}
