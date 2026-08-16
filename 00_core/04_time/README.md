# Temporal Coordinates

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `04_time/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Represent wall, monotonic, logical, hybrid, vector, transaction, frame, sample, simulation, stream, and editor coordinates without collapsing their ordering laws.

## Owns

- Typed temporal coordinates and references.
- Standard hybrid logical clocks.
- Vector-clock partial ordering.
- `Timebase`, `Timecode`, and tempo-map contracts.
- `TimeCut` products supplied to one transaction.
- Exact or tolerant temporal projections.
- Pure tick signatures.

## Does not own

- Browser or operating-system clock APIs.
- AudioWorklet timing.
- Timers, scheduling mechanisms, or host synchronization.
- Spatial coordinates, which follow the same explicit-projection discipline through their own algebra.

## Semantic contracts

A subsystem declares the temporal axes it requires. A runtime transaction receives one coherent `TimeCut`. Semantic transitions consume explicit coordinates or deltas rather than reading ambient time.

HLC retains its established computer-science meaning: wall coordinate plus logical counter and node identity. A product containing HLC, vector, sample, and frame coordinates remains a temporal product, not a renamed mega-HLC.

A `TimeProjection` carries the complete source and target timebases, including frame rates, sample rates, or tempo maps. Its fidelity is either exact or approximate under an addressed temporal tolerance profile; invertibility is a separate capability with its own algebra. Sharing a timebase tag is not enough to make two coordinates interchangeable.

## Laws

- Wall and monotonic coordinates are not interchangeable.
- Partial orders may report concurrent or incomparable.
- One transaction observes one coherent `TimeCut`.
- Semantic tick functions receive time explicitly.
- Frame, sample, beat, and simulation coordinates use declared timebases.
- Inexact conversion names an addressed temporal tolerance profile stating domain, metric, unit, bound, and address; a bare number is illegal.
- Invertibility is orthogonal to fidelity: exactness never implies reversibility, and approximation never implies its absence.
- Long-running sample, frame, and generation coordinates do not wrap silently.

## Operation vocabulary

- Physical hosts `create` clock resources.
- Core `advance`, `compare`, `join`, and `project` operations remain pure.
- `sample` evaluates meaning at a declared coordinate.
- `tick` is a pure transition contract over prior state, input, and time.

## Proof obligations

- Coordinate kinds fail cross-assignment fixtures.
- HLC merge and vector comparison satisfy their ordering laws.
- Realtime and offline media derive identical sample/frame positions.
- Transaction participants receive the same `TimeCut`.
- Tempo and timebase conversion is deterministic.
- Inexact projections cannot pass an exact-only requirement.
- Long-running counters survive representative multi-day and multi-year workloads.

## Implementation boundary

Clock sources, serialization, and presets must preserve clock identity, coordinate domains, ordering, and the distinction between semantic time and host observation.

Qualifying canonical composite-time encoding, precision, overflow behaviour, and the default preset roster are implementation obligations. None of them reaches the distinct-coordinate law.
