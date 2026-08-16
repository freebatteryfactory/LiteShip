# Astro Server Attachment

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `02_targets/astro/05_server/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Connect the ecosystem's server lifecycle to authorities that already exist: one exact core operation, over an admitted host request, with a correlated response-commit grant, at a location the application chose.

## Owns

- The mount location, opaque — this child does not parse, match, or rank routes.
- The attachment binding a location to one exact operation invocation, one admitted request, and one commit grant.
- The attachment outcome: a core receipt, or an explicit refusal.

## Does not own

- Routes. The application owns them; `injectRoute` stays at zero.
- Status policy, header policy, entity tags, content negotiation, request decoding, or protocol framing. The host owns those, and `02_wires/` will own protocol projection.
- A dispatcher. Core already has one.

## Operation attachment without transport ownership

The consuming application owns routes, while this home attaches exact core operations to the host's admitted request and commit grant. If the attachment owned status codes, entity tags, content negotiation, or protocol framing, Astro would become a second wire. This home therefore owns none of HTTP.

## Laws

- An attachment names one exact operation, and two operations are not interchangeable.
- An attachment carries the host's admitted request and commit grant, written against the imported authorities so a local twin fails.
- An attachment owns no transport policy: status, headers, entity tags, negotiation, decoding, and framing keys are absent by law.
- The outcome is a core receipt, not a response — a target that produced a response would have chosen a status and a representation.
- An unmountable attachment says why and carries no receipt.

## Proof obligations

- That a runtime attachment invokes the operation it names.
- That a commit grant is honoured only for its correlated request.

Assurance-and-implementation territory.

## Implementation boundary

A realization must satisfy the laws and proof obligations above through this home's declared authorities.
