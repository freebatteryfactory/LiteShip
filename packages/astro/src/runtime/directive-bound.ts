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

/** Shared client-directive entry boot: Astro island entries mark the host before initializing runtime code. */
export function bootDirectiveEntry(
  name: DirectiveName,
  load: () => Promise<unknown>,
  opts: Record<string, unknown>,
  element: HTMLElement,
  init: (load: () => Promise<unknown>, opts: Record<string, unknown>, element: HTMLElement) => void,
): void {
  markBound(element, name);
  init(load, opts, element);
}
