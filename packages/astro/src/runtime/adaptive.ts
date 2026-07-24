import {
  applyBoundaryState,
  attachSignalObserver,
  evaluateBoundary,
  parseBoundary,
  readSignalValue,
  warnIfSignalUnserved,
} from './boundary.js';
import { bootDirectiveEntry } from './directive-bound.js';

/**
 * Entry point used by the `client:adaptive` directive. Parses the
 * serialised boundary off `element`, attaches a viewport observer
 * (when the signal is viewport-backed), and recomputes
 * `data-liteship-state` plus CSS variables whenever the signal crosses a
 * threshold. Honors `liteship:reinit` (re-read) and `liteship:teardown` (final
 * tear-down) custom events without remounting the island.
 *
 * @param load - Dynamic-import factory the directive passes in.
 * @param element - Adaptive root carrying `data-liteship-boundary`.
 */
export function initAdaptiveDirective(load: () => Promise<unknown>, element: HTMLElement): void {
  let runtimeBoundary = parseBoundary(element.getAttribute('data-liteship-boundary'));
  if (!runtimeBoundary) {
    return;
  }

  let previousState = element.getAttribute('data-liteship-state') ?? '';
  let cleanupObserver: (() => void) | null = null;

  const updateState = (): void => {
    if (!runtimeBoundary) {
      return;
    }

    const value = readSignalValue(runtimeBoundary.input);
    if (value === undefined) {
      return;
    }

    const state = evaluateBoundary(runtimeBoundary, value, previousState || undefined);
    if (state === previousState) {
      return;
    }

    previousState = state;
    applyBoundaryState(
      element,
      runtimeBoundary,
      {
        discrete: { [runtimeBoundary.name]: state },
      },
      'liteship:adaptive-state',
    );
  };

  const cleanup = (): void => {
    cleanupObserver?.();
    cleanupObserver = null;
  };

  const init = (): void => {
    updateState();
    if (runtimeBoundary) {
      warnIfSignalUnserved(runtimeBoundary.input, { source: 'liteship/astro.adaptive', what: 'boundary signal' });
      cleanupObserver = attachSignalObserver(runtimeBoundary.input, updateState);
    }
  };

  element.addEventListener('liteship:reinit', () => {
    cleanup();
    runtimeBoundary = parseBoundary(element.getAttribute('data-liteship-boundary'));
    previousState = element.getAttribute('data-liteship-state') ?? '';
    init();
  });

  element.addEventListener('liteship:teardown', () => {
    cleanup();
  });

  init();
  load();
}

/** Astro client directive entry that marks the host before starting the adaptive runtime. */
export const adaptiveDirective = (
  load: () => Promise<unknown>,
  opts: Record<string, unknown>,
  el: HTMLElement,
): void => {
  bootDirectiveEntry('adaptive', load, opts, el, (runtimeLoad, _runtimeOpts, runtimeEl) => {
    initAdaptiveDirective(runtimeLoad, runtimeEl);
  });
};
