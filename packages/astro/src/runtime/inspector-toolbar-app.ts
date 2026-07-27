/**
 * Astro dev-toolbar app for the liteship boundary inspector.
 *
 * Registered via `addDevToolbarApp` in the integration's
 * `astro:config:setup` hook. Astro mounts this module as the entrypoint
 * of a toolbar icon; clicking the icon toggles the app, and Astro hands
 * `init()` a `canvas` ShadowRoot to render into.
 *
 * The `init(canvas, app, server)` body runs as a normal ES module in the
 * MAIN page realm — `document`/`window` ARE the host page — so the
 * inspector's page-DOM access (`document.querySelectorAll('[data-liteship-boundary]')`,
 * `liteship:uniform-update` subscriptions, `liteship:reinit` dispatch,
 * `document.styleSheets`) all work unchanged. The `canvas` ShadowRoot is
 * a render target, not a JS sandbox. Toggling is owned by Astro
 * (`app.onToggled`); there is no custom hotkey and no custom element.
 *
 * @module
 */

import type { DevToolbarApp } from 'astro';
import { mountInspectorPanel, type InspectorHandle } from './inspector.js';

interface ToolbarRuntime {
  readonly dispose: () => void;
}

const toolbarRuntimes = new WeakMap<object, ToolbarRuntime>();

function routeIsExcluded(): boolean {
  return (window as Window & { __LITESHIP_OFF__?: boolean }).__LITESHIP_OFF__ === true;
}

const app: DevToolbarApp = {
  init(canvas, eventTarget) {
    toolbarRuntimes.get(canvas)?.dispose();
    let handle: InspectorHandle | null = null;
    let open = false;

    const unmount = (): void => {
      handle?.dispose();
      handle = null;
      canvas.replaceChildren();
    };

    const reconcile = (): void => {
      unmount();
      if (open && !routeIsExcluded()) handle = mountInspectorPanel(canvas);
    };

    const afterSwap = (): void => reconcile();
    document.addEventListener('astro:after-swap', afterSwap);

    const runtime: ToolbarRuntime = {
      dispose() {
        document.removeEventListener('astro:after-swap', afterSwap);
        window.removeEventListener('pagehide', runtime.dispose);
        unmount();
      },
    };
    window.addEventListener('pagehide', runtime.dispose, { once: true });
    toolbarRuntimes.set(canvas, runtime);

    eventTarget.onToggled(({ state }) => {
      open = state;
      // Re-mount fresh on every open/swap so the panel reflects the current
      // page, but excluded routes never inspect or retain page-DOM observers.
      reconcile();
    });
  },
};

export default app;
