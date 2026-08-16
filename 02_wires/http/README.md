# HTTP Wire: Request and Response Across Address Spaces

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `02_wires/http/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Project one boundary crossing into an HTTP response without letting a status code answer two questions at once.

## Owns

- The status *class*, not the code.
- Method safety, as a promise about repetition rather than a list of verbs.
- Retry eligibility, which exists only where the operation ran.
- The projection from a crossing to a response.

## Does not own

- Headers, bodies, negotiation, framing, or connection lifetime. `01_hosts` owns the physical channel.
- Status codes. Three digits are a specification this repository does not own; the class is the semantic content.
- The verb table. `GET` is safe and `POST` is not, and restating that here would be a second copy of somebody else's document.
- What an operation decided. That is core's, and it arrives in the receipt.

## One integer, two questions

A status code is asked to carry *what happened to the crossing* and *what the operation decided*, and the answer to one does not constrain the other.

So a `500` hides a malformed request. A `200` hides an operation that refused. A gateway timeout reads as a business failure. And the expensive one: a client that treats a lost answer as a failed operation, and retries without the idempotency key, runs the operation twice.

`HttpProjection` refuses the merge. Each arm carries the exact crossing arm it projects, and the status class is pinned wherever only one class is honest:

- **rejected** is always a client error. The request never became an invocation, so the client sent something this wire could not turn into a call, and there is no receipt because there is nothing to have a receipt of.
- **lost** is always a server error, and may never be a client error. The operation ran. Telling the client it made a mistake invites the retry that runs it twice.
- **answered** is free, and that freedom is as load-bearing as the two constraints. Its class is a function of the receipt's outcome, not of the transport: an operation that refused is a client error *with a receipt*, one that failed is a server error *with a receipt*, and both arrived. A grammar forcing `success` here is how an operation's own refusal becomes invisible, and it is the single most common defect in HTTP API design.

## Retry eligibility exists only where the operation ran

A rejected crossing may always be resent — nothing happened. An answered crossing has its answer. Only a lost answer poses the question, so only the lost arm carries `retry`, and putting the member anywhere else would invite a client to consult a value that is always the same.

`forbidden` is the arm that justifies the type. An unsafe method with no idempotency key whose answer was lost must be **nameable**, so a client can branch on it rather than guess. The industry default is to have no name for this and retry anyway.

## Laws

- HTTP narrows nothing: all three exchange arms and both refusals are reachable, checked so a later edit cannot decide the awkward arm is unnecessary here either.
- A lost answer never projects to a client error; a rejected request never projects to success; an answered crossing keeps the full class range.
- Retry eligibility is present on the lost arm and absent from the other two.
- A projection is exact over its operation, with the anti-vacuity partner for the carrier dropping its parameter.
- HTTP migration uses the same crossing projection over core's exact migration report and failure; authorization and source admission remain host concerns.

## Proof obligations

Runtime claims a type cannot express:

- That the concrete code chosen within a class is the right one — that unrecognized is 404 rather than 400, and malformed is 400 rather than 422.
- That an idempotency key presented on a retry names the same invocation as the lost one.
- That a proxy or load balancer between the caller and this wire has not turned a completed crossing into an undelivered one without saying so.
- That a method declared safe performs no effect.

## Implementation

None. The projection is a contract; the server that satisfies it does not exist yet and reaches this wire through a host capability.
