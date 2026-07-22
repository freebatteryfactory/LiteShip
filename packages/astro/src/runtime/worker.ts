import { Diagnostics, StateName } from '@liteship/core';
import { dispatchLiteshipEvent } from '@liteship/web';
import { WorkerHost } from '@liteship/worker';
import {
  applyBoundaryState,
  attachSignalObserver,
  evaluateBoundary,
  normalizeBoundaryState,
  parseBoundary,
  readSignalValue,
  warnIfSignalUnserved,
  type BoundaryStateDetail,
  type WgslUniformValue,
} from './boundary.js';
import { bootDirectiveEntry } from './directive-bound.js';

type WorkerDirectiveCompositor = Pick<
  WorkerHost['compositor'],
  'addQuantizer' | 'bootstrapResolvedState' | 'applyResolvedState' | 'onResolvedStateAck'
> & {
  readonly worker: Pick<Worker, 'addEventListener'> & Partial<Pick<Worker, 'removeEventListener'>>;
};

interface WorkerDirectiveHost {
  readonly compositor: WorkerDirectiveCompositor;
  readonly onState: WorkerHost['onState'];
  readonly dispose: WorkerHost['dispose'];
}

/**
 * The two domain-owned operations the worker directive executes through.
 *
 * This is an internal, defaulted seam: production always uses the real
 * `WorkerHost` and boundary normalizer, while branch tests can script those
 * capabilities directly instead of replacing either semantic module.
 */
interface WorkerRuntimeDependencies {
  readonly createWorkerHost: () => WorkerDirectiveHost;
  readonly normalizeBoundaryState: typeof normalizeBoundaryState;
}

const DEFAULT_WORKER_RUNTIME_DEPENDENCIES: WorkerRuntimeDependencies = {
  createWorkerHost: () => WorkerHost.create(),
  normalizeBoundaryState,
};

function sameStringRecord(left: Record<string, string>, right: Record<string, string>): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  for (const key of leftKeys) {
    if (left[key] !== right[key]) {
      return false;
    }
  }

  return true;
}

function sameNumberRecord(left: Record<string, number>, right: Record<string, number>): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  for (const key of leftKeys) {
    if (left[key] !== right[key]) {
      return false;
    }
  }

  return true;
}

function sameWgslValue(left: WgslUniformValue, right: WgslUniformValue): boolean {
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
      return false;
    }
    return left.every((value, index) => value === right[index]);
  }
  return left === right;
}

function sameWgslRecord(left: Record<string, WgslUniformValue>, right: Record<string, WgslUniformValue>): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  for (const key of leftKeys) {
    const rightValue = right[key];
    if (rightValue === undefined || !sameWgslValue(left[key]!, rightValue)) {
      return false;
    }
  }

  return true;
}

function sameBoundaryDetail(left: BoundaryStateDetail | null, right: BoundaryStateDetail): boolean {
  if (!left) {
    return false;
  }

  return (
    sameStringRecord(left.discrete, right.discrete) &&
    sameStringRecord(left.aria, right.aria) &&
    sameStringRecord(
      Object.fromEntries(Object.entries(left.css).map(([key, value]) => [key, String(value)])),
      Object.fromEntries(Object.entries(right.css).map(([key, value]) => [key, String(value)])),
    ) &&
    sameNumberRecord(left.glsl, right.glsl) &&
    sameWgslRecord(left.wgsl, right.wgsl)
  );
}

function canUseWorkerRuntime(): boolean {
  return typeof Worker !== 'undefined' && typeof SharedArrayBuffer !== 'undefined' && globalThis.crossOriginIsolated;
}

/**
 * Entry point used by the `client:worker` directive.
 *
 * Parses the serialised boundary off `element`, spins up (or reuses)
 * a {@link WorkerHost} from `@liteship/worker`, bootstraps the
 * boundary in the worker, and streams resolved state back into DOM
 * via {@link applyBoundaryState}. Falls back to an inline evaluation
 * when `SharedArrayBuffer` / cross-origin isolation is unavailable.
 */
export function initWorkerDirective(load: () => Promise<unknown>, element: HTMLElement): void {
  initWorkerDirectiveWithDependencies(load, element, DEFAULT_WORKER_RUNTIME_DEPENDENCIES);
}

