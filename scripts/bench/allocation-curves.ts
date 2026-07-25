/** Retained-allocation curve measurement shared by package assurance campaigns. */

import { ValidationError } from '@liteship/error';
import { fitGrowthClass, type ComplexityFit } from './contracts.js';

export interface AllocationCurveProbe {
  readonly path: string;
  readonly describe: string;
  readonly shape: string;
  readonly sizes: readonly number[];
  readonly repetitions: number;
  readonly operationFor: (size: number) => () => unknown;
  /** Exact retained output bytes when the SUT exposes them (for example Uint8Array.byteLength). */
  readonly retainedSizeOf?: (result: unknown) => number;
}

export interface AllocationCurveSample {
  readonly size: number;
  readonly retainedBytesPerOperation: number;
}

export interface AllocationCurve {
  readonly path: string;
  readonly describe: string;
  readonly shape: string;
  readonly sizes: readonly number[];
  readonly repetitions: number;
  readonly samples: readonly AllocationCurveSample[];
  readonly fit: ComplexityFit;
}

export interface AllocationMeasurementHost {
  readonly collect: () => void;
  readonly retainedBytes: () => number;
}

/** Heap plus ArrayBuffer storage, without double-counting Node's `external` total. */
export function processRetainedBytes(): number {
  const memory = process.memoryUsage();
  return memory.heapUsed + memory.arrayBuffers;
}

export function nodeAllocationMeasurementHost(): AllocationMeasurementHost {
  if (global.gc === undefined) {
    throw ValidationError(
      'allocation-curves',
      'global.gc is unavailable; run the retained-allocation producer with node --expose-gc',
    );
  }
  return { collect: global.gc, retainedBytes: processRetainedBytes };
}

/**
 * Measure bytes that remain reachable after one operation. Inputs and JIT warmup are
 * established before the baseline; outputs stay strongly referenced until the second
 * forced collection. The median of three independent windows rejects collector noise.
 */
export function measureRetainedAllocationCurve(
  probe: AllocationCurveProbe,
  host?: AllocationMeasurementHost,
): AllocationCurve {
  if (probe.repetitions < 1 || probe.sizes.length < 2 || new Set(probe.sizes).size < 2) {
    throw ValidationError('allocation-curves', `${probe.path} requires >=2 sizes and >=1 repetition`);
  }

  const samples: AllocationCurveSample[] = [];
  for (const size of probe.sizes) {
    const operation = probe.operationFor(size);
    void operation();
    if (probe.retainedSizeOf !== undefined) {
      let retained = 0;
      for (let repetition = 0; repetition < probe.repetitions; repetition++) {
        retained += probe.retainedSizeOf(operation());
      }
      samples.push({ size, retainedBytesPerOperation: Math.max(1, retained / probe.repetitions) });
      continue;
    }
    const measurementHost = host ?? nodeAllocationMeasurementHost();
    const windows: number[] = [];
    for (let window = 0; window < 3; window++) {
      measurementHost.collect();
      const before = measurementHost.retainedBytes();
      const retained: unknown[] = [];
      for (let repetition = 0; repetition < probe.repetitions; repetition++) retained.push(operation());
      measurementHost.collect();
      const after = measurementHost.retainedBytes();
      windows.push(Math.max(1, (after - before) / probe.repetitions));
      retained.length = 0;
      measurementHost.collect();
    }
    windows.sort((a, b) => a - b);
    samples.push({ size, retainedBytesPerOperation: windows[1] ?? windows[0] ?? 1 });
  }

  return {
    path: probe.path,
    describe: probe.describe,
    shape: probe.shape,
    sizes: [...probe.sizes],
    repetitions: probe.repetitions,
    samples,
    fit: fitGrowthClass(samples.map((sample) => ({ size: sample.size, cost: sample.retainedBytesPerOperation }))),
  };
}
