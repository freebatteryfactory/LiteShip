[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / liteship/src/graph

# liteship/src/graph

`liteship/graph` — the curated facade over `@liteship/core/graph`: the
DocumentGraph IR and its kernels. The DAG, graph addressing + schema gate,
GraphPatch, the client/server graph mutation + query channels, gap replay, and
the projection-key vocabulary. Curated named re-exports only — no behavior here.

## Namespaces

- [DAG](namespaces/DAG/README.md)
- [GraphPatch](namespaces/GraphPatch/README.md)

## Interfaces

- [CheckpointResult](interfaces/CheckpointResult.md)
- [ComponentNode](interfaces/ComponentNode.md)
- [DAGNode](interfaces/DAGNode.md)
- [DocumentGraph](interfaces/DocumentGraph.md)
- [DocumentGraphEdge](interfaces/DocumentGraphEdge.md)
- [EdgePatchOp](interfaces/EdgePatchOp.md)
- [EntityNode](interfaces/EntityNode.md)
- [ExportNode](interfaces/ExportNode.md)
- [ForkViolation](interfaces/ForkViolation.md)
- [GraphMutationClient](interfaces/GraphMutationClient.md)
- [GraphMutationClientOptions](interfaces/GraphMutationClientOptions.md)
- [GraphMutationRequest](interfaces/GraphMutationRequest.md)
- [GraphNativeGapReplayOptions](interfaces/GraphNativeGapReplayOptions.md)
- [GraphNativeGapReplayResult](interfaces/GraphNativeGapReplayResult.md)
- [GraphPatch](interfaces/GraphPatch.md)
- [GraphQueryEtagCandidates](interfaces/GraphQueryEtagCandidates.md)
- [GraphQueryRequest](interfaces/GraphQueryRequest.md)
- [GraphStore](interfaces/GraphStore.md)
- [MergeResult](interfaces/MergeResult.md)
- [NodePatchOp](interfaces/NodePatchOp.md)
- [PatchReceiptEntry](interfaces/PatchReceiptEntry.md)
- [PolicyNode](interfaces/PolicyNode.md)
- [PoseNode](interfaces/PoseNode.md)
- [ProjectionKeys](interfaces/ProjectionKeys.md)
- [ProjectionNode](interfaces/ProjectionNode.md)
- [ReceiptDAG](interfaces/ReceiptDAG.md)
- [ReplayDiscreteFromPatchReceiptsOptions](interfaces/ReplayDiscreteFromPatchReceiptsOptions.md)
- [SendGraphQueryOptions](interfaces/SendGraphQueryOptions.md)
- [SignalNode](interfaces/SignalNode.md)
- [TransitionNode](interfaces/TransitionNode.md)

## Type Aliases

- [AppliedGraphVerification](type-aliases/AppliedGraphVerification.md)
- [DocumentGraphNode](type-aliases/DocumentGraphNode.md)
- [DocumentGraphNodeParts](type-aliases/DocumentGraphNodeParts.md)
- [GraphMutationOps](type-aliases/GraphMutationOps.md)
- [GraphMutationResponse](type-aliases/GraphMutationResponse.md)
- [GraphQueryResponse](type-aliases/GraphQueryResponse.md)
- [NodeFamily](type-aliases/NodeFamily.md)
- [PatchOp](type-aliases/PatchOp.md)
- [RuntimeSite](type-aliases/RuntimeSite.md)

## Variables

- [DAG](variables/DAG.md)
- [DocumentGraphNodeSchema](variables/DocumentGraphNodeSchema.md)
- [GRAPH\_QUERY\_FALLBACK\_HEADER](variables/GRAPH_QUERY_FALLBACK_HEADER.md)
- [GraphPatch](variables/GraphPatch.md)
- [PROJECTION\_KEYS\_SOURCE](variables/PROJECTION_KEYS_SOURCE.md)

## Functions

- [chainPatchesBetween](functions/chainPatchesBetween.md)
- [createGraphMutationClient](functions/createGraphMutationClient.md)
- [createGraphQueryRefreshBase](functions/createGraphQueryRefreshBase.md)
- [decodeDocumentGraph](functions/decodeDocumentGraph.md)
- [glslIdent](functions/glslIdent.md)
- [graphQueryEtag](functions/graphQueryEtag.md)
- [handleGraphMutation](functions/handleGraphMutation.md)
- [handleGraphQuery](functions/handleGraphQuery.md)
- [isWellFormedNode](functions/isWellFormedNode.md)
- [linearizeGraph](functions/linearizeGraph.md)
- [nodeFromParts](functions/nodeFromParts.md)
- [nodeLogicalKey](functions/nodeLogicalKey.md)
- [normalizeGraphQueryEtag](functions/normalizeGraphQueryEtag.md)
- [parseGraphQueryEtagList](functions/parseGraphQueryEtagList.md)
- [projectionKeys](functions/projectionKeys.md)
- [replayDiscreteFromPatchReceipts](functions/replayDiscreteFromPatchReceipts.md)
- [runGraphNativeGapReplay](functions/runGraphNativeGapReplay.md)
- [sealGraph](functions/sealGraph.md)
- [sealNode](functions/sealNode.md)
- [sendGraphMutation](functions/sendGraphMutation.md)
- [sendGraphQuery](functions/sendGraphQuery.md)
- [validateGraph](functions/validateGraph.md)
- [verifyAppliedGraph](functions/verifyAppliedGraph.md)
- [wgslIdent](functions/wgslIdent.md)
