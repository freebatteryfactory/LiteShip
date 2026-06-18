/**
 * Astro dev-toolbar app for the czap boundary inspector.
 *
 * Registered via `addDevToolbarApp` in the integration's
 * `astro:config:setup` hook. Astro mounts this module as the entrypoint
 * of a toolbar icon; clicking the icon toggles the app, and Astro hands
 * `init()` a `canvas` ShadowRoot to render into.
 *
 * The `init(canvas, app, server)` body runs as a normal ES module in the
 * MAIN page realm — `document`/`window` ARE the host page — so the
 * inspector's page-DOM access (`document.querySelectorAll('[data-czap-boundary]')`,
 * `czap:uniform-update` subscriptions, `czap:reinit` dispatch,
 * `document.styleSheets`) all work unchanged. The `canvas` ShadowRoot is
 * a render target, not a JS sandbox. Toggling is owned by Astro
 * (`app.onToggled`); there is no custom hotkey and no custom element.
 *
 * @module
 */

import type { DevToolbarApp } from 'astro';
import { mountInspectorPanel, type InspectorHandle } from './inspector.js';

const app: DevToolbarApp = {
  init(canvas, eventTarget) {
    let handle: InspectorHandle | null = null;

    eventTarget.onToggled(({ state }) => {
      if (state) {
        // Re-mount fresh on every open so the panel reflects the page as it
        // is now (boundaries added/removed since the last open), and tear the
        // prior mount's observers down on close to avoid leaks.
        handle?.dispose();
        canvas.replaceChildren();
        handle = mountInspectorPanel(canvas);
      } else {
        handle?.dispose();
        handle = null;
        canvas.replaceChildren();
      }
    });
  },
};

export default app;
