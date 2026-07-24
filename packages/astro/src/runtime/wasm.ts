import { WASMDispatch, Diagnostics } from '@liteship/core';
import { dispatchLiteshipEvent } from '@liteship/web';
import { writeRuntimeGlobal } from './globals.js';
import { readRuntimeEndpointPolicy } from './policy.js';
import { allowRuntimeEndpointUrl } from './url-policy.js';
import { bootDirectiveEntry } from './directive-bound.js';

const ROOT_WASM_ATTR = 'data-liteship-wasm-url';

/**
 * Configure (or clear) the root `data-liteship-wasm-url` attribute used by
 * the `client:wasm` directive to discover its module URL. Also
 * back-fills any existing `[data-liteship-wasm]` elements that lack a
 * per-element override.
 */
export function configureWasmRuntime(wasmUrl: string | null | undefined): void {
  if (!wasmUrl) {
    document.documentElement.removeAttribute(ROOT_WASM_ATTR);
    return;
  }

  document.documentElement.setAttribute(ROOT_WASM_ATTR, wasmUrl);
  document.querySelectorAll<HTMLElement>('[data-liteship-wasm]').forEach((element) => {
    if (!element.getAttribute(ROOT_WASM_ATTR)) {
      element.setAttribute(ROOT_WASM_ATTR, wasmUrl);
    }
  });
}

/**
 * Resolve the WASM module URL for `element`, falling back to the
 * root-configured URL when no per-element override exists.
 */
export function resolveWasmUrl(element: HTMLElement): string | null {
  return element.getAttribute(ROOT_WASM_ATTR) ?? document.documentElement.getAttribute(ROOT_WASM_ATTR);
}

/**
 * Load the WASM kernels for `element`, publish them to
 * `window.__LITESHIP_WASM__`, and dispatch a `liteship:wasm-ready` event on
 * `document`. On failure, emits a diagnostic and fires
 * `liteship:wasm-error` instead so downstream consumers can degrade.
 */
export async function loadWasmRuntime(element: HTMLElement): Promise<void> {
  const wasmUrl = allowRuntimeEndpointUrl(
    resolveWasmUrl(element),
    'wasm',
    'liteship/astro.wasm',
    {
      crossOriginRejected: 'astro/wasm/wasm-cross-origin-url-rejected',
      malformedUrl: 'astro/wasm/wasm-malformed-url-rejected',
      originNotAllowed: 'astro/wasm/wasm-origin-not-allowed',
      endpointKindNotPermitted: 'astro/wasm/wasm-endpoint-kind-not-permitted',
    },
    readRuntimeEndpointPolicy(),
  );
  if (!wasmUrl) {
    return;
  }

  try {
    const kernels = await WASMDispatch.load(wasmUrl);
    writeRuntimeGlobal('__LITESHIP_WASM__', kernels);

    dispatchLiteshipEvent(document, 'liteship:wasm-ready', { url: wasmUrl });
  } catch (error) {
    Diagnostics.warnRegistered({
      source: 'liteship/astro.wasm',
      code: 'astro/wasm/wasm-load-failed',
      message:
        `WASM runtime failed to load from "${wasmUrl}". ` +
        `Fix: set liteship({ wasm: { enabled: true, path: './public/liteship-compute.wasm' } }) and verify Content-Type: application/wasm.`,
      detail: error instanceof Error ? error.message : 'load-failed',
      cause: error,
    });
    dispatchLiteshipEvent(document, 'liteship:wasm-error', {
      url: wasmUrl,
      reason: error instanceof Error ? error.message : 'load-failed',
    });
  }
}

/** Astro client directive entry that marks the host before starting the WASM runtime. */
export const wasmDirective = (load: () => Promise<unknown>, opts: Record<string, unknown>, el: HTMLElement): void => {
  bootDirectiveEntry('wasm', load, opts, el, (runtimeLoad, _runtimeOpts, runtimeEl) => {
    void loadWasmRuntime(runtimeEl);
    void runtimeLoad();
  });
};
