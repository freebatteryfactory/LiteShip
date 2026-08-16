/**
 * Compile-time laws for `02_wires/editor`.
 *
 * A law is a fixture about the specification, not part of it.
 *
 * @module
 */

import type {
  Assert,
  CaseOf,
  Equal,
  HoleContract,
  InputOf,
  IsExactlyTrue,
  MaybePromise,
  NonEmptyTuple,
  OutputOf,
  Refine,
  Result,
  TagOf,
} from '../../types.js';
import type { Diagnostic } from '../../00_core/00_error/types.js';
import type { StreamSequence } from '../../00_core/04_time/types.js';
import type {
  OperationId,
  OperationReceipt,
  OperationReference,
} from '../../00_core/07_operation/types.js';
import type { Explanation } from '../../00_core/18_inspection/types.js';
import type {
  MigrationAdapter,
  MigrationFailure,
  MigrationReport,
  MigrationRequestId,
} from '../../00_core/14_compiler/types.js';
import type { ApprovalDecision, PreviewBranch } from '../../00_core/17_editor/types.js';
import type {
  CommittedCoordinate,
  CommittedEditorOutcome,
  DraftCoordinate,
  EditorCapabilities,
  EditorConnectionId,
  EditorConnectionOrder,
  EditorConnectionReference,
  EditorCompletion,
  EditorCoordinate,
  EditorDiagnosticDelivery,
  EditorDiagnosticExplanationProjection,
  EditorChangedDocument,
  EditorDocumentChange,
  EditorDocumentAdmission,
  EditorDocumentCoordinate,
  EditorDocumentEdit,
  EditorDocumentId,
  EditorDocumentState,
  EditorDocumentVersion,
  EditorDocumentQuery,
  EditorDocumentResult,
  EditorHandlerFailure,
  EditorLanguageCapability,
  EditorLanguageAdmission,
  EditorLanguageProduct,
  EditorLanguageRequirement,
  EditorMethodCatalog,
  EditorMigrationMethod,
  EditorMigrationAdmission,
  EditorMigrationRequest,
  EditorNotification,
  EditorProtocolDefinition,
  EditorProtocolPhase,
  EditorRefusal,
  EditorRemediationOffer,
  EditorRemediationProjection,
  EditorRequestOutcome,
  EditorSourceLanguage,
  LspMethodCatalog,
  LspMethodNameMap,
  LspMethodProjection,
  LspPosition,
  LspWorkspaceEdit,
} from './types.js';

type EditorInspectionLawReport = {
  readonly subject: { readonly kind: 'workspace' };
  readonly diagnostics: readonly Diagnostic[];
  readonly explanation: Explanation;
};
type EditorInspectionLawOp = OperationId<'law.editor.inspection'>;

export type NonDocumentReportsProjectWithoutInventingADocumentVersion = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<EditorDiagnosticExplanationProjection<EditorInspectionLawReport, EditorInspectionLawOp>['report'], EditorInspectionLawReport>,
        Equal<EditorDiagnosticExplanationProjection<EditorInspectionLawReport, EditorInspectionLawOp>['operation'], OperationReference<EditorInspectionLawOp>>,
        Equal<EditorDiagnosticExplanationProjection<EditorInspectionLawReport>['report']['explanation'], Explanation>,
        Equal<EditorDiagnosticExplanationProjection<EditorInspectionLawReport>['report']['diagnostics'], readonly Diagnostic[]>,
        'coordinate' extends keyof EditorDiagnosticExplanationProjection<EditorInspectionLawReport> ? true : false,
        'version' extends keyof EditorDiagnosticExplanationProjection<EditorInspectionLawReport> ? true : false,
      ],
      [true, true, true, true, false, false]
    >
  >
>;

export type ADraftAnswerHasOneOwnerAndNeverStandsForACommit = Assert<
  IsExactlyTrue<
    Equal<
      [
        CommittedCoordinate extends DraftCoordinate ? true : false,
        DraftCoordinate extends CommittedCoordinate ? true : false,
        EditorRequestOutcome extends CommittedEditorOutcome ? true : false,
        CommittedEditorOutcome extends EditorRequestOutcome ? true : false,
        [CommittedEditorOutcome] extends [never] ? true : false,
        Equal<TagOf<EditorCoordinate>, 'committed' | 'draft'>,
        Equal<DraftCoordinate['preview'], PreviewBranch>,
        'session' extends keyof DraftCoordinate ? true : false,
        'overlay' extends keyof DraftCoordinate ? true : false,
      ],
      [false, false, false, true, false, true, true, false, false]
    >
  >
