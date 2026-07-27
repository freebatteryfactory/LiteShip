/**
 * The ONE ordered `astro:after-swap` pipeline.
 *
 * Astro View Transitions don't re-execute page scripts on a swap, so liteship re-runs
 * its post-swap work from a single listener. That work has a LOAD-BEARING order:
 *
 *   1. {@link rescanSlots} — rebuild the slot registry from the freshly swapped DOM
 *      FIRST, so any directive that reads a slot sees the new registry.
 *   2. {@link scanAndBootDirectives} — activate directive markers on the new server
 *      HTML (fresh nodes never carry `data-liteship-directive-bound`, so only they boot).
 *   3. {@link reinitializeDirectives} — dispatch `liteship:reinit` on persisted directive
 *      roots so they re-read fresh `data-liteship-*` attributes without remounting.
 *
 * That order used to live implicitly in the REGISTRATION ORDER of three separate
 * `astro:after-swap` listeners (`bootstrapSlots`, `bootstrapDirectives`,
 * `installSwapReinit`) — correct only by the luck of the boot script calling them
 * in sequence (F-1). Here the order is DATA: an explicit ordered array the single
 * listener walks. Reorder the steps by reordering {@link SWAP_STEPS}, not by
 * juggling where listeners are installed.
 *
 * @module
 */

import type { DirectiveName } from './directive-boot.js';
import { scanAndBootDirectives } from './directive-boot.js';
import { readRuntimeGlobal, writeRuntimeGlobal } from './globals.js';
import {
  collectDirectiveRoots,
  reinitializeDirectives,
  rescanSlots,
  teardownDirectiveRoots,
  teardownDirectives,
} from './slots.js';

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/** One step of the swap pipeline: a named post-swap action over the enabled directives. */
export interface SwapStep {
  readonly name: string;
  readonly run: (enabled: readonly DirectiveName[]) => void;
}

/**
 * The post-swap steps, IN ORDER. The pipeline runs them top-to-bottom on every
 * `astro:after-swap`. Order is the contract — see the module doc.
 */
export const SWAP_STEPS: readonly SwapStep[] = [
  { name: 'rescanSlots', run: () => rescanSlots(document.documentElement) },
  { name: 'bootDirectives', run: (enabled) => void scanAndBootDirectives(enabled) },
  { name: 'reinitDirectives', run: () => reinitializeDirectives() },
];

/** Run every {@link SWAP_STEPS} step in order for the given enabled directives. */
export function runSwapPipeline(enabled: readonly DirectiveName[]): void {
  for (const step of SWAP_STEPS) {
    step.run(enabled);
  }
}

interface InstalledSwapPipeline {
  readonly dispose: () => void;
}

const installedPipelines = new WeakMap<Window, InstalledSwapPipeline>();

/**
 * Install the single `astro:after-swap` listener that runs {@link runSwapPipeline}.
 * Idempotent across repeated module loads via `window.__LITESHIP_SWAP_PIPELINE__`, so
 * HMR / a re-imported boot script never stacks duplicate listeners.
 */
export function installSwapPipeline(enabled: readonly DirectiveName[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  const installed = installedPipelines.get(window);
  if (installed && readRuntimeGlobal('__LITESHIP_SWAP_PIPELINE__', isBoolean)) return;
  installed?.dispose();

  writeRuntimeGlobal('__LITESHIP_SWAP_PIPELINE__', true);
  let outgoingRoots: readonly HTMLElement[] = [];

  const beforeSwap = (): void => {
    outgoingRoots = collectDirectiveRoots(document);
  };
  const afterSwap = (): void => {
    // Astro has now moved transition:persist roots into the new document and
    // disconnected the outgoing remainder. Finalize only the disconnected
    // roots; connected survivors stay live and receive reinit below.
    teardownDirectiveRoots(outgoingRoots.filter((root) => !root.isConnected));
    outgoingRoots = [];
    runSwapPipeline(enabled);
  };
  const pageHide = (event: PageTransitionEvent): void => {
    // BFCache pages remain live and resume without a fresh module bootstrap.
    // A true final page exit owns teardown of every remaining directive root.
    if (event.persisted) return;
    outgoingRoots = [];
    teardownDirectives();
  };

  document.addEventListener('astro:before-swap', beforeSwap);
  document.addEventListener('astro:after-swap', afterSwap);
  window.addEventListener('pagehide', pageHide);

  installedPipelines.set(window, {
    dispose() {
      document.removeEventListener('astro:before-swap', beforeSwap);
      document.removeEventListener('astro:after-swap', afterSwap);
      window.removeEventListener('pagehide', pageHide);
      outgoingRoots = [];
    },
  });
}
