/**
 * DocumentGraph — the keystone IR (P2).
 *
 * A creative document is not pixels; it is a content-addressed, signal-indexed
 * graph of named nodes with projection targets. This module stitches the
 * vocabulary the wave already produced — Plan IR edges (`plan.ts`), the
 * projection vocabulary (`projection.ts`), the evaluator's rich result
 * (`type-utils.ts`), the capability lattice (`caps.ts`), and the
 * `CellEnvelope` discipline (`protocol.ts`) — into ONE addressable graph,
 * adding only the two genuinely net-new node families: Policy and Export.
 *
 * Every node carries the repo's `_tag`/`_version`/`id` envelope (mirroring
 * `BoundaryDef` and `CellEnvelope`). Addressing lives in
 * `document-graph-address.ts` and routes through the one shared kernel
 * (`content-address.ts`) so DocumentGraph ids cannot diverge from EntityId /
 * BoundaryDef.id. Compiler/edge outputs are referenced ONLY via
 * `AddressedDigest` (opaque), never type-imported, so `@czap/core` never gains
 * a circular edge back to `@czap/compiler` / `@czap/edge`.
 *
 * @module
 */

import type { ContentAddress, AddressedDigest, SignalInput, ThresholdValue, StateName } from './brands.js';
import type { CellMeta } from './protocol.js';
import type { RuntimeEasing } from './easing.js';
import type { EdgeType } from './plan.js';
import type { ProjectionKeys } from './projection.js';
import type { EvaluateResult } from './type-utils.js';
import type { CapTier, CapSet } from './caps.js';

/** The runtime sites a node may be admitted on (distinct from the CapTier lattice). */
export type RuntimeSite = 'node' | 'browser' | 'worker' | 'edge';

/**
 * Node-family discriminator. Six families map onto the existing `CellKind`
 * vocabulary at the wire boundary; `policy` and `export` are the two net-new
 * families. `NodeFamily` is kept SEPARATE from `CellKind` (not merged into
 * `protocol.ts`) so existing `CellEnvelope` consumers need not learn families
 * nothing reads as a wire cell — "written data needs a reader".
 */
export type NodeFamily = 'signal' | 'entity' | 'component' | 'pose' | 'transition' | 'projection' | 'policy' | 'export';

/**
 * Shared node envelope. `id` is `fnv1a` over the canonical CBOR of the payload
 * (everything except `id` and the volatile `meta`), so structurally-equal nodes
 * dedup across graphs. Edges reference nodes by this `id`.
 */
interface NodeBase<F extends NodeFamily> {
  readonly _tag: `DocGraph${Capitalize<F>}Node`;
  readonly _version: 1;
  readonly family: F;
  /** `fnv1a` content address over the node payload (set by `addressNode`/`sealNode`). */
  readonly id: ContentAddress;
  /** HLC created/updated + version. Excluded from the content address (volatile). */
  readonly meta: CellMeta;
}

/** 1. Signal — an input axis. Maps to `CellKind 'signal'` / `BoundaryDef.input`. */
export interface SignalNode extends NodeBase<'signal'> {
  readonly input: SignalInput;
  readonly range?: readonly [number, number];
}

/** 2. Entity — ECS identity. Maps to `EntityId`/`ComposableEntity`. */
export interface EntityNode extends NodeBase<'entity'> {
  /** Sorted refs to {@link ComponentNode} ids. */
  readonly components: readonly ContentAddress[];
}

/** 3. Component — a boundary/token/style slot. Carries the kernel inputs inline so eval is reproducible. */
export interface ComponentNode extends NodeBase<'component'> {
  readonly name: string;
  readonly boundaryRef?: ContentAddress;
  readonly thresholds?: readonly ThresholdValue[];
  readonly states?: readonly StateName[];
}

/**
 * 4. Pose — a STATIC design-time keyed variant: an entity's projected output
 * bindings pinned at one discrete boundary state. The per-frame transient is
 * {@link EvaluateResult} (`evaluated`, optional cache); a Pose is the addressed,
 * named cell — transients are never content-addressed.
 */
