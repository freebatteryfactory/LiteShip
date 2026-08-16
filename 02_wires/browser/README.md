# Browser Wire: A Crossing Inside One Page

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `02_wires/browser/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Carry an operation between a document and a worker or frame, and account for the one thing this boundary does that no other does: it can move the input instead of copying it.

## Owns

- The transferable name, and the disposition — copied or transferred.
- The loss algebra, split by whether the caller can do anything about it.
- The exchange, which is the umbrella's arms with the lost one refined.

## Does not own

- Messages, ports, channels, events, or serialization. `01_hosts/worker` owns the physical transport.
- The structured-clone algorithm. This home owns what the transfer costs, not how it works.
- Anything about the DOM. No wire touches a realm's globals.

## A transfer makes recovery structurally unavailable

Every other wire's undelivered arm means *the operation ran and you did not hear back*, and the remedy is a retry with the idempotency key core already owns.

Here the remedy can be gone. If the request transferred its buffers, the caller no longer owns them: the bytes are detached in the calling realm, reading them is not slow but impossible, and there is nothing left to send again. The operation ran, the answer is lost, and the request cannot be reconstructed.

A vocabulary that models this as *undelivered, retry with a key* is describing a recovery the caller cannot perform.

So `BrowserLoss` splits. `recoverable` carries the key, because the input was copied and still exists. `unrecoverable` carries the names of what moved and **no key and no retry member at all**.

The absence is the design. A `retry?: never` or a `retryable: false` are both members a consumer can read and misread; absence cannot be misread. The only honest responses are to report it, or to re-acquire the data from wherever it originally came from — which is a different operation with a different receipt.

## The other two arms are the umbrella's, taken whole

`completed` and `refused` are `Exclude`d from the umbrella rather than redeclared. A child that wrote its own `completed` with identical members would look the same here and be a second vocabulary — the failure `direct` avoided by narrowing with `Extract` instead of declaring less.

## Laws

- The unrecoverable arm carries neither an idempotency key nor a retry member; the recoverable arm carries the key.
- Each arm is pinned to its own disposition, so an unrecoverable loss cannot claim its input was copied.
- A transfer moved something: the population is non-empty, because a transfer of nothing is a copy, and a possibly-empty one would let a recoverable loss be reported as permanent.
- The completed and refused arms are the umbrella's arms exactly, not restatements of them.

## Proof obligations

Runtime claims a type cannot express:

- That the buffers named in a transferred disposition are the ones that were actually detached.
- That a copied disposition really copied — that no implementation transferred and reported a copy.
- That the receiving realm did not retain a reference after the answer was lost, which would make recovery possible by a route this type cannot see.

## Implementation

None.
