import { SlotRegistry } from '@czap/web';
import { readRuntimeGlobal, writeRuntimeGlobal } from './globals.js';

interface RuntimeWindow extends Window {
  __CZAP_SLOT_REGISTRY__?: SlotRegistry.Shape;
  __CZAP_SLOT_BOOTSTRAPPED__?: boolean;
  __CZAP_SLOTS__?: {
    readonly registry: SlotRegistry.Shape;
    readonly entries: Record<string, { path: string; mode: string }>;
  };
}

const REINIT_SELECTOR =
  '[data-czap-boundary],[data-czap-stream-url],[data-czap-llm-url],[data-czap-wasm],[data-czap-shader-src],[data-czap-directive]';

function isSlotRegistryShape(value: unknown): value is SlotRegistry.Shape {
  if (typeof value !== 'object' || value === null) return false;
  if (!('get' in value) || !('register' in value) || !('entries' in value)) return false;
  return typeof value.get === 'function' && typeof value.register === 'function' && typeof value.entries === 'function';
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function runtimeWindow(): RuntimeWindow | null {
  return typeof window === 'undefined' ? null : (window as RuntimeWindow);
}

/**
 * Return the document-scoped {@link SlotRegistry.Shape}, creating and
 * persisting one on `window.__CZAP_SLOT_REGISTRY__` the first time
 * it's requested. Returns a detached registry under SSR.
 */
export function getSlotRegistry(): SlotRegistry.Shape {
  const win = runtimeWindow();
  if (!win) {
    return SlotRegistry.create();
  }

  const existingRegistry = readRuntimeGlobal('__CZAP_SLOT_REGISTRY__', isSlotRegistryShape);
  if (!existingRegistry) {
    return writeRuntimeGlobal('__CZAP_SLOT_REGISTRY__', SlotRegistry.create());
  }

  return existingRegistry;
}

/**
 * Clear and rebuild the slot registry by scanning `root` for
 * `data-czap-slot` elements. Also writes a serialised
 * `__CZAP_SLOTS__` snapshot for devtools / diagnostics consumers.
 */
export function rescanSlots(root: ParentNode = document): SlotRegistry.Shape {
  const registry = getSlotRegistry();
  const existingPaths = Array.from(registry.entries().keys());
  for (const path of existingPaths) {
    registry.unregister(path);
  }

  const scanRoot = root instanceof Element ? root : document.documentElement;
  SlotRegistry.scanDOM(registry, scanRoot);

  const win = runtimeWindow();
  if (win) {
    writeRuntimeGlobal('__CZAP_SLOTS__', {
      registry,
      entries: Object.fromEntries(
        Array.from(registry.entries().entries()).map(([path, entry]) => [path, { path, mode: entry.mode }]),
      ),
    });
  }

  return registry;
}

/**
 * One-shot INITIAL bootstrap: arm a slot-registry scan on
 * `DOMContentLoaded` (or immediately if the document is already ready).
 * Idempotent -- subsequent calls return the same registry.
 *
 * The post-swap re-scan is NOT registered here: it is the first step of the
 * single ordered swap pipeline (`./swap-pipeline.ts`, F-1), so slot-rescan,
 * directive-boot, and reinit run in a guaranteed order rather than racing on
 * listener-registration luck.
 */
export function bootstrapSlots(): SlotRegistry.Shape {
  const win = runtimeWindow();
  if (!win) {
    return SlotRegistry.create();
  }

  const scan = (): void => {
    rescanSlots(document.documentElement);
  };

  if (!readRuntimeGlobal('__CZAP_SLOT_BOOTSTRAPPED__', isBoolean)) {
    writeRuntimeGlobal('__CZAP_SLOT_BOOTSTRAPPED__', true);

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', scan, { once: true });
    } else {
      scan();
    }
  }

  return getSlotRegistry();
}

/**
 * Dispatch `czap:reinit` on every known directive root so directives can RE-READ
 * fresh `data-czap-*` attributes without remounting. The reinit handlers
 * self-clean (each directive's `czap:reinit` listener disposes its prior wiring
 * before re-initializing), so this no longer broadcasts `czap:teardown` — that
 * event is reserved for FINAL teardown ({@link teardownDirectives}). Conflating
 * the two (the old single `czap:dispose`) forced gpu.ts to special-case "dispose
 * during a live reinit"; splitting them removes that hazard (F-2).
 *
 * Used after Astro View Transitions `after-swap` (the third step of the swap
 * pipeline).
 */
export function reinitializeDirectives(): void {
  document.querySelectorAll<HTMLElement>(REINIT_SELECTOR).forEach((element) => {
    element.dispatchEvent(new CustomEvent('czap:reinit', { bubbles: true }));
  });
}

/**
 * Dispatch `czap:teardown` on every known directive root — the FINAL teardown
 * signal (the page/element is going away for good). Directives release every
 * observer/listener and do NOT re-initialize. Distinct from
 * {@link reinitializeDirectives} (re-read attrs, stay live).
 */
export function teardownDirectives(): void {
  document.querySelectorAll<HTMLElement>(REINIT_SELECTOR).forEach((element) => {
    element.dispatchEvent(new CustomEvent('czap:teardown', { bubbles: true }));
  });
}
