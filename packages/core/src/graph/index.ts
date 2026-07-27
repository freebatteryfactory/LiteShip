/**
 * `@liteship/core/graph` — the DocumentGraph IR and its kernels: the DAG,
 * the graph addressing + schema gate, GraphPatch, the client/server graph
 * mutation + query channels, gap replay, and the projection-key vocabulary.
 * Curated named re-exports only — no behavior lives here.
 * @module
 */

export { projectionKeys, glslIdent, wgslIdent, PROJECTION_KEYS_SOURCE } from './projection.js';

export type { ProjectionKeys } from './projection.js';

export type { DAGNode, ReceiptDAG, MergeResult, ForkViolation, CheckpointResult } from './dag.js';

export { DAG } from './dag.js';

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
} from './document-graph.js';

export {
  sealNode,
  sealGraph,
  nodeFromParts,
  validateGraph,
  linearizeGraph,
  decodeDocumentGraph,
} from './document-graph-address.js';

export type { DocumentGraphNodeParts } from './document-graph-address.js';

export { isWellFormedNode, DocumentGraphNodeSchema } from './document-graph-schema.js';

export { GraphPatch, nodeLogicalKey } from './graph-patch.js';

export type { PatchOp, NodePatchOp, EdgePatchOp } from './graph-patch.js';

export { handleGraphMutation, sendGraphMutation, verifyAppliedGraph } from './graph-mutation.js';

export type {
  GraphMutationRequest,
  GraphMutationResponse,
  GraphStore,
  AppliedGraphVerification,
} from './graph-mutation.js';

export { createGraphMutationClient } from './graph-mutation-client.js';

export type { GraphMutationClient, GraphMutationClientOptions, GraphMutationOps } from './graph-mutation-client.js';

export {
  handleGraphQuery,
  sendGraphQuery,
  graphQueryEtag,
  normalizeGraphQueryEtag,
  parseGraphQueryEtagList,
  createGraphQueryRefreshBase,
  GRAPH_QUERY_FALLBACK_HEADER,
} from './graph-query.js';

export type {
  GraphQueryRequest,
  GraphQueryResponse,
  GraphQueryEtagCandidates,
  SendGraphQueryOptions,
} from './graph-query.js';

export {
  chainPatchesBetween,
  replayDiscreteFromPatchReceipts,
  runGraphNativeGapReplay,
} from './graph-query-gap-replay.js';

export type {
  PatchReceiptEntry,
  ReplayDiscreteFromPatchReceiptsOptions,
  GraphNativeGapReplayOptions,
  GraphNativeGapReplayResult,
} from './graph-query-gap-replay.js';