>;

export type ANotificationIsOrderedWithinOneNamedConnection = Assert<
  IsExactlyTrue<
    Equal<
      [
        'request' extends keyof EditorNotification ? true : false,
        'receipt' extends keyof EditorNotification ? true : false,
        'request' extends keyof EditorRequestOutcome ? true : false,
        Equal<EditorNotification['order']['sequence'], StreamSequence>,
        Equal<
          EditorNotification<unknown, EditorConnectionId<'law.editor.connection-a'>>['order'],
          EditorConnectionOrder<EditorConnectionId<'law.editor.connection-a'>>
        >,
        EditorNotification<
          unknown,
          EditorConnectionId<'law.editor.connection-b'>
        > extends EditorNotification<unknown, EditorConnectionId<'law.editor.connection-a'>>
          ? true
          : false,
        'connection' extends keyof EditorNotification ? true : false,
        'sequence' extends keyof EditorNotification ? true : false,
        'crossing' extends keyof EditorNotification ? true : false,
      ],
      [false, false, true, true, true, false, false, false, false]
    >
  >
>;

export type EveryDraftDocumentAnswerNamesItsVersion = Assert<
  IsExactlyTrue<
    Equal<
      [
        'version' extends keyof CaseOf<EditorDocumentCoordinate, 'draft'>['document'] ? true : false,
        'version' extends keyof CaseOf<EditorDocumentCoordinate, 'committed'>['document'] ? true : false,
        Equal<CaseOf<EditorDiagnosticDelivery, 'pushed'>['push']['coordinate'], EditorDocumentCoordinate>,
        Equal<CaseOf<EditorDiagnosticDelivery, 'pulled'>['coordinate'], EditorDocumentCoordinate>,
        Equal<CaseOf<EditorDiagnosticDelivery, 'pushed'>['push']['diagnostics'], readonly Diagnostic[]>,
        Equal<CaseOf<EditorDiagnosticDelivery, 'pulled'>['diagnostics'], readonly Diagnostic[]>,
        Equal<EditorHandlerFailure['diagnostics'], NonEmptyTuple<Diagnostic>>,
      ],
      [true, false, true, true, true, true, true]
    >
  >
>;

export type ASourceChangePreservesAncestryAndUsesTheInjectedLanguageAuthority = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<EditorSourceLanguage, 'astro' | 'typescript'>,
        Equal<TagOf<EditorDocumentChange>, 'opened' | 'incremental' | 'replaced' | 'closed'>,
        'previous' extends keyof CaseOf<EditorDocumentChange, 'incremental'> ? true : false,
        'next' extends keyof CaseOf<EditorDocumentChange, 'incremental'> ? true : false,
        'ancestry' extends keyof CaseOf<EditorDocumentChange, 'replaced'> ? true : false,
        Equal<HoleContract<EditorLanguageRequirement>, EditorLanguageCapability>,
      ],
      [true, true, true, true, true, true]
    >
  >
>;

export type ARemediationCarriesTheEditOrTheExactSemanticInvocation = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<EditorRemediationOffer['approval'], ApprovalDecision>,
        Equal<CaseOf<EditorRemediationProjection, 'documentEdit'>['offer'], EditorRemediationOffer>,
        Equal<CaseOf<EditorRemediationProjection, 'command'>['offer'], EditorRemediationOffer>,
        CaseOf<EditorRemediationProjection, 'documentEdit'>['edit']['documentChanges'] extends NonEmptyTuple<EditorDocumentEdit>
          ? true
          : false,
        'invocation' extends keyof CaseOf<EditorRemediationProjection, 'command'> ? true : false,
        'risk' extends keyof EditorRemediationOffer ? true : false,
        LspWorkspaceEdit['documentChanges'] extends NonEmptyTuple<unknown> ? true : false,
        Equal<keyof LspPosition, 'line' | 'character'>,
      ],
      [true, true, true, true, true, false, true, true]
    >
  >
>;

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

type CatalogId = EditorMethodCatalog[number]['id'];
type ProjectedId = LspMethodCatalog[number]['semantic'];
type InitializeRow = Extract<EditorMethodCatalog[number], { readonly id: 'lifecycle.initialize' }>;
type ExitRow = Extract<EditorMethodCatalog[number], { readonly id: 'lifecycle.exit' }>;
type OperationApplyRow = Extract<
  EditorMethodCatalog[number],
  { readonly id: 'operation.apply' }
>;
type MigrationRunRow = Extract<
  EditorMethodCatalog[number],
  { readonly id: 'migration.run' }
