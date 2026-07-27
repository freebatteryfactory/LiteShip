/**
 * Entry point for the `client:graph` directive: read a serialized
 * {@link DocumentGraph} off `data-liteship-graph` and lower it onto the live cast
 * pipeline via {@link loadGraphRuntime}, resolving each entity to the
 * `[data-liteship-entity="<id>"]` element within the directive root's subtree.
 *
 * The directive owns only the default DOM element-discovery policy (entities are
 * marked with `data-liteship-entity`); programmatic hosts call `loadGraphRuntime`
 * directly with their own resolver. Honors `liteship:teardown` to release observers.
 *
 * @module
 */

import type { ContentAddress } from '@liteship/core';
import { loadGraphRuntime, type GraphRuntimeHandle } from './graph-runtime.js';
import { bootDirectiveEntry } from './directive-bound.js';

/** Resolve an entity id to the `[data-liteship-entity]` element in (or at) the directive root. */
function entityResolver(root: HTMLElement): (entityId: ContentAddress) => HTMLElement | null {
  return (entityId) => {
    // CSS.escape: the id is a content address (hex-ish), but escape defensively —
    // it is graph-supplied, not a fixed literal.
    const selector = `[data-liteship-entity="${CSS.escape(String(entityId))}"]`;
    if (root.matches(selector)) return root;
    return root.querySelector<HTMLElement>(selector);
  };
}

/**
 * Activate the graph directive on `element`. Lowers the serialized graph onto the
 * live runtime and wires teardown; a malformed/missing payload leaves the element
 * inert (the loader returns `null`).
 */
export function initGraphDirective(load: () => Promise<unknown>, element: HTMLElement): void {
  const serialized = element.getAttribute('data-liteship-graph');
  if (!serialized) return;

  let handle: GraphRuntimeHandle | null = loadGraphRuntime(serialized, entityResolver(element));
  // Malformed payload → loader returned null. Stay fully inert, consistent with
  // the missing-payload early return above and the "inert on malformed" contract:
  // do NOT wire dispose or call load() for a graph that never cast.
  if (!handle) return;

  element.addEventListener('liteship:teardown', () => {
    handle?.release();
    handle = null;
  });

  load();
}

/** Astro client directive entry that marks the host before starting the graph runtime. */
export const graphDirective = (load: () => Promise<unknown>, opts: Record<string, unknown>, el: HTMLElement): void => {
  bootDirectiveEntry('graph', load, opts, el, (runtimeLoad, _runtimeOpts, runtimeEl) => {
    initGraphDirective(runtimeLoad, runtimeEl);
  });
};
