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
import type { EditorPosition } from '../04_time/types.js';
import type { DraftSemanticCut, SemanticCut } from '../08_state/types.js';
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

/**
 * Uncommitted operation sequence over an immutable base.
 *
 * The base arrives as one exact cut. It previously carried a revision here and
 * a time cut two members later, which meant the editor described its coordinate
 * in loose parts while the runtime described the same coordinate as one object.
 * A preview and a commit that disagree about what a coordinate *is* cannot be
 * one program, whatever the READMEs claim.
 */
export interface WorkingOverlay {
  readonly session: EditorSessionReference;
  readonly base: SemanticCut;
  readonly entries: readonly OverlayEntry[];
}

/**
 * Counterfactual branch compiled and executed without committing.
 *
 * The result is a draft cut, not a bare draft revision. A preview names the
 * world, the candidate revision, the moment, and the evidence it evaluated
 * against — everything a rasterizer needs to draw it — and the draft reference
 * kind is what keeps it from reaching a production slot.
 */
export interface PreviewBranch {
  readonly base: SemanticCut;
  readonly overlay: WorkingOverlay;
  readonly result: DraftSemanticCut;
  readonly scene?: SceneReference;
  readonly diagnostics: readonly Diagnostic[];
}

/**
 * Compile-time law: preview reaches a draft cut, and cannot quietly hand back a
 * committed one.
 *
 * The editor is the one place where a draft becoming indistinguishable from a
 * commit is a one-member change, so the distinction is checked rather than
 * described.
 */
export type APreviewProducesADraftCut = Assert<
  Equal<
    [
      PreviewBranch['result'] extends DraftSemanticCut ? true : false,
      PreviewBranch['result'] extends SemanticCut ? true : false,
      PreviewBranch['base'] extends SemanticCut ? true : false,
      'time' extends keyof WorkingOverlay ? true : false,
    ],
    [true, false, true, false]
  >
>;

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
