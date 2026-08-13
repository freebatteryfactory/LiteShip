# Worker Bootstrap

Status: specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `01_hosts/worker/00_bootstrap/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Own the only place raw isolated-realm globals exist: realm identity, the admitted realm scope, bootstrap-envelope admission, the grounding and offer definition machinery with worker pins, and the placement authority every worker offer derives from.

## Owns

- The worker realm pin and host identity.
- `WorkerGroundingDefinition` and `WorkerRealizationOffer` — admission and construction machinery with realm, origin, custody, location, and backend pinned.
- The bootstrap envelope: program identity, catalog ancestry, and transaction generation admitted together.
- The intrinsic realm-scope grounding and the invocation envelope grounding.

## Does not own

- The parent-side constructor (web or server facility) or the generated worker artifact (target).
- Any capability above the boundary — those are the other homes' groundings and offers.

## The entry decision

One envelope enters the realm, written by the parent and admitted here — never trusted. It binds the program address, the realization-catalog ancestry, and the transaction generation, so the realm knows exactly what it is executing, from which catalog, at which coordinate. There is no second entry payload and no naked entry. The initial placement profile is deliberately narrow: backends exactly javascript and wasm, locations exactly local and live. A webgpu-in-worker offer must pin its exact prerequisites later rather than widening the default union.

## Laws

- The worker realm is exactly `worker`; a grounding cannot claim another realm.
- The definition and its catalog share one identity and realm.
- An offer cannot advertise webgpu, server, host-native, a sibling realm, or html-css.
- A grounding slot pins its allowed origin and exact custody arm.
- The envelope carries program, catalog, and generation together.

## Proof obligations

- Raw realm globals are captured only beneath this boundary; no ambient reads exist outside it.
- Every target-generated artifact enters through this canonical bootstrap.

Both are `system/01_assurance` obligations.

## Implementation boundary

Specified. No worker global capture or entry-decoding code exists or is authorized.
