/**
 * Directive boot scanner -- activates czap client directives on plain
 * HTML elements and `.astro` component output.
 *
 * Astro's `addClientDirective` API only fires custom `client:*`
 * directives on framework-component islands; on plain elements the
 * attribute serializes verbatim into the HTML and nothing runs, and on
 * `.astro` components it vanishes entirely. czap's island primitive is
 * a plain annotated div (see `Satellite.astro`), so the integration
 * injects this scanner on every page to activate directive markers the
 * Astro runtime never sees.
 *
 * Two marker forms are scanned:
 *
 * - `data-czap-directive="satellite"` -- the canonical form, emitted by
 *   `satelliteAttrs()`; space-separated tokens allowed.
 * - literal `client:satellite`-style attributes -- best-effort
 *   back-compat for plain-element authoring. Astro strips `client:*`
 *   from real framework islands at render time, so the scanner cannot
 *   double-activate an island.
 *
 * @module
 */

import { Diagnostics } from '@czap/core';
import { readRuntimeGlobal, writeRuntimeGlobal } from './globals.js';

/** Directive names the integration can register, in escalation order. */
export type DirectiveName = 'satellite' | 'stream' | 'llm' | 'worker' | 'gpu' | 'wasm' | 'graph' | 'svg';

const DIRECTIVE_CONFIG_KEYS: Partial<Record<DirectiveName, string>> = {
  stream: 'stream',
  llm: 'llm',
  worker: 'workers',
  gpu: 'gpu',
  wasm: 'wasm',
  graph: 'graph',
};

function directiveEnableFix(name: DirectiveName): string {
  const configKey = DIRECTIVE_CONFIG_KEYS[name];
  if (!configKey) {
    return 'Fix: ensure the directive is registered in czap({ ... }).';
  }
  const coepNote = name === 'worker' ? ' COOP/COEP response headers are emitted automatically.' : '';
  return `Fix: czap({ ${configKey}: { enabled: true } }).${coepNote}`;
}

const DIRECTIVE_NAMES: readonly DirectiveName[] = [
  'satellite',
  'stream',
  'llm',
  'worker',
  'gpu',
  'wasm',
  'graph',
  'svg',
];

/** Tracks which directives already initialized an element across re-scans. */
const BOUND_ATTRIBUTE = 'data-czap-directive-bound';

type DirectiveEntry = (load: () => Promise<unknown>, opts: Record<string, unknown>, el: HTMLElement) => void;

// Static thunk map so the bundler code-splits each directive into the
// same chunk Astro's island path would load.
const LOADERS: Record<DirectiveName, () => Promise<{ readonly default: DirectiveEntry }>> = {
  satellite: () => import('../client-directives/satellite.js'),
  stream: () => import('../client-directives/stream.js'),
  llm: () => import('../client-directives/llm.js'),
  worker: () => import('../client-directives/worker.js'),
  gpu: () => import('../client-directives/gpu.js'),
  wasm: () => import('../client-directives/wasm.js'),
  graph: () => import('../client-directives/graph.js'),
  svg: () => import('../client-directives/svg.js'),
};

function isDirectiveName(value: string): value is DirectiveName {
  return (DIRECTIVE_NAMES as readonly string[]).includes(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function boundNames(element: HTMLElement): Set<string> {
  const raw = element.getAttribute(BOUND_ATTRIBUTE);
  return new Set(raw ? raw.split(/\s+/).filter(Boolean) : []);
}

function markBound(element: HTMLElement, name: DirectiveName): void {
  const names = boundNames(element);
  names.add(name);
  element.setAttribute(BOUND_ATTRIBUTE, [...names].join(' '));
}

function unmarkBound(element: HTMLElement, name: DirectiveName): void {
  const names = boundNames(element);
  names.delete(name);
  if (names.size === 0) {
    element.removeAttribute(BOUND_ATTRIBUTE);
  } else {
    element.setAttribute(BOUND_ATTRIBUTE, [...names].join(' '));
  }
}

function collectMarkedElements(name: DirectiveName, root: ParentNode): HTMLElement[] {
  // CSS.escape is unnecessary: both selectors are built from the fixed
  // DirectiveName union, never from page content.
  const canonical = `[data-czap-directive~="${name}"]`;
  const legacy = `[client\\:${name}]`;
  const selector = `${canonical},${legacy}`;
  const matches = Array.from(root.querySelectorAll<HTMLElement>(selector));
  // querySelectorAll only sees descendants; a marked element passed AS the
  // scan root (e.g. a freshly swapped-in fragment) must activate too.
  if (root instanceof HTMLElement && root.matches(selector)) {
    matches.unshift(root);
  }
  return matches;
}

/**
 * Scan `root` for canonical and legacy markers of the `enabled`
 * directives and activate each marked element once. Elements carrying a
 * marker for a directive that is NOT enabled get a one-time diagnostic
 * instead of silence -- that authoring mistake was previously invisible.
 *
 * The no-op `load` thunk passed to each directive entry is correct:
 * every runtime init does its real work synchronously off the element's
 * `data-czap-*` attributes and only calls `load()` for parity with
 * Astro's directive contract.
 */
export async function scanAndBootDirectives(
  enabled: readonly DirectiveName[],
  root: ParentNode = document,
): Promise<void> {
  const enabledSet = new Set(enabled.filter(isDirectiveName));

  const activations: Promise<void>[] = [];

  for (const name of DIRECTIVE_NAMES) {
    const elements = collectMarkedElements(name, root);
    if (elements.length === 0) {
      continue;
    }

    if (!enabledSet.has(name)) {
      Diagnostics.warnOnce({
        source: 'czap/astro.directive-boot',
        code: `directive-not-enabled:${name}`,
        message: `Found ${name} directive markers but the ${name} directive is not enabled in the czap integration config. ${directiveEnableFix(name)}`,
      });
      continue;
    }

    for (const element of elements) {
      if (boundNames(element).has(name)) {
        continue;
      }
      // Pre-mark so overlapping scans can't double-activate; a failed
      // activation unmarks below so a later re-scan (astro:after-swap)
      // can retry after a transient chunk-load error.
      markBound(element, name);
      activations.push(
        LOADERS[name]()
          .then((mod) => {
            mod.default(() => Promise.resolve(), {}, element);
          })
          .catch((error: unknown) => {
            unmarkBound(element, name);
            Diagnostics.warn({
              source: 'czap/astro.directive-boot',
              code: 'directive-activation-failed',
              message: `Failed to activate ${name} directive.`,
              detail: error instanceof Error ? error.message : String(error),
            });
          }),
      );
    }
  }

  await Promise.all(activations);
}

/**
 * One-shot page bootstrap: scan for directive markers on
 * `DOMContentLoaded` (or immediately if the document is already ready)
 * and re-scan after every Astro View Transitions `after-swap`. Swapped-in
 * DOM is fresh server HTML -- it never carries the bound attribute -- so
 * new elements activate while `transition:persist` elements are skipped
 * (their directives re-read attributes via the existing `czap:reinit`
 * path installed by `installSwapReinit()`).
 *
 * Idempotent across repeated module loads via a window global, matching
 * `bootstrapSlots()`.
 */
export function bootstrapDirectives(enabled: readonly DirectiveName[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (readRuntimeGlobal('__CZAP_DIRECTIVE_BOOTSTRAPPED__', isBoolean)) {
    return;
  }
  writeRuntimeGlobal('__CZAP_DIRECTIVE_BOOTSTRAPPED__', true);

  const scan = (): void => {
    void scanAndBootDirectives(enabled);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan, { once: true });
  } else {
    scan();
  }

  document.addEventListener('astro:after-swap', scan);
}
