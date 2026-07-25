/** Package-owned retained-allocation probes for the assurance campaigns. */

import { CanonicalCbor, decode } from '@liteship/canonical';
import {
  measureRetainedAllocationCurve,
  type AllocationCurve,
  type AllocationCurveProbe,
  type AllocationMeasurementHost,
} from './allocation-curves.js';

const CANONICAL_SIZES = [1024, 4096, 16384, 65536] as const;

function buildCanonicalEncodeProbe(): AllocationCurveProbe {
  return {
    path: 'canonical.encode.retainedAllocation',
    describe: 'CanonicalCbor.encode retained output storage; linear in encoded element count.',
    shape: 'canonical-array-elements',
    sizes: CANONICAL_SIZES,
    repetitions: 8,
    operationFor: (size) => {
      const value = Array.from({ length: size }, (_, index) => index & 0xff);
      return () => CanonicalCbor.encode(value);
    },
    retainedSizeOf: (result) => {
      if (!(result instanceof Uint8Array)) throw new TypeError('CanonicalCbor.encode did not return Uint8Array');
      return result.byteLength;
    },
  };
}

function buildCanonicalDecodeProbe(): AllocationCurveProbe {
  return {
    path: 'canonical.decode.retainedAllocation',
    describe: 'Canonical CBOR decoded array storage; linear in decoded element count.',
    shape: 'canonical-array-elements',
    sizes: CANONICAL_SIZES,
    repetitions: 8,
    operationFor: (size) => {
      const bytes = CanonicalCbor.encode(Array.from({ length: size }, (_, index) => index & 0xff));
      return () => decode(bytes);
    },
  };
}

export const canonicalEncodeAllocationProbe: AllocationCurveProbe = buildCanonicalEncodeProbe();
export const canonicalDecodeAllocationProbe: AllocationCurveProbe = buildCanonicalDecodeProbe();

export const ALLOCATION_CURVE_PROBES: readonly AllocationCurveProbe[] = [
  canonicalEncodeAllocationProbe,
  canonicalDecodeAllocationProbe,
];

function measure(probe: AllocationCurveProbe, host?: AllocationMeasurementHost): AllocationCurve {
  return host === undefined ? measureRetainedAllocationCurve(probe) : measureRetainedAllocationCurve(probe, host);
}

/** Explicit collector: direct call graph reaches the encoder and emits its path key. */
export function collectCanonicalEncodeAllocationCurve(host?: AllocationMeasurementHost): AllocationCurve {
  return measure(buildCanonicalEncodeProbe(), host);
}

/** Explicit collector: direct call graph reaches the decoder and emits its path key. */
export function collectCanonicalDecodeAllocationCurve(host?: AllocationMeasurementHost): AllocationCurve {
  return measure(buildCanonicalDecodeProbe(), host);
}

/** Producer aggregation; individual collectors remain independently auditable. */
export function runCanonicalAllocationCurves(host?: AllocationMeasurementHost): readonly AllocationCurve[] {
  return [collectCanonicalEncodeAllocationCurve(host), collectCanonicalDecodeAllocationCurve(host)];
}
