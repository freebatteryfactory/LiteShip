/**
 * Dev-mode boundary inspector overlay — BARREL.
 *
 * Visualizes every `[data-czap-boundary]` element, live signal values,
 * threshold tracks with draggable notches, and copy-back snippets. Rendered into
 * a render target (a shadow root) supplied by the host — the Astro dev-toolbar
 * app's `init(canvas)` ShadowRoot in production, an injected `attachShadow` root
 * under test. Toggling is owned by the toolbar app (`app.onToggled`); this module
 * renders panels into whatever root it is handed.
 *
 * The implementation lives in `./inspector/*` along the pure-vs-DOM seam:
 *   - `boundary-edit.ts` — pure LAWS (threshold-rewrite monotonicity, the 0..1
 *     `trackMaxForInput` scale guard) + snippet formatting;
 *   - `dom-probes.ts` — live DOM reads (stylesheet container probe, directive-active);
 *   - `styles.ts` — the shadow-scoped CSS;
 *   - `panel.ts` — stateful per-boundary machinery + the `panelHandles` leak Map;
 *   - `graph-peek.ts` — the content-addressed DocumentGraph peek;
 *   - `mount.ts` — `mountInspectorPanel` + the `InspectorHandle`.
 *
 * This barrel preserves the historical import surface (`mountInspectorPanel`,
 * `InspectorHandle`, and the pure helpers the unit tests pin) so nothing breaks.
 *
 * @module
 */

export { mountInspectorPanel, type InspectorHandle } from './inspector/mount.js';
export {
  containerNameFromInput,
  formatBoundaryMakeSnippet,
  rewriteBoundaryThreshold,
  trackMaxForInput,
} from './inspector/boundary-edit.js';
export { containerNotDeclaredMessage, hasContainerNameDeclared, isDirectiveActive } from './inspector/dom-probes.js';
