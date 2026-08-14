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
 * **An editor protocol has two flows, and only one of them is an exchange.**
 * `WireExchange` describes one inbound request trying to become an invocation
 * and one answer trying to return. That is exactly right for a client request.
 * It is wrong for a server-initiated notification, which answers nothing,
 * correlates with no request, and may carry no operation receipt because no
 * operation was invoked. Forcing pushed diagnostics into the exchange algebra
 * to keep one universal shape would make `undelivered` — *the operation ran and
 * the answer was lost* — reachable for a message that never ran anything.
 *
 * The umbrella is deliberately not enlarged. One child needing a push stream
 * does not earn universal wire vocabulary; if a second wire turns out to have
 * the same relationship, that is when it moves up.
 *
 * **An unsaved buffer is not a dirty workspace snapshot.** A snapshot is
 * revision-pinned and records digests read from the revision it names. An
 * editor's whole subject is state that has no revision yet. So the editor
 * coordinate is core's: a session, a working overlay over an exact base cut,
 * and a draft cut — and a draft result may never stand where a committed one
 * is required.
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
  NonEmptyTuple,
  Reference,
  Refine,
} from '../../types.js';
import type { Diagnostic } from '../../00_core/00_error/types.js';
import type { SemanticCut } from '../../00_core/08_state/types.js';
import type {
  ApprovalDecision,
  EditorSessionReference,
  PreviewBranch,
  SelectionSet,
  WorkingOverlay,
} from '../../00_core/17_editor/types.js';
import type { OperationId } from '../../00_core/07_operation/types.js';
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

/**
 * The protocol's own document version.
 *
 * Also a protocol coordinate. It may reject a stale update and correlate
 * messages about one document, and it may never stand in for a semantic
 * revision or a draft identity — a version is a counter the editor increments,
 * and a revision is a fact about content.
 */
export type EditorDocumentVersion<Name extends string = string> = Brand<
  Name,
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
// The method catalog
// ---------------------------------------------------------------------------

export type EditorMethodDirection = 'client-to-server' | 'server-to-client';
export type EditorMethodKind = 'request' | 'notification';

/**
 * One method, and everything the protocol needs to route it.
 *
 * Direction and kind together are what stop a server-initiated notification
 * from being answered and a client request from going unanswered.
 */
export interface EditorMethod<
  Name extends string = string,
  Direction extends EditorMethodDirection = EditorMethodDirection,
  Kind extends EditorMethodKind = EditorMethodKind,
> {
  readonly method: Name;
  readonly direction: Direction;
  readonly kind: Kind;
}

/** The methods a client may send. */
export type EditorClientMethod<
  Name extends string = string,
  Kind extends EditorMethodKind = EditorMethodKind,
> = EditorMethod<Name, 'client-to-server', Kind>;

/** The methods a server may push. */
export type EditorServerMethod<Name extends string = string> = EditorMethod<
  Name,
  'server-to-client',
  'notification'
>;

/**
 * What the server tells the client it can do.
 *
 * Derived from the methods actually handled, never written beside them. The
 * predecessor projected its capabilities from its method catalog and threw at
 * construction when a row had no backing handler, so a catalog edit could not
 * leave a stale capability advertised. This is that idea one step further: an
 * advertised capability for an unhandled method is not a thrown error, it is
 * unrepresentable, because the advertised set *is* the handled set.
 */
export type EditorCapabilities<Handled extends string> = {
  readonly [Method in Handled]: EditorClientMethod<Method>;
};

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
  draft: {
    readonly session: EditorSessionReference;
    readonly overlay: WorkingOverlay;
    readonly preview: PreviewBranch;
  };
}>;

/** An answer about committed state, and never about a draft. */
export type CommittedCoordinate = CaseOf<EditorCoordinate, 'committed'>;

/** An answer about uncommitted editor state, and never about a commit. */
export type DraftCoordinate = CaseOf<EditorCoordinate, 'draft'>;

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
  readonly method: EditorServerMethod;
  readonly sequence: number;
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
  readonly document: EditorDocumentReference;
  readonly version?: EditorDocumentVersion;
  readonly diagnostics: readonly Diagnostic[];
  readonly coordinate: EditorCoordinate;
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
    readonly coordinate: EditorCoordinate;
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
    readonly document: EditorDocumentReference;
    readonly version?: EditorDocumentVersion;
  };
  command: { readonly offer: EditorRemediationOffer; readonly command: string };
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
  readonly phase: EditorProtocolPhase;
  readonly coordinate: EditorCoordinate;
  readonly requestOutcome: EditorRequestOutcome;
  readonly notification: EditorNotification;
  readonly diagnosticPush: EditorDiagnosticPush;
  readonly diagnosticDelivery: EditorDiagnosticDelivery;
  readonly handlerFailure: EditorHandlerFailure;
  readonly remediationOffer: EditorRemediationOffer;
  readonly remediationProjection: EditorRemediationProjection;
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
