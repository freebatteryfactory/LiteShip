/**
 * Directive bound-marker primitive -- the leaf shared by the directive-boot
 * scanner (`./directive-boot.ts`) and every client-directive runtime entry.
 *
 * Kept deliberately dependency-free: NO dynamic `import()`, no scanner, no
 * `LOADERS` map. A runtime directive that only needs to mark its host bound
 * imports from HERE, so it does not drag the scanner's code-split directive
 * graph into its bundle. (Regression guard: the e2e stream lib-bundle must
 * stay a single self-contained chunk; importing the scanner made it code-split
 * into 22 chunks the single-file e2e server could not serve. See ADR-0028.)
 *
 * @module
 */

import { Diagnostics } from '@czap/core';

/** Directive names the integration can register, in escalation order. */
export type DirectiveName = 'satellite' | 'stream' | 'llm' | 'worker' | 'gpu' | 'wasm' | 'graph' | 'svg';

/** A client-directive default export: `(load, opts, el)`. */
export type DirectiveEntry = (load: () => Promise<unknown>, opts: Record<string, unknown>, el: HTMLElement) => void;

/** Tracks which directives already initialized an element across re-scans. */
export const BOUND_ATTRIBUTE = 'data-czap-directive-bound';

/** The set of directive names already bound on `element`, read from {@link BOUND_ATTRIBUTE}. */
export function boundNames(element: HTMLElement): Set<string> {
  const raw = element.getAttribute(BOUND_ATTRIBUTE);
  return new Set(raw ? raw.split(/\s+/).filter(Boolean) : []);
}

/** Add `name` to the element's bound-directive set (the scanner's idempotence marker). */
export function markBound(element: HTMLElement, name: DirectiveName): void {
  const names = boundNames(element);
  names.add(name);
  element.setAttribute(BOUND_ATTRIBUTE, [...names].join(' '));
}

/** Remove `name` from the element's bound set so a later re-scan can retry a failed activation. */
export function unmarkBound(element: HTMLElement, name: DirectiveName): void {
  const names = boundNames(element);
  names.delete(name);
  if (names.size === 0) {
    element.removeAttribute(BOUND_ATTRIBUTE);
  } else {
    element.setAttribute(BOUND_ATTRIBUTE, [...names].join(' '));
  }
}

/** Mark an element as already activated for `name`, sharing the scanner's idempotence guard. */
export function markDirectiveBound(element: HTMLElement, name: DirectiveName): void {
  markBound(element, name);
}

/**
 * Shared client-directive entry boot -- marks the host bound and initializes the
 * runtime, exactly ONCE per element+directive.
 *
 * - Idempotence: returns without re-initializing when the element is already bound
 *   for `name`. Both the plain-element scanner and Astro's island hydration route
 *   through here; without this guard, an island that also carries the directive's
 *   implicit attribute would be booted by both, and the stream/LLM/worker/GPU
 *   initializers are not idempotent (a second call opens a duplicate EventSource /
 *   worker / shader session).
 * - Collision: when a DIFFERENT czap directive already claimed the element, warns
 *   once (the boot still proceeds) -- two directives take over one host and one
 *   silently loses.
 */
export function bootDirectiveEntry(
  name: DirectiveName,
  load: () => Promise<unknown>,
  opts: Record<string, unknown>,
  element: HTMLElement,
  init: (load: () => Promise<unknown>, opts: Record<string, unknown>, element: HTMLElement) => void,
): void {
  const claimed = boundNames(element);
  if (claimed.has(name)) return;
  if (claimed.size > 0) {
    // Sort the conflicting names ONCE so the dedup `code` is order-independent.
    const conflicting = [...claimed, name].sort();
    Diagnostics.warnOnce({
      source: 'czap/astro.directive-boot',
      code: `directive-collision:${conflicting.join('+')}`,
      message:
        `Element carries conflicting czap directives (${conflicting.join(', ')}) -- ` +
        `each directive takes over the element, so they collide and one silently loses ` +
        `(e.g. a satellite consumes the node a GPU shader needs). ` +
        `Fix: put each directive on its own element.`,
    });
  }
  markBound(element, name);
  init(load, opts, element);
}
