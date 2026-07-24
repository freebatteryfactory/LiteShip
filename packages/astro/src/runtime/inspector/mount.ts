/**
 * Mount the dev-inspector overlay into a caller-supplied render target.
 *
 * The Astro dev-toolbar app passes its `init(canvas)` ShadowRoot; a jsdom test
 * passes a host's own `attachShadow` root. We render `<style>` + the panel
 * structure into `root` and return a handle whose `refresh()` re-scans
 * `[data-liteship-boundary]` elements and whose `dispose()` drains every wired
 * observer/listener — by iterating the {@link panelHandles} MAP, never the live
 * DOM (a boundary removed before dispose is gone from the query yet still leaks).
 *
 * @module
 */

import { drainPanelHandles, refreshPanels } from './panel.js';
import { styles } from './styles.js';

/** A mounted inspector: refresh re-scans the page; dispose tears down panel observers. */
export interface InspectorHandle {
  /** Re-scan the page and re-render every boundary panel + the graph peek. */
  readonly refresh: () => void;
  /** Disconnect every per-boundary observer/listener registered by the last refresh. */
  readonly dispose: () => void;
}

/**
 * Mount the inspector panel into a caller-supplied render target.
 *
 * The Astro dev-toolbar app passes its `init(canvas)` ShadowRoot; the
 * jsdom browser test passes a host's own `attachShadow` root. We render
 * `<style>` + the panel structure into `root` and return a handle whose
 * `refresh()` re-scans `[data-liteship-boundary]` elements. No global host
 * element is created and no custom element is registered — the render
 * target IS the realm boundary, supplied by Astro's toolbar.
 *
 * @param root - Shadow root (or any element/fragment) to render into.
 */
export function mountInspectorPanel(root: ShadowRoot | DocumentFragment | HTMLElement): InspectorHandle {
  const style = document.createElement('style');
  style.textContent = styles();
  root.appendChild(style);

  const panel = document.createElement('div');
  panel.className = 'panel';

  const header = document.createElement('div');
  header.className = 'header';
  const title = document.createElement('h2');
  title.textContent = 'liteship boundaries';
  header.appendChild(title);

  const body = document.createElement('div');
  body.className = 'body';
  body.dataset.role = 'inspector-body';

  panel.appendChild(header);
  panel.appendChild(body);
  root.appendChild(panel);

  const refresh = (): void => {
    refreshPanels(body);
  };
  refresh();

  return {
    refresh,
    dispose: () => {
      // Tear down every per-boundary observer/listener the last refresh wired.
      for (const child of Array.from(body.children)) {
        child.remove();
      }
      // Iterate the handle map itself, not the live DOM: a boundary removed
      // before dispose is gone from `querySelectorAll('[data-liteship-boundary]')`
      // but its handle (observers/listeners) still sits in `panelHandles` and
      // would leak across remounts. The map is the source of truth for what was
      // wired; drain it fully.
      drainPanelHandles();
    },
  };
}