/** Source-private dependency seam; not projected from any package entrypoint. */
export function initWorkerDirectiveWithDependencies(
  load: () => Promise<unknown>,
  element: HTMLElement,
  dependencies: WorkerRuntimeDependencies,
): void {
  let runtimeBoundary = parseBoundary(element.getAttribute('data-liteship-boundary'));
  if (!runtimeBoundary) {
    return;
  }

  let cleanupObserver: (() => void) | null = null;
  let host: WorkerDirectiveHost | null = null;
  let unsubscribe: (() => void) | null = null;
  let ackUnsubscribe: (() => void) | null = null;
  let workerMessageHandler: ((event: MessageEvent<{ type?: string }>) => void) | null = null;
  let workerRef: WorkerDirectiveCompositor['worker'] | null = null;
  let previousState = element.getAttribute('data-liteship-state') ?? '';
  let lastAppliedDetail: BoundaryStateDetail | null = null;
  let seededGeneration = 0;
  let lastAppliedGeneration = 0;
  let pendingWorkerSeedAgreement = false;

  const cleanup = (): void => {
    cleanupObserver?.();
    cleanupObserver = null;
    unsubscribe?.();
    unsubscribe = null;
    ackUnsubscribe?.();
    ackUnsubscribe = null;
    if (workerMessageHandler && workerRef?.removeEventListener) {
      workerRef.removeEventListener('message', workerMessageHandler);
    }
    workerMessageHandler = null;
    workerRef = null;
    host?.dispose();
    host = null;
  };

  const readValue = (): number | undefined => {
    return readSignalValue(runtimeBoundary!.input);
  };

  const initFallback = (): void => {
    const update = (reset = false): void => {
      if (!runtimeBoundary) {
        return;
      }

      const value = readValue();
      if (value === undefined) {
        return;
      }

      const nextState = reset
        ? evaluateBoundary(runtimeBoundary, value)
        : evaluateBoundary(runtimeBoundary, value, previousState);
      if (nextState === previousState) {
        return;
      }

      previousState = nextState;
      applyBoundaryState(
        element,
        runtimeBoundary,
        {
          discrete: { [runtimeBoundary.name]: nextState },
        },
        'liteship:worker-state',
      );
    };

    update(true);
    if (runtimeBoundary) {
      cleanupObserver = attachSignalObserver(runtimeBoundary.input, () => update(false));
    }
  };

  const initWorkerHost = (): void => {
    if (!runtimeBoundary) {
      return;
    }
    const boundary = runtimeBoundary;
    const workerHost = dependencies.createWorkerHost();
    host = workerHost;

    const syncResolvedState = (stateName: string, generation: number, bootstrap = false): void => {
      const payload = [
        {
          name: boundary.name,
          state: StateName(stateName),
          generation,
        },
      ] as const;
      pendingWorkerSeedAgreement = true;
      seededGeneration = generation;
      lastAppliedGeneration = generation;
      if (bootstrap) {
        workerHost.compositor.bootstrapResolvedState(payload);
        return;
      }

      workerHost.compositor.applyResolvedState(payload);
    };

    const applyHostResolvedState = (stateName: string, generation: number): void => {
      const payload = {
        discrete: { [boundary.name]: stateName },
      };
      applyBoundaryState(element, boundary, payload, 'liteship:worker-state');
      previousState = stateName;
      lastAppliedDetail = dependencies.normalizeBoundaryState(payload);
      lastAppliedGeneration = generation;
    };

    workerHost.compositor.addQuantizer(boundary.name, {
      id: boundary.boundary.id,
      states: boundary.boundary.states.map((s) => StateName(s)),
      thresholds: boundary.boundary.thresholds,
    });

    const onWorkerMessage = (event: MessageEvent<{ type?: string }>): void => {
      if (event.data?.type === 'ready') {
        dispatchLiteshipEvent(element, 'liteship:worker-ready');
      }
    };
    workerMessageHandler = onWorkerMessage;
    workerRef = workerHost.compositor.worker;
    workerHost.compositor.worker.addEventListener('message', onWorkerMessage);

    ackUnsubscribe = workerHost.compositor.onResolvedStateAck((ack) => {
      if (host !== workerHost || runtimeBoundary !== boundary) {
        return;
      }

      const ackState = ack.states.find((state) => state.name === boundary.name)?.state;
      if (
        pendingWorkerSeedAgreement &&
        ack.additionalOutputsChanged === false &&
        ack.generation === seededGeneration &&
        ackState !== undefined &&
        ackState === previousState
      ) {
        pendingWorkerSeedAgreement = false;
      }
    });

    unsubscribe = workerHost.onState((state) => {
      const currentState = state.discrete?.[boundary.name];
      if (currentState) {
        previousState = currentState;
      }

      const normalized = dependencies.normalizeBoundaryState(state);
      const workerGeneration = state.resolvedStateGenerations?.[boundary.name];
      if (
        pendingWorkerSeedAgreement &&
        workerGeneration !== undefined &&
        workerGeneration === seededGeneration &&
        currentState === lastAppliedDetail?.discrete[boundary.name] &&
        sameBoundaryDetail(lastAppliedDetail, normalized)
      ) {
        pendingWorkerSeedAgreement = false;
        return;
      }

      applyBoundaryState(element, boundary, state, 'liteship:worker-state');
      lastAppliedDetail = normalized;
      if (workerGeneration !== undefined) {
        lastAppliedGeneration = workerGeneration;
        pendingWorkerSeedAgreement = false;
      }
    });
    const update = (): void => {
      if (host !== workerHost || runtimeBoundary !== boundary) {
        return;
      }

      const value = readValue();
      if (value === undefined) {
        return;
      }

      const nextState = evaluateBoundary(boundary, value, previousState || undefined);
      if (nextState === previousState) {
        return;
      }

      const nextGeneration = lastAppliedGeneration + 1;
      applyHostResolvedState(nextState, nextGeneration);
      syncResolvedState(nextState, nextGeneration);
    };

    const initialValue = readValue();
    if (initialValue !== undefined) {
      const initialState = evaluateBoundary(boundary, initialValue, previousState || undefined);
      applyHostResolvedState(initialState, 1);
      syncResolvedState(initialState, 1, true);
    }
    cleanupObserver = attachSignalObserver(boundary.input, update);
  };

  const init = (): void => {
    if (runtimeBoundary) {
      warnIfSignalUnserved(runtimeBoundary.input, { source: 'liteship/astro.worker', what: 'boundary signal' });
    }
    if (!canUseWorkerRuntime()) {
      Diagnostics.warnOnce({
        source: 'liteship/astro.worker',
        code: 'worker-runtime-unavailable',
        message:
          `Worker runtime unavailable (crossOriginIsolated=${String(globalThis.crossOriginIsolated)}, ` +
          `SharedArrayBuffer=${typeof SharedArrayBuffer !== 'undefined'}). ` +
          `Fix: liteship({ workers: { enabled: true } }) — COOP/COEP response headers are emitted automatically.`,
      });
      initFallback();
      return;
    }

    try {
      initWorkerHost();
      return;
    } catch (error) {
      Diagnostics.warn({
        source: 'liteship/astro.worker',
        code: 'worker-host-fallback',
        message: 'WorkerHost could not initialize, falling back to main-thread evaluation.',
        detail: error instanceof Error ? error.message : String(error),
      });
    }

    initFallback();
  };

  element.addEventListener('liteship:reinit', () => {
    cleanup();
    runtimeBoundary = parseBoundary(element.getAttribute('data-liteship-boundary'));
    previousState = element.getAttribute('data-liteship-state') ?? '';
    lastAppliedDetail = null;
    seededGeneration = 0;
    lastAppliedGeneration = 0;
    pendingWorkerSeedAgreement = false;
    ackUnsubscribe = null;
    init();
  });

  element.addEventListener('liteship:teardown', () => {
    cleanup();
  });

  init();
  load();
}

/** Astro client directive entry that marks the host before starting the worker runtime. */
export const workerDirective = (load: () => Promise<unknown>, opts: Record<string, unknown>, el: HTMLElement): void => {
  bootDirectiveEntry('worker', load, opts, el, (runtimeLoad, _runtimeOpts, runtimeEl) => {
    initWorkerDirective(runtimeLoad, runtimeEl);
  });
};
