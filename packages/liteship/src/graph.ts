/**
 * `liteship/graph` — the curated facade over `@liteship/core/graph`: the
 * DocumentGraph IR and its kernels. The DAG, graph addressing + schema gate,
 * GraphPatch, the client/server graph mutation + query channels, gap replay, and
 * the projection-key vocabulary. Curated named re-exports only — no behavior here.
 * @module
 */

export { projectionKeys, glslIdent, wgslIdent, PROJECTION_KEYS_SOURCE } from '@liteship/core/graph';
export type { ProjectionKeys } from '@liteship/core/graph';

export type { DAGNode, ReceiptDAG, MergeResult, ForkViolation, CheckpointResult } from '@liteship/core/graph';
export { DAG } from '@liteship/core/graph';

export type {
  DocumentGraph,
  DocumentGraphNode,
  DocumentGraphEdge,
  NodeFamily,
  RuntimeSite,
  SignalNode,
  EntityNode,
  ComponentNode,
  PoseNode,
  TransitionNode,
  ProjectionNode,
  PolicyNode,
  ExportNode,
} from '@liteship/core/graph';

export {
  sealNode,
  sealGraph,
  nodeFromParts,
  validateGraph,
  linearizeGraph,
  decodeDocumentGraph,
} from '@liteship/core/graph';
export type { DocumentGraphNodeParts } from '@liteship/core/graph';

export { isWellFormedNode, DocumentGraphNodeSchema } from '@liteship/core/graph';

export { GraphPatch, nodeLogicalKey } from '@liteship/core/graph';
export type { PatchOp, NodePatchOp, EdgePatchOp } from '@liteship/core/graph';

export { handleGraphMutation, sendGraphMutation, verifyAppliedGraph } from '@liteship/core/graph';
export type {
  GraphMutationRequest,
  GraphMutationResponse,
  GraphStore,
  AppliedGraphVerification,
} from '@liteship/core/graph';

export { createGraphMutationClient } from '@liteship/core/graph';
export type { GraphMutationClient, GraphMutationClientOptions, GraphMutationOps } from '@liteship/core/graph';

export {
  handleGraphQuery,
  sendGraphQuery,
  graphQueryEtag,
  normalizeGraphQueryEtag,
  parseGraphQueryEtagList,
  createGraphQueryRefreshBase,
  GRAPH_QUERY_FALLBACK_HEADER,
} from '@liteship/core/graph';
export type {
  GraphQueryRequest,
  GraphQueryResponse,
  GraphQueryEtagCandidates,
  SendGraphQueryOptions,
} from '@liteship/core/graph';

export { chainPatchesBetween, replayDiscreteFromPatchReceipts, runGraphNativeGapReplay } from '@liteship/core/graph';
export type {
  PatchReceiptEntry,
  ReplayDiscreteFromPatchReceiptsOptions,
  GraphNativeGapReplayOptions,
  GraphNativeGapReplayResult,
} from '@liteship/core/graph';
