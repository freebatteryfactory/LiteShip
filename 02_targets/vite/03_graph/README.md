# Vite Module Graph and Hot Updates

Status: specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `02_targets/vite/03_graph/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Own environment-scoped invalidation, hot-update ordering, and stale rejection — with a monotonic coordinate the ecosystem does not provide.

## Owns

- The hot update, committed to module identity, source revision, configuration revision, environment, and ordering coordinate.
- The update disposition: applied, stale with the sequence that beat it, or rejected.

## Does not own

- The bundler module graph itself.
- Transport of updates to a client.
- A second ordering coordinate. Core owns the one.

## Why the ecosystem timestamp is not promoted

The predecessor's hot updates carried a content-address predecessor link but no monotonic generation, so two updates arriving out of order both applied and the final state was whichever landed last.

The bundler's hot-update payload carries a timestamp, and it is tempting to reach for. But it is documented as cache-busting, not as an ordering guarantee — promoting it would adopt a promise the ecosystem never made. So it stays evidence, and ordering is carried by the coordinate that exists to be monotonic.

## Laws

- An update carries core's ordering coordinate, written against the imported authority so a local counter fails.
- An update commits to source revision, configuration revision, and environment.
- A stale update is rejected and says what beat it, carrying both sequences and no update.
- The ecosystem timestamp is not the ordering coordinate.

## Proof obligations

- That an applied update was the newest for its module.
- That an update never crosses environments.

Assurance-and-implementation territory.

## Implementation boundary

Specified. No code exists or is authorized.
