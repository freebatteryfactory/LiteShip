/**
 * `@liteship/core/clock` — the time vocabulary: the injectable `Clock` shape and
 * its system/fixed/manual constructors, the hybrid logical clock (HLC), and the
 * vector clock. Curated named re-exports only — no behavior lives here.
 * @module
 */

export { type Clock, type ManualClock, systemClock, wallClock, fixedClock, manualClock } from './clock.js';

export { HLC } from './hlc.js';

export { VectorClock } from './vector-clock.js';
