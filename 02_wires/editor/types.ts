/**
 * The editor wire: an editing session projected as a language-server protocol.
 *
 * The predecessor's language server lived inside the MCP package, took its
 * version identity from that package, and reached into `fast-glob`'s internals.
 * The packet's ruling is that LSP is an editor wire and not MCP internals, and
 * here that is structural rather than stated: this home may not import
 * `02_wires/mcp` at all — they are siblings, and the import audit refuses the
 * edge.
 *
 * Two facts have no owner upstream, and both are ways an editor protocol
 * quietly becomes a second LiteShip.
 *
 * **Requests and notifications are different flows.** `WireExchange` describes
 * an inbound request trying to become an operation invocation and one answer
 * trying to return. A server notification answers nothing, correlates with no
 * request, and may carry no operation receipt because no operation ran. A
 * server refresh request is answered, but remains protocol coordination rather
 * than an operation crossing. Forcing either into one universal exchange would
 * make `undelivered` — *the operation ran and the answer was lost* — reachable
 * when no operation ran.
 *
 * The umbrella is deliberately not enlarged. One child needing a push stream
 * does not earn universal wire vocabulary; if a second wire turns out to have
 * the same relationship, that is when it moves up.
 *
 * **An unsaved buffer is not a dirty workspace snapshot.** A snapshot is
 * revision-pinned and records digests read from the revision it names. An
 * editor's whole subject is state that has no revision yet. The draft
 * coordinate therefore carries core's preview branch once; the preview owns
 * its overlay, and the overlay owns its session and base. A draft result may
 * never stand where a committed one is required.
 *
 * What this home does not own, because `00_core/17_editor` already does:
 * sessions, selections, working overlays, preview branches, history cursors,
 * edit proposals, and approval. A wire that redeclared any of them would be the
 * second editor state this repository has been deleting all week. Every
 * semantic type below is imported from its owner.
 *
 * It owns no language parser either. Turning document text into operations is
 * an injected capability, for the reason the predecessor got right: its server
 * took the evaluation engine as a parameter and declared no dependency on it,
 * which is why the boundary was real rather than promised.
 *
 * @module
 */

import type {
  Algebra,
  Brand,
  CaseOf,
  Hole,
  NonEmptyTuple,
  Reference,
  Refine,
  Signature,
} from '../../types.js';
import type { Diagnostic } from '../../00_core/00_error/types.js';
import type { ContentAddress } from '../../00_core/01_encoding/types.js';
import type { StreamSequence } from '../../00_core/04_time/types.js';
import type { SemanticCut } from '../../00_core/08_state/types.js';
import type {
  ApprovalDecision,
  EditProposal,
  EditorSessionReference,
  PreviewBranch,
  SelectionSet,
} from '../../00_core/17_editor/types.js';
import type { Explanation } from '../../00_core/18_inspection/types.js';
import type { OperationId, OperationInvocation } from '../../00_core/07_operation/types.js';
import type { WireExchange, WireRefusal } from '../types.js';

// ---------------------------------------------------------------------------
// Protocol identity
// ---------------------------------------------------------------------------

/**
 * One client request's correlation handle.
 *
 * A protocol coordinate, not a semantic one. It matches a response to the
 * request that asked for it and means nothing to core.
 */
export type EditorRequestId<Name extends string = string> = Brand<
  Name,
  'liteship.editor.request-id'
>;

export type EditorConnectionId<Name extends string = string> = Brand<
  Name,
  'liteship.editor.connection-id'
>;
export type EditorConnectionReference<
  Id extends EditorConnectionId = EditorConnectionId,
> = Reference<'editor-connection', Id>;

/**
 * The protocol's own document version.
 *
 * Also a protocol coordinate. It may reject a stale update and correlate
 * messages about one document, and it may never stand in for a semantic
 * revision or a draft identity — a version is a counter the editor increments,
 * and a revision is a fact about content.
 */
export type EditorDocumentVersion<Value extends number = number> = Brand<
  Value,
  'liteship.editor.document-version'
>;

export type EditorDocumentId<Name extends string = string> = Brand<
  Name,
  'liteship.editor.document-id'
