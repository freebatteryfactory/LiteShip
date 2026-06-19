/**
 * The capability axes carved by detection — the single source of truth for the
 * `data-czap-*` capability vocabulary.
 *
 * Each axis is BOTH a public, author-facing CSS-keying attribute on `<html>`
 * (`data-czap-<axis>`) AND a field on `Astro.locals.czap.tiers`. The axis key
 * IS both names, projected through {@link capAxisAttr} as a template literal —
 * so a DOM attribute that disagrees with its locals field is unrepresentable.
 * This is what closes the `data-czap-cap`-vs-`data-czap-tier` drift: one
 * source, projected to the emitter, the locals, and the runtime readers.
 *
 * @module
 */

/**
 * The capability axes, in emit order. The single source of truth: the edge
 * emitter, `Astro.locals.czap.tiers`, and the runtime readers all project from
 * this list, so their names can never drift apart.
 */
export const CAP_AXES = ['tier', 'motion', 'design'] as const;

/**
 * A capability axis — simultaneously the `Astro.locals.czap.tiers` field name
 * and the `data-czap-<axis>` attribute suffix.
 */
export type CapAxis = (typeof CAP_AXES)[number];

/**
 * The `<html>` data-attribute name for a capability axis. The suffix IS the
 * axis key (a template literal), so an attribute name that disagrees with its
 * locals field cannot be constructed.
 */
export function capAxisAttr(axis: CapAxis): `data-czap-${CapAxis}` {
  return `data-czap-${axis}`;
}
