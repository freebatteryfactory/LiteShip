/**
 * Compile-time laws for `00_core/04_time`.
 *
 * Nothing imports this file. It emits no JavaScript and exports no value.
 *
 * @module
 */

import type { Assert, CaseOf, Equal, TagOf } from '../../types.js';
import type { ToleranceProfileReference } from '../02_identity/types.js';
import type {
  TemporalProjectionFidelity,
  TemporalProjectionInvertibility,
  TemporalToleranceProfile,
  TemporalToleranceProfileCoordinate,
  TimeProjection,
} from './types.js';

/** Compile-time law: temporal approximation is addressed and exactness carries no tolerance. */
export type TemporalFidelityRejectsBooleanAndNumericSoup = Assert<
  Equal<
    [
      TagOf<TemporalProjectionFidelity>,
      keyof CaseOf<TemporalProjectionFidelity, 'exact'>,
      CaseOf<TemporalProjectionFidelity, 'approximate'>['tolerance'],
      number extends CaseOf<TemporalProjectionFidelity, 'approximate'>['tolerance'] ? true : false,
    ],
    [
      'exact' | 'approximate',
      '_tag',
      TemporalToleranceProfileCoordinate,
      false,
    ]
  >
>;

/** Compile-time law: invertibility is an independent capability, never a fidelity member. */
export type TemporalInvertibilityIsOrthogonal = Assert<
  Equal<
    [
      TimeProjection['fidelity'],
      TimeProjection['invertibility'],
      'invertibility' extends keyof TemporalProjectionFidelity ? true : false,
      TagOf<TemporalProjectionInvertibility>,
    ],
    [
      TemporalProjectionFidelity,
      TemporalProjectionInvertibility,
      false,
      'invertible' | 'noninvertible',
    ]
  >
>;

/** Compile-time law: a temporal profile states identity, domain, metric, unit, bound, and address. */
export type TemporalToleranceProfilesCarryTheirWholeMeaning = Assert<
  Equal<
    [
      TemporalToleranceProfile['id'] extends ToleranceProfileReference ? true : false,
      keyof TemporalToleranceProfile,
    ],
    [true, 'id' | 'domain' | 'metric' | 'unit' | 'bound' | 'address']
  >
>;