>;
export type EditorDocumentReference<Id extends EditorDocumentId = EditorDocumentId> = Reference<
  'editor-document',
  Id
>;

export type EditorSourceLanguage = 'astro' | 'typescript';
export type EditorSourceText = Brand<string, 'liteship.editor.source-text'>;
export type EditorSourceAddress = ContentAddress<'text/plain'>;
export type EditorTextOffset = Brand<number, 'liteship.editor.text-offset'>;

/** Editor-neutral source range; LSP UTF-16 positions are a downstream projection. */
export interface EditorTextRange {
  readonly start: EditorTextOffset;
  readonly end: EditorTextOffset;
}

/** One faithful source-text replacement. */
export interface EditorTextEdit {
  readonly range: EditorTextRange;
  readonly replacement: EditorSourceText;
}

/** One exact protocol document state. */
export interface EditorDocumentState {
  readonly document: EditorDocumentReference;
  readonly version: EditorDocumentVersion;
  readonly language: EditorSourceLanguage;
  readonly source: EditorSourceAddress;
}

/**
 * A document change never becomes semantic meaning by itself. The injected
 * language capability admits it against the previous semantic ancestry.
 */
export type EditorDocumentChange = Algebra<{
  opened: { readonly state: EditorDocumentState; readonly text: EditorSourceText };
  incremental: {
    readonly previous: EditorDocumentState;
    readonly next: EditorDocumentState;
    readonly edits: NonEmptyTuple<EditorTextEdit>;
  };
  replaced: {
    readonly previous: EditorDocumentState;
    readonly next: EditorDocumentState;
    readonly text: EditorSourceText;
    readonly ancestry: EditorCoordinate;
  };
  closed: { readonly state: EditorDocumentState };
}>;

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

/**
 * Where one connection stands in the protocol's own lifecycle.
 *
 * Four phases, because the predecessor's property test fuzzed arbitrary
 * message sequences against exactly this machine and it is the part of that
 * server most worth keeping. A request before initialize and a request after
 * shutdown are both refusals, and they are different refusals.
 */
export type EditorProtocolPhase = Algebra<{
  initial: Record<never, never>;
  active: Record<never, never>;
  shuttingDown: Record<never, never>;
  exited: Record<never, never>;
}>;

// ---------------------------------------------------------------------------
// The coordinate an editor result carries
// ---------------------------------------------------------------------------

/**
 * Which state an editor answer is about.
 *
 * The two arms are the whole reason this type exists. A committed answer is
 * about an exact cut that a revision names. A draft answer is about a session's
 * working overlay and the preview it produced, and it has no revision because
 * the text has not been committed to one.
 *
 * They are separate arms so that neither substitutes for the other. A
 * production or release path that consumed a draft answer would be acting on
 * text nobody saved.
 */
export type EditorCoordinate = Algebra<{
  committed: { readonly cut: SemanticCut };
  draft: { readonly preview: PreviewBranch };
}>;

/** An answer about committed state, and never about a draft. */
export type CommittedCoordinate = CaseOf<EditorCoordinate, 'committed'>;

/** An answer about uncommitted editor state, and never about a commit. */
export type DraftCoordinate = CaseOf<EditorCoordinate, 'draft'>;

/**
 * A document-derived coordinate. Draft state always carries the exact protocol
 * version it describes; semantic-only previews use `EditorCoordinate` instead.
 */
export type EditorDocumentCoordinate = Algebra<{
  committed: {
    readonly document: EditorDocumentReference;
    readonly coordinate: CommittedCoordinate;
  };
  draft: {
    readonly document: EditorDocumentState;
    readonly coordinate: DraftCoordinate;
  };
}>;

/** Result of admitting one source change into the shared semantic program. */
export interface EditorLanguageProduct {
  readonly document: EditorDocumentState;
  readonly proposal: EditProposal;
  readonly preview: PreviewBranch;
  readonly diagnostics: readonly Diagnostic[];
}

/**
 * Injected source-language authority. The wire carries changes to it; neither
 * the wire nor core owns an Astro or TypeScript parser.
 */
export interface EditorLanguageCapability {
  readonly admit: Signature<
    EditorDocumentChange,
    EditorLanguageProduct,
    NonEmptyTuple<Diagnostic>
  >;
}

