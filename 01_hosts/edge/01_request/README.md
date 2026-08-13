# Edge Request

Status: specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `01_hosts/edge/01_request/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Own the exact physical incoming request: identity, closed method vocabulary, admitted URL, headers, cookies, the one-shot body relationship, provenance, and lifecycle.

## Owns

- The admitted request resource — every field decoded, provenance to its invocation and a trace address recorded, and every operation (consume, clone, cancellation) speaking exactly its own request identity. A clone is a real addressed owned resource with ancestry to exactly its request, never a silent state flip. Cancellation is observation of the platform-held invocation: custody is unowned, so the authority to cancel belongs to the platform, and this realm observes the fact.
- The one-shot body algebra: unconsumed, consumed-through-an-address, or explicitly cloned. Consuming twice is not a lawful state; cloning is a declared act.
- The request grounding: invocation origin, platform-held (unowned) custody.

## Does not own

- Operation meaning or the HTTP wire projection — downstream over the same admitted value.
- Request evidence — `02_evidence` produces facts from these fields.

## Laws

- The method vocabulary is closed and exact.
- The body arms are exactly the one-shot relationship; consumption yields the consumed arm.
- The request is platform-held with admitted fields.

## Proof obligations

- Raw request fields are admitted through canonical decoders; one-shot behavior is honored at runtime.

`system/01_assurance`; body buffering thresholds are empirical.

## Implementation boundary

Specified. No request parsing or body streaming code exists or is authorized.
