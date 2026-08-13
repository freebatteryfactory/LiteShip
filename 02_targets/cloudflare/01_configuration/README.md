# Cloudflare Configuration Admission

Status: specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `02_targets/cloudflare/01_configuration/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Separate platform-facing configuration from configuration this child will act on, and carry the two axes a deployment cannot be described without: which runtime generation it targets, and where it answers.

## Owns

- Raw platform configuration: unvalidated contents, and nothing else.
- Admitted configuration: an exact configuration revision, a compatibility date, opt-in flags, and routes.
- The admission decision and its diagnostics.

## Does not own

- Route matching or ranking. Routes are opaque here.
- Credentials, accounts, or platform tokens.
- Any other home's configuration shape.

## Why the compatibility date is not optional

It selects platform runtime behaviour. A deployment that does not carry one is not "using the default" — it is using whatever the platform happens to mean on the day it is deployed, which is a different program next month with no record that anything changed.

Optionality is the specific escape. Under `exactOptionalPropertyTypes` an optional member admits `undefined`, and undefined here means unpinned.

## Laws

- Raw configuration cannot stand in for admitted configuration, in either direction.
- Admitted configuration pins an exact revision.
- The compatibility date is required and branded — not optional, and not a bare string.
- A malformed admission carries diagnostics and no configuration.

## Proof obligations

- That the stated compatibility date is the one the platform actually applied.
- That declared routes are the routes actually served.

Assurance-and-implementation territory.

## Implementation boundary

Specified. No code exists or is authorized.