export type EditorLanguageRequirement = Hole<
  'liteship.editor.language',
  EditorLanguageCapability
>;

/** One document-derived answer, correlated to its exact version when draft. */
export interface EditorDocumentResult<Payload> {
  readonly coordinate: EditorDocumentCoordinate;
  readonly result: Payload;
}

/** A completion item remains semantic until the LSP projection renders it. */
export interface EditorCompletion {
  readonly label: string;
  readonly detail?: string;
  readonly replacement?: EditorTextEdit;
}

/** A semantic hover combines stable explanation with an optional source span. */
export interface EditorHover {
  readonly explanation: Explanation;
  readonly range?: EditorTextRange;
}

/** Exact source destination for definition and source jumps. */
export interface EditorSourceDestination {
  readonly document: EditorDocumentReference;
  readonly source: EditorSourceAddress;
  readonly range: EditorTextRange;
}

/** What changed when the server asks the client to refresh projected facts. */
export type EditorRefreshSubject = Algebra<{
  diagnostics: { readonly coordinate: EditorDocumentCoordinate };
  authority: {
    readonly catalog: ContentAddress<'application/vnd.liteship.authority-graph+cbor'>;
  };
}>;

/** Position-bearing query over one exact document state. */
export interface EditorDocumentQuery {
  readonly coordinate: EditorDocumentCoordinate;
  readonly position: EditorTextOffset;
}

/** Source-backed operation proposal request. */
export interface EditorOperationProposalRequest {
  readonly coordinate: EditorDocumentCoordinate;
  readonly invocation: OperationInvocation;
}

/** Start one semantic editor session at an exact committed base. */
export interface EditorSessionRequest {
  readonly base: SemanticCut;
}

export interface EditorInitializeRequest {
  readonly connection: EditorConnectionReference;
  readonly clientName?: string;
}

export interface EditorInitializeResult {
  readonly connection: EditorConnectionReference;
  readonly capabilities: EditorCapabilities;
}

// ---------------------------------------------------------------------------
// Editor-neutral method authority
// ---------------------------------------------------------------------------

export type EditorMethodDirection = 'client-to-server' | 'server-to-client';
export type EditorMethodKind = 'request' | 'notification';

/** One semantic method and the exact relationship its handler must implement. */
export interface EditorMethodDefinition<
  Id extends string,
  Direction extends EditorMethodDirection,
  Kind extends EditorMethodKind,
  Input,
  Output,
  Failure = NonEmptyTuple<Diagnostic>,
  Phases extends NonEmptyTuple<EditorProtocolPhase['_tag']> = NonEmptyTuple<EditorProtocolPhase['_tag']>,
> {
  readonly id: Id;
  readonly direction: Direction;
  readonly kind: Kind;
  readonly available: Phases;
  readonly handler: Signature<Input, Output, Failure>;
}

type EditorClientRequest<Id extends string, Input, Output, Phases extends NonEmptyTuple<EditorProtocolPhase['_tag']> = readonly ['active']> =
  EditorMethodDefinition<Id, 'client-to-server', 'request', Input, Output, NonEmptyTuple<Diagnostic>, Phases>;
type EditorClientNotification<Id extends string, Input, Phases extends NonEmptyTuple<EditorProtocolPhase['_tag']> = readonly ['active']> =
  EditorMethodDefinition<Id, 'client-to-server', 'notification', Input, void, NonEmptyTuple<Diagnostic>, Phases>;
type EditorServerRequest<Id extends string, Input, Output = void> =
  EditorMethodDefinition<Id, 'server-to-client', 'request', Input, Output, NonEmptyTuple<Diagnostic>, readonly ['active']>;
type EditorServerNotification<Id extends string, Input, Phases extends NonEmptyTuple<EditorProtocolPhase['_tag']> = readonly ['active']> =
  EditorMethodDefinition<Id, 'server-to-client', 'notification', Input, void, NonEmptyTuple<Diagnostic>, Phases>;

