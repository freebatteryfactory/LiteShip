# Web Sink Policy

Status: specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `01_hosts/web/02_security/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Own the physical browser policy enforced at every write: URL schemes, attributes, elements, HTML sinks, Trusted Types, node construction, text insertion, and listener attachment.

## Owns

- The fail-closed allowlist sink policy and its deployment-grounded Trusted Types identity.
- The sink vocabulary, with text insertion and markup as distinct sinks.
- Structured, explained sink refusal.

## Does not own

- Semantic content admission. Core admits meaning; this home refuses physical writes.
- A trust ladder. The trust families are structurally distinct routes declared where they are applied, not ranks on one scale.

## Allowlists, not denylists

Every policy is an allowlist. A denylist over an open grammar spawns endless neighboring evasions; an empty allowlist safely denies everything. Trusted content is not exempt: an attested fragment still passes scheme, attribute, element, and Trusted Types enforcement at the physical write, because trusted-producer and safe-in-this-sink are different facts.

Sanitization happens at more than one boundary and this home is only one of them: core content admission rejects or attenuates hostile semantic input; grounding admission validates bootstrap capabilities; this home enforces context-sensitive sink policy at application time. There is no single generic sanitizer function.

## Laws

- The policy is allowlists — DOM sinks and the network edge (origins, credentials, redirects) alike; no denylist field exists.
- Every refusal explains itself, and a refusal's reason cannot contradict its sink.
- Text and markup remain distinct sinks; generated text inserts as text, and the text sink is infallible by design — it never refuses.
- Trusted content remains subject to physical policy.
- The policy enters through an admitted deployment grounding slot.

## Proof obligations

- Every physical write actually routes through the policy; no write path bypasses it.
- The deployed policy population matches the deployment-grounded declaration.

Both are `system/01_assurance` obligations.

## Implementation boundary

Specified. No sanitizer, Trusted Types registration, or DOM policy code exists or is authorized.
