# Astro Server Attachment

Status: specified; implementation absent

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

## The connection the predecessor never made

The old integration got the routing half right: it injected no route and shipped unregistered request handlers the consuming application mounted itself. Its own architecture document said so — "the host owns the store, the route, and thus the authority."

What it got wrong was everything underneath. Those handlers owned HTTP directly: 415, 400, 409, 422, 405, 413, 304, weak entity tags, and two independent hand-rolled JSON-RPC implementations that shared nothing. Meanwhile a transport-free operation vocabulary already existed in the same repository — invocation, result, receipt, with a dispatcher — wired to the CLI and to MCP and **never to Astro**.

This home is that unmade connection, and it owns none of the HTTP.

## Laws

- An attachment names one exact operation, and two operations are not interchangeable.
- An attachment carries the host's admitted request and commit grant, written against the imported authorities so a local twin fails.
- An attachment owns no transport policy: ten keys the predecessor's route factories owned are absent by law.
- The outcome is a core receipt, not a response — a target that produced a response would have chosen a status and a representation.
- An unmountable attachment says why and carries no receipt.

## Proof obligations

- That a runtime attachment invokes the operation it names.
- That a commit grant is honoured only for its correlated request.

Assurance-and-implementation territory.

## Implementation boundary

Specified. No code exists or is authorized.
