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
export type DirectiveName = 'adaptive' | 'stream' | 'llm' | 'worker' | 'gpu' | 'wasm' | 'graph' | 'motion' | 'svg';

/** A client-directive default export: `(load, opts, el)`. */
export type DirectiveEntry = (load: () => Promise<unknown>, opts: Record<string, unknown>, el: HTMLElement) => void;

/** Tracks which directives already initialized an element across re-scans. */
export const BOUND_ATTRIBUTE = 'data-liteship-directive-bound';

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
 * runtime, exactly ONCE per element+directive. Returns without re-initializing when
 * the element is already bound for `name`: both the plain-element scanner and Astro's
 * island hydration route through here, and the stream/LLM/worker/GPU initializers are
 * not idempotent (a second call would open a duplicate EventSource / worker / shader
 * session). Directive COLLISION is detected upstream in the scanner (marker-based, so
 * it fires even for a directive whose own tier gate no-ops before this boot).
 */
export function bootDirectiveEntry(
  name: DirectiveName,
  load: () => Promise<unknown>,
  opts: Record<string, unknown>,
  element: HTMLElement,
  init: (load: () => Promise<unknown>, opts: Record<string, unknown>, element: HTMLElement) => void,
): void {
  if (boundNames(element).has(name)) return;
  markBound(element, name);
  init(load, opts, element);
}
