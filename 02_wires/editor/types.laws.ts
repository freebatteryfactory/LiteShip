/**
 * Compile-time laws for `02_wires/editor`.
 *
 * A law is a fixture about the specification, not part of it.
 *
 * @module
 */

import type { Assert, CaseOf, Equal, IsExactlyTrue, NonEmptyTuple, TagOf } from '../../types.js';
import type { Diagnostic } from '../../00_core/00_error/types.js';
import type { ApprovalDecision } from '../../00_core/17_editor/types.js';
import type {
  CommittedCoordinate,
  CommittedEditorOutcome,
  DraftCoordinate,
  EditorCapabilities,
  EditorCoordinate,
  EditorDiagnosticDelivery,
  EditorHandlerFailure,
  EditorNotification,
  EditorProtocolPhase,
  EditorRefusal,
  EditorRemediationOffer,
  EditorRemediationProjection,
  EditorRequestOutcome,
} from './types.js';

/**
 * Compile-time law: a draft answer and a committed answer never substitute.
 *
 * The reason this home exists. An unsaved buffer has no revision, so it cannot
 * be a dirty workspace snapshot; it is a session's overlay and the preview it
 * produced. Lines one and two are the mutual refusal in both directions — a
 * committed coordinate is not a draft one and a draft one is not committed.
 *
 * Line three is the consequence that matters: a request outcome refined to the
 * committed arm cannot be occupied by a draft answer, which is what stops a
 * production or release path from acting on text nobody saved. Line four is
 * the lawful direction, and line five is the anti-vacuity partner, since
 * `Refine` resolves to `never` for a change that narrows nothing.
 */
export type ADraftAnswerNeverStandsWhereACommittedOneIsRequired = Assert<
  IsExactlyTrue<
    Equal<
      [
        CommittedCoordinate extends DraftCoordinate ? true : false,
        DraftCoordinate extends CommittedCoordinate ? true : false,
        EditorRequestOutcome extends CommittedEditorOutcome ? true : false,
        CommittedEditorOutcome extends EditorRequestOutcome ? true : false,
        [CommittedEditorOutcome] extends [never] ? true : false,
        Equal<TagOf<EditorCoordinate>, 'committed' | 'draft'>,
      ],
      [false, false, false, true, false, true]
    >
  >
>;

/**
 * Compile-time law: a server notification answers nothing and ran nothing.
 *
 * A notification carries no request id because it correlates with no request,
 * and no receipt because no operation was invoked to produce it. Both are
 * checked by name, because both are the member that arrives one convenient
 * afternoon — and a receipt in particular would assert that something ran.
 *
 * Line three is the other half: a request outcome *does* carry its correlation
 * id, so the two flows are distinguishable rather than merely differently
 * documented. Line four pins the ordering handle, since a stream whose order is
 * only a runtime property cannot be reasoned about.
 */
export type ANotificationCorrelatesWithNothingAndRunsNothing = Assert<
  IsExactlyTrue<
    Equal<
      [
        'request' extends keyof EditorNotification ? true : false,
        'receipt' extends keyof EditorNotification ? true : false,
        'request' extends keyof EditorRequestOutcome ? true : false,
        'sequence' extends keyof EditorNotification ? true : false,
        'crossing' extends keyof EditorNotification ? true : false,
      ],
      [false, false, true, true, false]
    >
  >
>;

/**
 * Compile-time law: both diagnostic paths carry core's diagnostics.
 *
 * The predecessor supported push and pull and projected both through one
 * conversion. Two vocabularies that agree by coincidence is the alternative,
 * and it is how an editor ends up showing something an assurance run does not.
 *
 * Line three pins that both arms survive, so removing the pull path is a
 * visible edit rather than a quiet narrowing.
 */
export type BothDiagnosticPathsUseOneAuthority = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<CaseOf<EditorDiagnosticDelivery, 'pushed'>['push']['diagnostics'], readonly Diagnostic[]>,
        Equal<CaseOf<EditorDiagnosticDelivery, 'pulled'>['diagnostics'], readonly Diagnostic[]>,
        Equal<TagOf<EditorDiagnosticDelivery>, 'pushed' | 'pulled'>,
        Equal<EditorHandlerFailure['diagnostics'], NonEmptyTuple<Diagnostic>>,
      ],
      [true, true, true, true]
    >
  >
>;

/**
 * Compile-time law: a remediation names the diagnostic it remediates and the
 * approval that permitted it.
 *
 * The back-link is required rather than optional: an offer floating free of its
 * diagnostic is one a user cannot evaluate. The approval is core's
 * `ApprovalDecision`, which already carries the operation policy decision — an
 * editor-local risk label would be a second policy, and the editor is not
 * entitled to one.
 *
 * Lines three and four pin that both projections derive from an offer, so a
 * command cannot be emitted for a remediation nobody approved and a document
 * edit cannot be fabricated for an operation with no faithful source mapping.
 */
export type ARemediationNamesItsDiagnosticAndItsApproval = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<EditorRemediationOffer['remediates'], Diagnostic>,
        Equal<EditorRemediationOffer['approval'], ApprovalDecision>,
        Equal<CaseOf<EditorRemediationProjection, 'documentEdit'>['offer'], EditorRemediationOffer>,
        Equal<CaseOf<EditorRemediationProjection, 'command'>['offer'], EditorRemediationOffer>,
        'risk' extends keyof EditorRemediationOffer ? true : false,
      ],
      [true, true, true, true, false]
    >
  >
>;

/**
 * Compile-time law: the protocol refuses use outside its lifecycle, and says
 * which way.
 *
 * Before initialize and after shutdown are different refusals. The predecessor
 * answered both with one invalid-request code and a hand-written sentence, so a
 * client could not tell "I started talking too early" from "I kept talking too
 * late" without reading prose.
 *
 * Line four pins that the editor's refusal channel still carries the umbrella's
 * boundary refusal rather than replacing it — a malformed message is a
 * malformed message here as everywhere.
 */
export type TheProtocolRefusesUseOutsideItsLifecycle = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<TagOf<EditorProtocolPhase>, 'initial' | 'active' | 'shuttingDown' | 'exited'>,
        'beforeInitialize' extends TagOf<CaseOf<EditorRefusal, 'lifecycle'>['refusal']> ? true : false,
        'afterShutdown' extends TagOf<CaseOf<EditorRefusal, 'lifecycle'>['refusal']> ? true : false,
        'boundary' extends TagOf<EditorRefusal> ? true : false,
        'staleVersion' extends TagOf<EditorRefusal> ? true : false,
      ],
      [true, true, true, true, true]
    >
  >
>;

type HandledLaw = 'textDocument/diagnostic' | 'textDocument/codeAction';

/**
 * Compile-time law: a capability is advertised only for a handled method.
 *
 * The predecessor projected its capabilities from its method catalog and threw
 * at construction when a row had no backing handler, so a catalog edit could
 * not leave a stale capability green. That is a good mechanism and this is one
 * step further: the advertised set *is* the handled set, so advertising an
 * unhandled method is not an error to throw, it is a key that does not exist.
 *
 * Line two is the proof — a method outside the handled union is not a key of
 * the projection.
 */
export type ACapabilityIsAdvertisedOnlyForAHandledMethod = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<keyof EditorCapabilities<HandledLaw>, HandledLaw>,
        'textDocument/hover' extends keyof EditorCapabilities<HandledLaw> ? true : false,
        'textDocument/diagnostic' extends keyof EditorCapabilities<HandledLaw> ? true : false,
      ],
      [true, false, true]
    >
  >
>;