>;
type DiagnosticsPullRow = Extract<
  EditorMethodCatalog[number],
  { readonly id: 'diagnostics.pull' }
>;
type CompletionRow = Extract<
  EditorMethodCatalog[number],
  { readonly id: 'language.complete' }
>;
type EditorMigrationLawA = MigrationRequestId<'liteship.wire.editor.migration.a'>;
type EditorMigrationLawB = MigrationRequestId<'liteship.wire.editor.migration.b'>;
type BroadEditorMigrationAdmission = (
  request: EditorMigrationRequest,
) => MaybePromise<Result<MigrationReport, MigrationFailure>>;
type NestedEditorMigrationAdmission = <
  Adapter extends MigrationAdapter,
  Request extends MigrationRequestId,
>(
  request: EditorMigrationRequest<Adapter, Request>,
) => MaybePromise<
  Result<EditorRequestOutcome<MigrationReport<Adapter, Request>, MigrationFailure>, MigrationFailure>
>;

export type TheConcreteCatalogOwnsCapabilitiesAndLspProjection = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<CatalogId, ProjectedId>,
        Equal<keyof LspMethodNameMap, CatalogId>,
        Equal<LspMethodCatalog['length'], EditorMethodCatalog['length']>,
        Equal<
          EditorProtocolDefinition['capabilities'],
          EditorCapabilities<EditorProtocolDefinition['methods']>
        >,
        'language.hover' extends keyof EditorCapabilities ? true : false,
        'language.complete' extends keyof EditorCapabilities ? true : false,
        'language.rename' extends keyof EditorCapabilities ? true : false,
        'migration.run' extends keyof EditorCapabilities ? true : false,
        Equal<InitializeRow['available'], readonly ['initial']>,
        Equal<ExitRow['available'], readonly ['shuttingDown']>,
        Equal<InputOf<InitializeRow['handler']>['connection'], EditorConnectionReference>,
        Equal<
          Extract<LspMethodCatalog[number], { readonly semantic: 'migration.run' }>['direction'],
          MigrationRunRow['direction']
        >,
        Equal<
          Extract<LspMethodCatalog[number], { readonly semantic: 'migration.run' }>['kind'],
          MigrationRunRow['kind']
        >,
        {
          readonly semantic: 'migration.run';
          readonly method: 'liteship/migrate';
          readonly direction: 'server-to-client';
          readonly kind: 'notification';
        } extends LspMethodProjection<'migration.run'>
          ? true
          : false,
        {
          readonly semantic: 'migration.run';
          readonly method: 'wrong/method';
          readonly direction: MigrationRunRow['direction'];
          readonly kind: MigrationRunRow['kind'];
        } extends LspMethodProjection<'migration.run'>
          ? true
          : false,
        readonly [...LspMethodCatalog, LspMethodCatalog[0]] extends LspMethodCatalog
          ? true
          : false,
        [EditorMethodCatalog] extends [never] ? true : false,
        [LspMethodCatalog] extends [never] ? true : false,
      ],
      [
        true, true, true, true, true,
        true, false, true, true, true,
        true, true, true, false, false,
        false, false, false,
      ]
    >
  >
>;

/**
 * Red-first carrier law: method handlers return semantic products. Request
 * correlation and boundary crossing belong only to the outer request carrier.
 */
export type SemanticMethodResultsDoNotNestTheEditorWire = Assert<
  IsExactlyTrue<
    Equal<
      [
        'request' extends keyof OutputOf<OperationApplyRow['handler']> ? true : false,
        'crossing' extends keyof OutputOf<OperationApplyRow['handler']> ? true : false,
        Equal<MigrationRunRow['handler'], EditorMigrationAdmission>,
        NestedEditorMigrationAdmission extends MigrationRunRow['handler'] ? true : false,
        [MigrationRunRow] extends [never] ? true : false,
        Equal<OutputOf<OperationApplyRow['handler']>, OperationReceipt>,
      ],
      [false, false, true, false, false, true]
    >
  >
>;

export type EditorMigrationMethodPreservesTheExactSemanticRequest = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<
          EditorMigrationMethod['handler'],
          EditorMigrationAdmission
        >,
        BroadEditorMigrationAdmission extends EditorMigrationAdmission ? true : false,
        EditorMigrationAdmission extends BroadEditorMigrationAdmission ? true : false,
        EditorMigrationRequest<MigrationAdapter, EditorMigrationLawB> extends EditorMigrationRequest<
          MigrationAdapter,
          EditorMigrationLawA
        >
          ? true
          : false,
        MigrationReport<MigrationAdapter, EditorMigrationLawB> extends MigrationReport<
          MigrationAdapter,
          EditorMigrationLawA
        >
          ? true
          : false,
      ],
      [true, false, true, false, false]
    >
  >
