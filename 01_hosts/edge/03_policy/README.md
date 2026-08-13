# Edge Policy

Status: specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `01_hosts/edge/03_policy/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Own edge-physical security and response policy: origin allowlist, credential and redirect arms, isolation policy, and cache privacy partitions — fail-closed, content-addressed, entered through a deployment grounding.

## Owns

- `EdgeResponsePolicy` with its closed arms and address — refusals and receipts name exactly which policy governed them.
- Per-arm-pinned refusals: origin, credentials, redirect, isolation, partition.
- The policy grounding: deployment origin, unowned custody.

## Does not own

- Authorization — server-authoritative, always. This policy decides what the edge may physically emit and fetch, not what a user may do.
- Network and cache mechanics — those homes consume this policy by requirement row.

## Laws

- The policy is a non-empty allowlist with pinned arms and an address.
- Every refusal arm names the exact governing policy address.
- The policy enters through a deployment grounding with unowned custody.

## Proof obligations

- The policy is actually applied on the shipping path; private data cannot cross partitions.

`system/01_assurance`.

## Implementation boundary

Specified. No header emission or policy evaluation code exists or is authorized.