export interface PoseNode extends NodeBase<'pose'> {
  readonly entityRef: ContentAddress;
  readonly state: StateName;
  readonly bindings: Readonly<Record<string, number | string>>;
  readonly evaluated?: EvaluateResult;
}

/** 5. Transition — a blend/choice between two poses. Reuses `EdgeType` as the routing flavor. */
export interface TransitionNode extends NodeBase<'transition'> {
  readonly fromPose: ContentAddress;
  readonly toPose: ContentAddress;
  readonly routing: EdgeType;
  readonly durationMs?: number;
  /**
   * The authored easing curve, carried on the node so `interpretTransition`
   * projects the SAME descriptor onto the runtime floor (`RuntimeWritePlan.easing`)
   * that the native CSS path compiles into `linear()` — one source, one kernel
   * (Law 4). Omitted ⇒ the interpreter defaults it to `{ kind: 'ease' }`, matching
   * the CSS `transition` default timing function.
   */
  readonly easing?: RuntimeEasing;
}

/**
 * 6. Projection — the cast of a component to a target. Wraps a compiler
 * `CompileResult` BY REFERENCE (`resultDigest`), never inlined: the node stays
 * small/cacheable and `@czap/core` does not type-import `@czap/compiler`.
 */
export interface ProjectionNode extends NodeBase<'projection'> {
  readonly target: 'css' | 'glsl' | 'wgsl' | 'aria' | 'ai' | 'config' | 'svg';
  readonly sourceRef: ContentAddress;
  readonly keys: ProjectionKeys;
  readonly resultDigest: AddressedDigest;
}

/**
 * 7. Policy — NET-NEW. A pre-projection capability/constraint gate read by the
 * escalation chooser (P5c). Constrains which projection targets are admissible
 * given the runtime site, the required {@link CapTier}, and optional budgets.
 */
export interface PolicyNode extends NodeBase<'policy'> {
  readonly appliesTo: readonly ContentAddress[];
  readonly requires: CapTier;
  readonly grants: CapSet;
  readonly sites: readonly RuntimeSite[];
  readonly budgets?: {
    readonly p95Ms?: number;
    readonly memoryMb?: number;
    readonly allocClass?: 'zero' | 'bounded' | 'unbounded';
  };
}

/**
 * 8. Export — NET-NEW. An egress ADDRESS node: it carries the digest of a
 * resolved artifact (and optional receipt-chain head), not the bytes. This is
 * the seam the P4 dual-export proof binds to.
 */
export interface ExportNode extends NodeBase<'export'> {
  readonly carrier: 'astro-page' | 'video' | 'svg' | 'ship-capsule' | 'receipt';
  readonly sourceRefs: readonly ContentAddress[];
  readonly artifactDigest: AddressedDigest;
  /** sha256 receipt-chain head (the receipt byte law / `TypedRef`), distinct from `id`'s fnv1a law. */
  readonly receiptHash?: string;
}

/** The tagged union of all node families. */
export type DocumentGraphNode =
  SignalNode | EntityNode | ComponentNode | PoseNode | TransitionNode | ProjectionNode | PolicyNode | ExportNode;

/**
 * A directed edge over node content addresses. This is `PlanEdge` lifted from
 * opaque step-id strings to typed node `ContentAddress`es; `EdgeType` is reused
 * verbatim from `plan.ts` (both endpoints stay in the fnv1a identity law).
 */
export interface DocumentGraphEdge {
  readonly from: ContentAddress;
  readonly to: ContentAddress;
  readonly type: EdgeType;
}

/**
 * The top-level addressable graph. Two-law addressing (ADR-0003/0011): `id` is
 * the `fnv1a` identity (dedup), `digest` is the paired `fnv1a`+`sha256`
 * `AddressedDigest` (receipts / exports) — both derived from one CanonicalCbor
 * byte sequence over the sorted node ids + edges, so they cannot disagree.
 */
export interface DocumentGraph {
  readonly _tag: 'DocumentGraph';
  readonly _version: 1;
  readonly id: ContentAddress;
  readonly digest: AddressedDigest;
  readonly meta: CellMeta;
  readonly nodes: readonly DocumentGraphNode[];
  readonly edges: readonly DocumentGraphEdge[];
}
