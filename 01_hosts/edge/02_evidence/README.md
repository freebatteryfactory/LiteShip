# Edge Request Evidence

Status: specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `01_hosts/edge/02_evidence/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Own the physical request-time evidence producers — Client Hints and other admitted request facts — with exact source identity, request lifetime, and a conservative declared relationship to the browser's live classifier.

## Owns

- `EdgeSourcedEvidenceUpdate<Source>`: an update naming its exact core source, with no identity-erasing default.
- The source-correlated `read` contract: asking for source A yields an update of A, provably not B.
- The hint-source grounding (invocation origin) and the request-evidence offer.
- The hint-source input is the admitted request-header row the invocation actually supplies, not a contentless marker.

## Does not own

- Evidence vocabulary, classifier codomains, defaults, precedence — core. Live browser evidence — web. Authorization — nothing here ever authorizes; advisory hints affect presentation only.

## Laws

- Reading is source-correlated; a source-A update is not a source-B update.
- An edge update names its exact source reference.

## Proof obligations

- The producer census is complete in both directions.
- The conservative edge/web classifier relation holds in implementation.
- Advisory hints never confer authorization.

All `system/01_assurance`.

## Implementation boundary

Specified. No header-parsing or hint-decoding code exists or is authorized.
