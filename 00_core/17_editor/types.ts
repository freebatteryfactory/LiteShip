/**
 * Human and agent editing over the same revision, operation, preview, patch,
 * change, and commit model used by runtime.
 *
 * Revision DAG, operation history, snapshots, working overlays, and undo/redo are
 * layered views with distinct roles. Only committed revisions are authoritative.
 *
 * @module
 */

import type { Algebra, Assert, Brand, Equal, NonEmptyTuple, Reference } from '../../types.js';
import type { Diagnostic } from '../00_error/types.js';
import type {
  ChangeId,
  DraftRevisionReference,
  PatchReference,
  RevisionReference,
  SemanticLocation,
  WorldReference,
} from '../02_identity/types.js';
import type { EntityFieldReference } from '../03_schema/types.js';
import type { EditorPosition, TimeCut } from '../04_time/types.js';
import type {
  OperationInvocation,
  OperationPolicyDecision,
} from '../07_operation/types.js';
import type { CollectionReference, RowKey } from '../10_collection/types.js';
import type {
  GeometryPointId,
  SceneReference,
  TimelineKeyReference,
  TimelineReference,
} from '../11_scene/types.js';
import type { StructureNodeReference } from '../13_stream/types.js';

export type EditorSessionId<Name extends string = string> = Brand<Name, 'liteship.editor-session-id'>;
export type SelectionId<Name extends string = string> = Brand<Name, 'liteship.selection-id'>;
export type EditorSessionReference<Id extends EditorSessionId = EditorSessionId> = Reference<'editor-session', Id>;

/** Semantic selection target, never a CSS selector as primary identity. */
export type SelectionTarget = Algebra<{
  location: { readonly location: SemanticLocation };
  field: EntityFieldReference;
  'collection-row': { readonly collection: CollectionReference; readonly key: RowKey };
  'timeline-key': { readonly scene: SceneReference; readonly timeline: TimelineReference; readonly key: TimelineKeyReference };
  'geometry-point': { readonly scene: SceneReference; readonly point: GeometryPointId };
  'structure-node': { readonly node: StructureNodeReference };
}>;

/** Revision-pinned ordered selection with one primary target. */
export interface SelectionSet {
  readonly id: SelectionId;
  readonly world: WorldReference;
  readonly revision: RevisionReference | DraftRevisionReference;
  readonly targets: NonEmptyTuple<SelectionTarget>;
  readonly primary: number;
  readonly anchor?: number;
  readonly focus?: number;
}

/** One authored operation and the deterministic normalized products it produced. */
export interface OverlayEntry {
  readonly invocation: OperationInvocation;
  readonly patch: PatchReference;
  readonly change: ChangeId;
  readonly diagnostics: readonly Diagnostic[];
}

/** Uncommitted operation sequence over an immutable base. */
export interface WorkingOverlay {
  readonly session: EditorSessionReference;
  readonly base: RevisionReference;
  readonly entries: readonly OverlayEntry[];
  readonly time: TimeCut;
}

/** Counterfactual branch compiled and executed without committing. */
export interface PreviewBranch {
  readonly base: RevisionReference;
  readonly overlay: WorkingOverlay;
  readonly result: DraftRevisionReference;
  readonly scene?: SceneReference;
  readonly diagnostics: readonly Diagnostic[];
}

/** Cursor projection over revision or operation history. */
export interface HistoryCursor {
  readonly revision: RevisionReference | DraftRevisionReference;
  readonly position: EditorPosition;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
}

/** Human or agent proposal uses the same operation language. */
export interface EditProposal {
  readonly invocation: OperationInvocation;
  readonly base: RevisionReference;
  readonly explanation: string;
}

/** Approval is a projection of operation policy, never an editor-owned risk label. */
export interface ApprovalDecision {
  readonly proposal: EditProposal;
  readonly policy: OperationPolicyDecision;
}

/** How a revision-pinned selection resolved after another revision. */
export type SelectionResolution = Algebra<{
  resolved: { readonly selection: SelectionSet };
  moved: { readonly from: SelectionSet; readonly to: SelectionSet };
  deleted: { readonly selection: SelectionSet };
  stale: { readonly selection: SelectionSet; readonly current: RevisionReference };
  ambiguous: { readonly selection: SelectionSet; readonly candidates: NonEmptyTuple<SelectionSet> };
}>;

/** Compile-time law: preview results cannot satisfy committed revision references. */
export type EditorDraftIsNotCommitted = Assert<
  Equal<DraftRevisionReference extends RevisionReference ? true : false, false>
>;

/** Type summary consumed by the root core topology. */
export interface EditorTypeSurface {
  readonly selection: SelectionSet;
  readonly selectionResolution: SelectionResolution;
  readonly overlay: WorkingOverlay;
  readonly preview: PreviewBranch;
  readonly history: HistoryCursor;
  readonly proposal: EditProposal;
  readonly approval: ApprovalDecision;
}
