# Editor Wire

Status: specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `02_wires/editor/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Project an editing session as a language-server protocol, without becoming a second editor.

## Owns

- The two protocol flows: a client request that is an ordinary boundary crossing, and a server notification that is not.
- The protocol lifecycle — initial, active, shutting down, exited — and the refusals that belong to it.
- Request correlation, and the protocol's own document version.
- Which state an answer is about: committed, or an editor draft.
- Diagnostic delivery, pushed and pulled.
- How an approved remediation reaches a client.
- The wire's own refusal channel, beside the umbrella's.

## Does not own

- Sessions, selections, working overlays, preview branches, history cursors, edit proposals, or approval. `00_core/17_editor` owns every one, and they are imported.
- Any parser. Turning document text into operations is an injected capability.
- MCP anything. That is a sibling, and the import audit refuses the edge.
- Risk or approval semantics. `ApprovalDecision` already carries the operation policy decision.

## Why it is not MCP

The predecessor's language server lived inside the MCP package, took its advertised version from that package's `package.json`, and reached into `fast-glob`'s internals for glob matching. The capability ledger's ruling is that LSP is an editor wire with its own home, and the packet says it three separate times.

Here that is structural rather than stated. `02_wires/editor` and `02_wires/mcp` are siblings, so the import audit refuses an edge between them — the separation is a check that runs, not a sentence somebody remembers.

## Two flows, and only one of them is an exchange

`WireExchange` describes one inbound request trying to become an invocation and one answer trying to return. That is exactly right for a client request, and wrong for a server-initiated notification.

A notification answers nothing, correlates with no request, and may carry no operation receipt because no operation was invoked. Forcing pushed diagnostics into the exchange algebra to keep one universal shape would make `undelivered` — *the operation ran and the answer was lost* — reachable for a message that never ran anything.

So the notification is its own type, and both absences are checked by name: no request id, no receipt. It carries a sequence, because a stream whose order is only a runtime property cannot be reasoned about, and out-of-order diagnostics leave an editor showing squiggles for a superseded state.

**The umbrella was deliberately not enlarged.** One child needing a push stream does not earn universal wire vocabulary. If a second wire turns out to have the same relationship, that is when it moves up.

## An unsaved buffer is not a dirty snapshot

A `WorkspaceSnapshot` is revision-pinned and records digests read from the revision it names. An editor's whole subject is state that has no revision yet, so a dirty snapshot is not what an unsaved buffer is — it is a different kind of thing, not a degraded version of the same kind.

`EditorCoordinate` says which: a committed answer is about an exact cut, and a draft answer is about a session's working overlay and the preview it produced. Neither substitutes for the other, and `CommittedEditorOutcome` is the refinement a production or release path consumes so it cannot act on text nobody saved.

The protocol's document version stays a protocol coordinate. It may reject a stale update and correlate messages about one document; it may never stand in for a semantic revision or a draft identity, because a version is a counter the editor increments and a revision is a fact about content.

## What the predecessor got right

Its language server is the strongest single artifact in the old repository, and most of this home is a port of its behaviour rather than an invention.

- **An independent lifecycle**, fuzzed by a property test against exactly the phase machine reproduced here. Before initialize and after shutdown are separate refusals here, because answering both with one code left a client unable to tell "I started too early" from "I kept going too late."
- **Requests and notifications distinguished** at the type level and cross-checked at routing.
- **Capabilities projected from the method catalog**, throwing at construction when a row had no backing handler — so a catalog edit could not leave a stale capability advertised. `EditorCapabilities` takes that one step further: the advertised set *is* the handled set, so advertising an unhandled method is not an error to throw but a key that does not exist.
- **Push and pull diagnostics both**, through one projection. Two vocabularies that agree by coincidence is how an editor ends up showing something an assurance run does not.
- **An empty publish clears stale diagnostics.** A document reported dirty and now clean must receive an explicit empty population, or the client keeps the squiggles forever. That is why the pushed population is allowed to be empty.
- **Code actions carrying the exact diagnostic they remediate**, so an offer is evaluable.
- **Notification-handler failure surfaced on an outbound channel.** A notification cannot be answered, so a failure inside one has nowhere to go and is dropped by default; sending it out as a log message is the only honest option.
- **An injected evaluation runner.** The old server took the engine as a parameter and its package declared no dependency on it — which is why that boundary was real rather than promised.

## What it did not have, and why

No document store, `textDocumentSync: 0`, no hover, completion, definition, rename, or semantic tokens. Its `WorkspaceEdit` absence follows from the missing document store rather than from a decision about remediation: with no document contents, a unified diff could not be resolved into text edits, so every remediation projected as a client command.

That was an implementation limit, not a product ceiling. `EditorRemediationProjection` therefore has both arms — a document edit where a faithful source mapping exists, and a command where none does. The second is not a fallback for *not having implemented* the first: a semantic operation with no faithful text projection must not be given a fabricated one.

One thing not ported is a claim. The old module header said diagnostics are pushed on `initialized`; the handler validates state and does nothing else. The doc overstated the code, which is the defect class this repository has spent the week removing.

## Laws

- A draft answer and a committed answer never substitute, in either direction, and a committed outcome cannot be occupied by a draft.
- A server notification carries no request id and no receipt; a request outcome carries its correlation id; the notification carries a sequence.
- Both diagnostic paths carry core's diagnostics, and both arms survive.
- A remediation names the diagnostic it remediates and the approval that permitted it, and both projections derive from an offer; there is no editor-local risk label.
- The protocol refuses use outside its lifecycle and says which way, while still carrying the umbrella's boundary refusal.
- A capability is advertised only for a handled method.

## Proof obligations

Runtime and protocol claims a type cannot express:

- That the transport frames messages correctly and a multi-byte character split across two reads does not corrupt one.
- That handling is serialised enough that a connection closing cannot drop an in-flight publish — the predecessor found this exact race with a fast in-memory stream.
- That a pushed empty population actually reaches the client for a document that became clean.
- That the injected language capability translating document text into operation proposals is the only thing doing so, and that neither this wire nor core acquires a parser by accident.
- That a document edit is emitted only where the semantic operation genuinely maps back to source text.

## Implementation

None.
