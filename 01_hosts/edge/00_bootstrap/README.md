# Edge Bootstrap

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `01_hosts/edge/00_bootstrap/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Own the only place raw edge globals and environment bindings exist: realm identity, invocation-context admission, deployment-configuration admission, the grounding and offer machinery with edge pins, and the placement authority every edge offer derives from.

## Owns

- The edge realm pin and host identity.
- `EdgeGroundingDefinition` and `EdgeRealizationOffer` with realm, origin, custody, location (`request`, exactly), and backend (`javascript | wasm`) pinned.
- The invocation context: cancellation authority and entry address — the lifetime unit of the realm.
- Admitted deployment configuration: exact and decoded, never a raw environment map.

## Does not own

- The request value itself — `01_request` admits it. Deployment artifact generation — targets.

## Laws

- The edge realm is exactly `edge`; a grounding cannot claim another realm.
- The definition and its catalog share one identity and realm.
- An offer's location is exactly request-time; `local` is provably excluded.
- The entry groundings pin invocation and deployment origins with unowned custody.

## Proof obligations

- No ambient environment read exists outside this boundary.

`system/01_assurance`.

## Implementation boundary

An edge bootstrap realization must capture platform context once, decode admitted bindings, and permit no ambient environment reads elsewhere.
