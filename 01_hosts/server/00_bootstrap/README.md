# Server Bootstrap

Status: specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `01_hosts/server/00_bootstrap/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Own the only place raw process globals and the environment map exist: realm identity, process-entry admission, configuration admission, the grounding and offer machinery with server pins, and the placement authority every server offer derives from.

## Owns

- The server realm pin and host identity.
- `ServerGroundingDefinition` and `ServerRealizationOffer` with realm, origin, custody, locations (`local | live`), and backends (`javascript | wasm | host-native`) pinned.
- The admitted process entry and the admitted configuration — exact and decoded, never a raw environment map.

## Does not own

- Process mechanics — `01_process`. Deployment artifact shape — targets.

## Laws

- The server realm is exactly `server`; a grounding cannot claim another realm.
- The definition and its catalog share one identity and realm.
- An offer's backends are exactly javascript, wasm, and host-native; webgpu is provably excluded.
- The entry groundings pin invocation and deployment origins with unowned custody.

## Proof obligations

- No ambient `process.env`, filesystem, network, or global read exists outside this boundary.

`system/01_assurance`.