/** The complete owner-ratified first editor method population. */
export type EditorMethodCatalog = readonly [
  EditorClientRequest<'lifecycle.initialize', EditorInitializeRequest, EditorInitializeResult, readonly ['initial']>,
  EditorClientNotification<'lifecycle.initialized', EditorConnectionReference>,
  EditorClientRequest<'lifecycle.shutdown', EditorConnectionReference, void>,
  EditorClientNotification<'lifecycle.exit', EditorConnectionReference, readonly ['shuttingDown']>,
  EditorClientNotification<'document.open', CaseOf<EditorDocumentChange, 'opened'>>,
  EditorClientNotification<'document.change', CaseOf<EditorDocumentChange, 'incremental'> | CaseOf<EditorDocumentChange, 'replaced'>>,
  EditorClientNotification<'document.close', CaseOf<EditorDocumentChange, 'closed'>>,
  EditorClientRequest<'diagnostics.pull', EditorDocumentCoordinate, EditorDocumentResult<readonly Diagnostic[]>>,
  EditorServerNotification<'diagnostics.publish', EditorDiagnosticPush>,
  EditorServerRequest<'diagnostics.refresh', CaseOf<EditorRefreshSubject, 'diagnostics'>>,
  EditorClientRequest<'remediation.list', EditorDocumentQuery, EditorDocumentResult<readonly EditorRemediationProjection[]>>,
  EditorClientRequest<'language.complete', EditorDocumentQuery, EditorDocumentResult<readonly EditorCompletion[]>>,
  EditorClientRequest<'language.hover', EditorDocumentQuery, EditorDocumentResult<EditorHover | null>>,
  EditorClientRequest<'language.definition', EditorDocumentQuery, EditorDocumentResult<readonly EditorSourceDestination[]>>,
  EditorClientRequest<'language.source', EditorDocumentQuery, EditorDocumentResult<readonly EditorSourceDestination[]>>,
  EditorServerNotification<'authority.refresh', CaseOf<EditorRefreshSubject, 'authority'>>,
  EditorClientRequest<'operation.preview', EditorOperationProposalRequest, EditorLanguageProduct>,
  EditorClientRequest<'operation.apply', EditorRemediationOffer, EditorRequestOutcome>,
  EditorClientRequest<'editor.session.open', EditorSessionRequest, EditorSessionReference>,
  EditorClientRequest<'editor.draft.preview', EditorDocumentCoordinate, PreviewBranch>,
  EditorServerNotification<'server.log', EditorHandlerFailure, readonly ['active', 'shuttingDown']>
];

type ClientHandledRow<Catalog extends EditorMethodCatalog> =
  Extract<Catalog[number], { readonly direction: 'client-to-server' }>;

/** Advertised semantic capabilities are projected from the actual handled rows. */
export type EditorCapabilities<Catalog extends EditorMethodCatalog = EditorMethodCatalog> = {
  readonly [Row in ClientHandledRow<Catalog> as Row['id']]: Row;
};

/** The concrete carrier relating the catalog to its advertised population. */
export interface EditorProtocolDefinition<Catalog extends EditorMethodCatalog = EditorMethodCatalog> {
  readonly methods: Catalog;
  readonly capabilities: EditorCapabilities<Catalog>;
}

// ---------------------------------------------------------------------------
// Exact LSP 3.17 projection
// ---------------------------------------------------------------------------

export type LspDocumentUri = Brand<string, 'liteship.editor.lsp-document-uri'>;
export type LspRequestId = Brand<string | number, 'liteship.editor.lsp-request-id'>;

/** LSP character positions are UTF-16 code-unit offsets. */
export interface LspPosition {
  readonly line: number;
  readonly character: number;
}

export interface LspRange {
  readonly start: LspPosition;
  readonly end: LspPosition;
}

export interface LspTextEdit {
  readonly range: LspRange;
  readonly newText: string;
}

export interface LspVersionedDocument {
  readonly uri: LspDocumentUri;
  readonly version: EditorDocumentVersion;
}

export interface LspDocumentEdit {
  readonly document: LspVersionedDocument;
  readonly edits: NonEmptyTuple<LspTextEdit>;
}

/** Faithful LSP edit product; an edit arm without edits is unrepresentable. */
export interface LspWorkspaceEdit {
  readonly documentChanges: NonEmptyTuple<LspDocumentEdit>;
}