>;

type EditorLanguageStateA1 = EditorDocumentState<
  EditorDocumentId<'law.editor.document-a'>,
  EditorDocumentVersion<1>
>;
type EditorLanguageStateA2 = EditorDocumentState<
  EditorDocumentId<'law.editor.document-a'>,
  EditorDocumentVersion<2>
>;
type EditorLanguageStateB2 = EditorDocumentState<
  EditorDocumentId<'law.editor.document-b'>,
  EditorDocumentVersion<2>
>;
type EditorLanguageChangeA = CaseOf<
  EditorDocumentChange<
    EditorDocumentId<'law.editor.document-a'>,
    EditorDocumentVersion<1>,
    EditorDocumentVersion<2>
  >,
  'incremental'
>;
type EditorLanguageChangeB = CaseOf<
  EditorDocumentChange<
    EditorDocumentId<'law.editor.document-b'>,
    EditorDocumentVersion<1>,
    EditorDocumentVersion<2>
  >,
  'incremental'
>;
type BroadEditorLanguageAdmission = (
  change: EditorDocumentChange,
) => MaybePromise<Result<EditorLanguageProduct, NonEmptyTuple<Diagnostic>>>;

/** The injected language carrier cannot answer change A with document B. */
export type LanguageAdmissionThreadsTheExactDocumentChange = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<EditorLanguageCapability['admit'], EditorLanguageAdmission>,
        BroadEditorLanguageAdmission extends EditorLanguageAdmission ? true : false,
        EditorLanguageAdmission extends BroadEditorLanguageAdmission ? true : false,
        [EditorLanguageAdmission] extends [never] ? true : false,
        Equal<EditorLanguageProduct<EditorLanguageChangeA>['change'], EditorLanguageChangeA>,
        Equal<EditorLanguageChangeA['previous'], EditorLanguageStateA1>,
        Equal<EditorChangedDocument<EditorLanguageChangeA>, EditorLanguageStateA2>,
        EditorLanguageStateB2 extends EditorLanguageChangeA['next'] ? true : false,
        EditorLanguageProduct<EditorLanguageChangeB> extends EditorLanguageProduct<EditorLanguageChangeA>
          ? true
          : false,
        EditorLanguageProduct<EditorLanguageChangeA> extends EditorLanguageProduct<EditorLanguageChangeA>
          ? true
          : false,
      ],
      [true, false, true, false, true, true, true, false, false, true]
    >
  >
>;

type EditorDocumentCoordinateA = Refine<
  CaseOf<EditorDocumentCoordinate, 'draft'>,
  { readonly document: EditorLanguageStateA2 }
>;
type EditorDocumentCoordinateB = Refine<
  CaseOf<EditorDocumentCoordinate, 'draft'>,
  { readonly document: EditorLanguageStateB2 }
>;
type EditorDocumentQueryA = Refine<
  EditorDocumentQuery,
  { readonly coordinate: EditorDocumentCoordinateA }
>;
type BroadCompletionAdmission = (
  request: EditorDocumentQuery,
) => MaybePromise<
  Result<EditorDocumentResult<readonly EditorCompletion[]>, NonEmptyTuple<Diagnostic>>
>;

/** Every document-query result repeats the exact input document coordinate. */
export type DocumentQueryMethodsCannotAnswerForAForeignDocument = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<
          DiagnosticsPullRow['handler'],
          EditorDocumentAdmission<EditorDocumentCoordinate, readonly Diagnostic[]>
        >,
        Equal<
          CompletionRow['handler'],
          EditorDocumentAdmission<EditorDocumentQuery, readonly EditorCompletion[]>
        >,
        BroadCompletionAdmission extends CompletionRow['handler'] ? true : false,
        EditorDocumentResult<
          readonly EditorCompletion[],
          EditorDocumentCoordinateB
        > extends EditorDocumentResult<readonly EditorCompletion[], EditorDocumentCoordinateA>
          ? true
          : false,
        EditorDocumentResult<
          readonly EditorCompletion[],
          EditorDocumentQueryA['coordinate']
        > extends EditorDocumentResult<readonly EditorCompletion[], EditorDocumentCoordinateA>
          ? true
          : false,
        [CompletionRow] extends [never] ? true : false,
      ],
      [true, true, false, false, true, false]
    >
  >
>;
