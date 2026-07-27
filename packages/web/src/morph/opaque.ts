/**
 * Morph-opaque subtrees — structural isolation for self-owned islands.
 *
 * An element marked `data-liteship-morph-opaque` is OWNED BY THE CLIENT (CodeMirror, a canvas,
 * a chart lib): the morph engine never syncs its attributes, never descends into its
 * children, and never removes it — even when the server HTML omits it entirely. The
 * attribute is presence-based (any value). Sanitization is NOT skipped: new opaque content
 * arriving via morph still passes the `sanitized-html` policy at parse time — opacity
 * exempts a subtree from DIFFING, never from the trust boundary.
 */
export const ATTR = 'data-liteship-morph-opaque';

/** True when `node` is an Element carrying the opaque marker. */
export const isOpaque = (node: Node): node is Element =>
  typeof Element !== 'undefined' && node instanceof Element && node.hasAttribute(ATTR);

/**
 * True when `el`'s SUBTREE (excluding `el` itself) contains an opaque element. The removal
 * path uses this to extend L2 to ancestors: removing a container would cascade-destroy the
 * island inside it, so the container is preserved along with the island.
 */
export const containsOpaque = (el: Element): boolean => el.querySelector(`[${ATTR}]`) !== null;

/** Namespace bundle for the morph-opaque marker (house pattern, like `SemanticId`). */
export const MorphOpaque = { ATTR, isOpaque, containsOpaque } as const;
