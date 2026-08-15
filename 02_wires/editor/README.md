# Editor Wire

Status: specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `02_wires/editor/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Project the one LiteShip semantic program into an editor-neutral method authority and an exact LSP 3.17 protocol, without becoming a second editor or an MCP subsystem.

Source text is the first human surface. Addressed semantic objects remain the internal authority and remain directly inspectable by agents and future visual tools. No LiteShip file format is introduced: the initial source languages are Astro and TypeScript.

## Owns

- Exact editor-connection identity, lifecycle, request correlation, and connection-scoped outbound ordering.
- Versioned document open, incremental change, full replacement, and close relationships.
- The concrete first semantic method catalog and capabilities derived from its handled rows.
- The exact LSP spelling and UTF-16 coordinate projection of that semantic catalog.
- Client requests, client notifications, server notifications, and answered server refresh requests as distinct flows.
- Draft-versus-committed answer coordinates and document-version correlation.
- Push and pull diagnostic delivery from one diagnostic authority.
- Non-document operation reports projected through core diagnostics and explanations without fabricated document coordinates.
- Faithful source/workspace edits and command-backed semantic remediation where no faithful mapping exists.
- Diagnostic refresh and semantic-authority/catalog refresh.

## Does not own

- Sessions, selections, overlays, preview branches, proposals, approval, operations, explanations, or diagnostics. Core owns them.
- Astro or TypeScript parsing. `EditorLanguageRequirement` injects the language authority.
- LSP mechanics as core meaning. URI spelling, UTF-16 positions, request framing, and LSP capability payloads stay in this wire.
- MCP anything. Editor and MCP are siblings and the import audit refuses the edge.
- Rename, references, formatting, semantic tokens, inlay hints, or code lens. Their exact product paths are not yet earned.

## One source-to-meaning path

The language capability performs the only admitted translation:

`document change -> parsed source relationship -> core operation proposal -> working overlay -> draft preview`

An incremental change names its previous and next document states and carries a non-empty edit population. Full replacement is the explicit recovery and resynchronization arm; it names the prior state and semantic ancestry, so replacing the text cannot silently reset the document's relationship to the semantic program.

`unknown` text does not enter core. The injected language authority either produces an exact `EditorLanguageProduct` or a non-empty diagnostic failure.

## One owner for a draft coordinate

`EditorCoordinate.draft` carries only `PreviewBranch`. The preview already owns its `WorkingOverlay`; the overlay already owns the editor session and exact base cut. Repeating those facts at the wire created a parity triangle with three independently constructible session paths.

Document-derived draft answers use `EditorDocumentCoordinate.draft`, which adds the exact versioned document state beside that semantic coordinate. Diagnostics, completions, hover/explanation, definitions/source locations, edits, and document-specific proposals therefore cannot describe an unsaved document without naming its version. A semantic preview with no document owner uses `EditorCoordinate` directly and invents no document version.

## Concrete method authority

`EditorMethodCatalog` is the actual handled/emitted population. Each row fixes semantic identity, direction, request-versus-notification kind, lifecycle availability, input, output, and failure.

The first population covers:

- initialize, initialized, shutdown, and exit;
- document open, incremental/full change, and close;
- push/pull diagnostics and diagnostic refresh;
- code actions and faithful workspace edits;
- completion, hover/explanation, definition, and source jumps;
- semantic authority/catalog refresh;
- operation preview and approved application;
- editor-session and draft-preview interaction;
- migration invocation over an exact source/adapter request, returning the protocol-neutral migration report;
- visible outbound handler-failure logging.

`EditorCapabilities` is derived from the client-to-server rows of that exact catalog. `EditorProtocolDefinition` carries the catalog and its derived capabilities together, so the mapped operator is proved on the public carrier rather than on a hand-authored method union.

`LspMethodCatalog` projects every semantic method exactly once to its LSP or `liteship/*` protocol spelling. The semantic and projected method populations are equal by law. LSP positions are line plus UTF-16 code-unit character; LSP document edits are versioned and non-empty.

## Requests, notifications, and ordering

An inbound operation request may cross the ordinary `WireExchange`: it can be refused before invocation, complete with an operation receipt, or run and lose its answer.

A server notification answers nothing and ran no operation. It carries no request ID and no receipt. It does carry one exact editor connection and core's `StreamSequence`, giving diagnostics, refresh signals, and logs one causal outbound order.

A server refresh request is answered, so it carries a request ID, but it is protocol coordination rather than an operation invocation and therefore carries no operation receipt. The notification vocabulary remains local to the editor wire until another wire proves the same relationship.

## Synchronization and staleness

Versioned incremental changes are the normal path. Full replacement is the recovery path. Both preserve exact source identity, content address, version, and semantic ancestry.

`EditorRefusal.staleVersion` distinguishes a stale protocol coordinate from malformed input, an unknown method, or a lifecycle violation. Runtime implementation must reject a stale incremental update before asking the language capability to interpret it.

## Diagnostics and refresh

Push and pull carry core's `Diagnostic` population. An empty push is lawful and load-bearing: it clears previously published diagnostics for a document that became clean.

`EditorDiagnosticExplanationProjection` is the corresponding non-document surface. Doctor is its first system consumer: repository, consumer-application, and deployed-application reports name their real subject and operation while reusing core diagnostics and explanation. They carry no document coordinate or version because none owns them.

Initial refresh has exactly two semantic subjects:

- diagnostic refresh, naming the relevant document coordinate;
- authority refresh, naming the addressed authority graph/catalog that changed.

No optional LSP refresh family is implied.

## Remediation

Every offer names the exact diagnostic and core approval decision. The semantic projection has two arms:

- `documentEdit` carries a real, non-empty, versioned `EditorWorkspaceEdit` where source mapping is faithful;
- `command` carries the exact approved operation invocation and an explanation of why no faithful text mapping exists.

The LSP projection turns those into `WorkspaceEdit` or `Command`. A command is not a fallback for an edit nobody implemented.

## What the predecessor contributed

The predecessor established the independent lifecycle, request/notification discrimination, push and pull diagnostics, explicit empty diagnostic clearing, diagnostic-linked code actions, visible notification-handler failures, injected evaluation authority, and catalog-derived capabilities.

It had no document store, advertised `textDocumentSync: 0`, and projected unified diffs only as commands. It also claimed diagnostics were pushed on `initialized` while the handler did nothing. Those implementation limits and the false claim are not ported.

## Laws

- A draft coordinate owns one preview and cannot occupy a committed outcome.
- Notifications carry no request or receipt, and are ordered within one exact connection by `StreamSequence`.
- Every document-derived draft answer names the exact document version.
- Incremental changes name previous and next states; replacement preserves ancestry; only the injected language capability admits source.
- A remediation carries either non-empty edits or the exact semantic invocation.
- The protocol lifecycle refuses early and late use distinctly.
- The concrete semantic method population equals the LSP projection population.
- Capabilities derive from the handled catalog, including hover and completion and excluding unearned rename.
- Non-document diagnostic/explanation projection names its exact operation and invents no document version.

## Proof obligations

Runtime and protocol claims a type cannot express:

- Framing preserves multi-byte characters across split reads.
- Connection shutdown cannot drop an in-flight publish.
- UTF-16 LSP ranges project to the intended editor-neutral source offsets.
- Stale changes are rejected before parsing or proposal construction.
- Empty diagnostic populations reach the client.
- The injected language capability is the only source parser.
- Full replacement preserves semantic ancestry.
- An edit is emitted only where the operation maps faithfully to source.
- A command is used only for an explicitly unmappable semantic operation.

## Implementation

None.