/** One exact projection from semantic method identity to LSP method spelling. */
export interface LspMethodProjection<
  Semantic extends EditorMethodCatalog[number]['id'],
  Method extends string,
  Direction extends EditorMethodDirection,
  Kind extends EditorMethodKind,
> {
  readonly semantic: Semantic;
  readonly method: Method;
  readonly direction: Direction;
  readonly kind: Kind;
}

export type LspMethodCatalog = readonly [
  LspMethodProjection<'lifecycle.initialize', 'initialize', 'client-to-server', 'request'>,
  LspMethodProjection<'lifecycle.initialized', 'initialized', 'client-to-server', 'notification'>,
  LspMethodProjection<'lifecycle.shutdown', 'shutdown', 'client-to-server', 'request'>,
  LspMethodProjection<'lifecycle.exit', 'exit', 'client-to-server', 'notification'>,
  LspMethodProjection<'document.open', 'textDocument/didOpen', 'client-to-server', 'notification'>,
  LspMethodProjection<'document.change', 'textDocument/didChange', 'client-to-server', 'notification'>,
  LspMethodProjection<'document.close', 'textDocument/didClose', 'client-to-server', 'notification'>,
  LspMethodProjection<'diagnostics.pull', 'textDocument/diagnostic', 'client-to-server', 'request'>,
  LspMethodProjection<'diagnostics.publish', 'textDocument/publishDiagnostics', 'server-to-client', 'notification'>,
  LspMethodProjection<'diagnostics.refresh', 'workspace/diagnostic/refresh', 'server-to-client', 'request'>,
  LspMethodProjection<'remediation.list', 'textDocument/codeAction', 'client-to-server', 'request'>,
  LspMethodProjection<'language.complete', 'textDocument/completion', 'client-to-server', 'request'>,
  LspMethodProjection<'language.hover', 'textDocument/hover', 'client-to-server', 'request'>,
  LspMethodProjection<'language.definition', 'textDocument/definition', 'client-to-server', 'request'>,
  LspMethodProjection<'language.source', 'liteship/source', 'client-to-server', 'request'>,
  LspMethodProjection<'authority.refresh', 'liteship/authority/refresh', 'server-to-client', 'notification'>,
  LspMethodProjection<'operation.preview', 'liteship/operation/preview', 'client-to-server', 'request'>,
  LspMethodProjection<'operation.apply', 'liteship/operation/apply', 'client-to-server', 'request'>,
  LspMethodProjection<'editor.session.open', 'liteship/editor/session', 'client-to-server', 'request'>,
  LspMethodProjection<'editor.draft.preview', 'liteship/editor/preview', 'client-to-server', 'request'>,
  LspMethodProjection<'server.log', 'window/logMessage', 'server-to-client', 'notification'>
];

export type EditorServerNotificationMethod = Extract<
  EditorMethodCatalog[number],
  { readonly direction: 'server-to-client'; readonly kind: 'notification' }
>['id'];

export type EditorServerRequestMethod = Extract<
  EditorMethodCatalog[number],
  { readonly direction: 'server-to-client'; readonly kind: 'request' }
>['id'];

// ---------------------------------------------------------------------------
// Flow one: a client request, which is an exchange
// ---------------------------------------------------------------------------

/**
 * One client request and what became of it.
 *
 * The crossing is the umbrella's, whole. An editor request is an ordinary
 * boundary crossing — it can fail to become an invocation, complete, or run and
 * lose its answer — and the three-way cut is as true here as anywhere.
 *
 * The correlation id rides beside it because a response must name the request
 * it answers. That is a protocol fact the umbrella has no reason to carry.
 */
export interface EditorRequestOutcome<
  Output = unknown,
  Failure = readonly Diagnostic[],
  Op extends OperationId = OperationId,
> {
  readonly request: EditorRequestId;
  readonly crossing: WireExchange<Output, Failure, Op>;
  readonly coordinate: EditorCoordinate;
}

