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
  NonEmptyTuple,
  TagOf,
} from '../../types.js';
import type { Diagnostic } from '../../00_core/00_error/types.js';
import type { StreamSequence } from '../../00_core/04_time/types.js';
import type { OperationId, OperationReference } from '../../00_core/07_operation/types.js';
import type { Explanation } from '../../00_core/18_inspection/types.js';
import type { MigrationFailure, MigrationReport } from '../../00_core/14_compiler/types.js';
import type { ApprovalDecision, PreviewBranch } from '../../00_core/17_editor/types.js';
import type {
  CommittedCoordinate,
  CommittedEditorOutcome,
  DraftCoordinate,
  EditorCapabilities,
  EditorConnectionReference,
  EditorCoordinate,
  EditorDiagnosticDelivery,
  EditorDiagnosticExplanationProjection,
  EditorDocumentChange,
  EditorDocumentCoordinate,
  EditorDocumentEdit,
  EditorHandlerFailure,
  EditorLanguageCapability,
  EditorLanguageRequirement,
  EditorMethodCatalog,
  EditorMigrationProjection,
  EditorNotification,
  EditorProtocolDefinition,
  EditorProtocolPhase,
  EditorRefusal,
  EditorRemediationOffer,
  EditorRemediationProjection,
  EditorRequestOutcome,
  EditorSourceLanguage,
  LspMethodCatalog,
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
        Equal<EditorNotification['sequence'], StreamSequence>,
        'connection' extends keyof EditorNotification ? true : false,
        'crossing' extends keyof EditorNotification ? true : false,
      ],
      [false, false, true, true, true, false]
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
type EditorMigrationLawA = OperationId<'liteship.wire.editor.migration.a'>;
type EditorMigrationLawB = OperationId<'liteship.wire.editor.migration.b'>;

export type TheConcreteCatalogOwnsCapabilitiesAndLspProjection = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<CatalogId, ProjectedId>,
        Equal<keyof EditorProtocolDefinition['capabilities'], keyof EditorCapabilities>,
        'language.hover' extends keyof EditorCapabilities ? true : false,
        'language.complete' extends keyof EditorCapabilities ? true : false,
        'language.rename' extends keyof EditorCapabilities ? true : false,
        'migration.run' extends keyof EditorCapabilities ? true : false,
        Equal<InitializeRow['available'], readonly ['initial']>,
        Equal<ExitRow['available'], readonly ['shuttingDown']>,
        Equal<InputOf<InitializeRow['handler']>['connection'], EditorConnectionReference>,
      ],
      [true, true, true, true, false, true, true, true, true]
    >
  >
>;

export type EditorMigrationProjectsTheExactOperation = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<
          EditorMigrationProjection<EditorMigrationLawA>['outcome'],
          EditorRequestOutcome<MigrationReport, MigrationFailure, EditorMigrationLawA>
        >,
        EditorMigrationProjection<EditorMigrationLawA> extends EditorMigrationProjection<EditorMigrationLawB>
          ? true
          : false,
      ],
      [true, false]
    >
  >
>;
