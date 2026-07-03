/**
 * Morph-opaque subtrees — structural isolation for self-owned islands.
 *
 * An element marked `data-czap-morph-opaque` is OWNED BY THE CLIENT (CodeMirror, a canvas,
 * a chart lib): the morph engine never syncs its attributes, never descends into its
 * children, and never removes it — even when the server HTML omits it entirely. The
 * attribute is presence-based (any value). Sanitization is NOT skipped: new opaque content
 * arriving via morph still passes the `sanitized-html` policy at parse time — opacity
 * exempts a subtree from DIFFING, never from the trust boundary.
 */
export const ATTR = 'data-czap-morph-opaque';

/** True when `node` is an Element carrying the opaque marker. */
export const isOpaque = (node: Node): node is Element =>
  typeof Element !== 'undefined' && node instanceof Element && node.hasAttribute(ATTR);

export const MorphOpaque = { ATTR, isOpaque } as const;