/**
 * A request refused before the protocol's lifecycle allowed it.
 *
 * Distinct from `WireRefusal`'s malformed and unrecognized arms, which are
 * about the message. This is about *when* the message arrived: before
 * initialize, or after shutdown. The predecessor answered both with one
 * invalid-request code and a hand-written sentence; separating them is what
 * lets a client tell "I started talking too early" from "I kept talking too
 * late".
 */
export type EditorLifecycleRefusal = Algebra<{
  beforeInitialize: { readonly attempted: string; readonly phase: CaseOf<EditorProtocolPhase, 'initial'> };
  afterShutdown: { readonly attempted: string; readonly phase: CaseOf<EditorProtocolPhase, 'shuttingDown'> };
  alreadyInitialized: { readonly phase: CaseOf<EditorProtocolPhase, 'active'> };
}>;

// ---------------------------------------------------------------------------
// Flow two: a server notification, which is not an exchange
// ---------------------------------------------------------------------------

/**
 * One server-initiated message.
 *
 * It carries no request id, because it answers nothing. It carries no
 * operation receipt, because no operation was invoked to produce it — and a
 * receipt here would assert that something ran. Both absences are checked by
 * name in the laws, because both are the kind of member that arrives one
 * convenient afternoon.
 *
 * The sequence is what makes ordering inspectable. Pushed diagnostics that
 * arrive out of order leave an editor showing squiggles for a state that has
 * been superseded, and a stream whose order is only a runtime property cannot
 * be reasoned about at all.
 */
export interface EditorNotification<Payload = unknown> {
  readonly connection: EditorConnectionReference;
  readonly method: EditorServerNotificationMethod;
  readonly sequence: StreamSequence;
  readonly payload: Payload;
}

/** Server-to-client request: ordered on the same connection, but answered. */
export interface EditorOutboundRequest<Payload = unknown> {
  readonly connection: EditorConnectionReference;
  readonly request: EditorRequestId;
  readonly method: EditorServerRequestMethod;
  readonly sequence: StreamSequence;
  readonly payload: Payload;
}

/**
 * Diagnostics for one document, pushed.
 *
 * The population is allowed to be empty, and that is load-bearing rather than
 * permissive. A document that was reported dirty and is now clean must receive
 * an explicit empty publish, or the editor keeps the stale squiggles forever —
 * clients drop diagnostics for a document only on an explicit publish for that
 * document. The predecessor learned this in review and the comment is still in
 * its source.
 */
export interface EditorDiagnosticPush {
  readonly diagnostics: readonly Diagnostic[];
  readonly coordinate: EditorDocumentCoordinate;
}

/**
 * A failure that happened while handling a message that gets no response.
 *
 * A notification handler cannot answer, so a failure inside one has nowhere to
 * go and is silently dropped by default. The predecessor surfaced it as an
 * outbound log notification instead, which is the only channel available, and
 * that is the behaviour worth keeping: the failure stays visible without
 * inventing a response to a message that may not have one.
 */
export interface EditorHandlerFailure {
  readonly attempted: string;
  readonly diagnostics: NonEmptyTuple<Diagnostic>;
}

// ---------------------------------------------------------------------------
// Diagnostics: pushed and pulled, one authority
// ---------------------------------------------------------------------------

/**
 * How a client obtained diagnostics.
 *
 * Both arms carry `readonly Diagnostic[]` — core's, the same population an
 * assurance run or a CLI invocation reports. The predecessor supported both
 * paths and used one projection for both, and the alternative is two
 * diagnostic vocabularies that agree by coincidence.
 */
export type EditorDiagnosticDelivery = Algebra<{
  pushed: { readonly push: EditorDiagnosticPush };
  pulled: {
    readonly request: EditorRequestId;
    readonly diagnostics: readonly Diagnostic[];
    readonly coordinate: EditorDocumentCoordinate;
  };
}>;

// ---------------------------------------------------------------------------
// Remediation
// ---------------------------------------------------------------------------

/**
 * One offered remediation, and the diagnostic it remediates.
 *
 * The back-link is required. A code action that floats free of its diagnostic
 * is an action a user cannot evaluate, and the predecessor carried the exact
 * diagnostic object it was offered against for precisely this reason.
 *
 * The proposal and its approval are core's. This wire projects an *approved*
 * decision into the protocol and does not decide anything: `ApprovalDecision`
 * already carries the operation policy decision, and an editor-local risk
 * label would be a second policy.
 */
export interface EditorRemediationOffer {
  readonly remediates: Diagnostic;
  readonly approval: ApprovalDecision;
  readonly selection?: SelectionSet;
}

export interface EditorDocumentEdit {
  readonly document: EditorDocumentState;
  readonly edits: NonEmptyTuple<EditorTextEdit>;
}

export interface EditorWorkspaceEdit {
  readonly documentChanges: NonEmptyTuple<EditorDocumentEdit>;
}

/**
 * How an approved remediation reaches the client.
 *
 * Two arms because the honest answer depends on whether the semantic operation
 * maps faithfully back to source text. The predecessor projected every
 * remediation as a client command, and that was an implementation limit — it
 * had no document store — rather than a product ceiling.
 *
 * `documentEdit` is the faithful case. `command` is the case where no faithful
 * text edit exists, and it is not a fallback for *not having implemented* the
 * edit: a semantic operation with no source-text projection must not be given a
 * fabricated one.
 */
export type EditorRemediationProjection = Algebra<{
  documentEdit: {
    readonly offer: EditorRemediationOffer;
    readonly edit: EditorWorkspaceEdit;
  };
  command: {
    readonly offer: EditorRemediationOffer;
    readonly invocation: OperationInvocation;
    readonly reason: string;
  };
}>;

export interface LspCommand {
  readonly title: string;
  readonly command: string;
  readonly arguments: readonly unknown[];
}

/** LSP rendering of one already-decided semantic remediation projection. */
export type LspRemediationProjection = Algebra<{
  workspaceEdit: {
    readonly source: CaseOf<EditorRemediationProjection, 'documentEdit'>;
    readonly edit: LspWorkspaceEdit;
  };
  command: {
    readonly source: CaseOf<EditorRemediationProjection, 'command'>;
    readonly command: LspCommand;
  };
}>;

// ---------------------------------------------------------------------------
// The wire's own refusal channel
// ---------------------------------------------------------------------------

/**
 * Why this wire refused, protocol-specifically.
 *
 * The umbrella's `WireRefusal` answers *the request never became an
 * invocation*. This adds the editor's own two: the message arrived in the wrong
 * lifecycle phase, and the message named a document version the server has
 * already superseded.
 */
export type EditorRefusal = Algebra<{
  boundary: { readonly refusal: WireRefusal };
  lifecycle: { readonly refusal: EditorLifecycleRefusal };
  staleVersion: {
    readonly document: EditorDocumentReference;
    readonly received: EditorDocumentVersion;
    readonly current: EditorDocumentVersion;
  };
}>;

/** Type summary consumed by the wire topology. */
export interface EditorWireTypeSurface {
  readonly connection: EditorConnectionReference;
  readonly phase: EditorProtocolPhase;
  readonly protocol: EditorProtocolDefinition;
  readonly methods: EditorMethodCatalog;
  readonly lspMethods: LspMethodCatalog;
  readonly coordinate: EditorCoordinate;
  readonly documentCoordinate: EditorDocumentCoordinate;
  readonly documentChange: EditorDocumentChange;
  readonly language: EditorLanguageCapability;
  readonly requestOutcome: EditorRequestOutcome;
  readonly notification: EditorNotification;
  readonly outboundRequest: EditorOutboundRequest;
  readonly diagnosticPush: EditorDiagnosticPush;
  readonly diagnosticDelivery: EditorDiagnosticDelivery;
  readonly handlerFailure: EditorHandlerFailure;
  readonly remediationOffer: EditorRemediationOffer;
  readonly remediationProjection: EditorRemediationProjection;
  readonly lspRemediationProjection: LspRemediationProjection;
  readonly refusal: EditorRefusal;
}

/** A committed answer, refined so a draft cannot occupy it. */
export type CommittedEditorOutcome<
  Output = unknown,
  Failure = readonly Diagnostic[],
  Op extends OperationId = OperationId,
> = Refine<
  EditorRequestOutcome<Output, Failure, Op>,
  { readonly coordinate: CommittedCoordinate }
>;
