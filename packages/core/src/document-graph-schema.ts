/**
 * DocumentGraph node well-formedness — the ONE declarative trust gate.
 *
 * A `DocumentGraphNode` that arrives from an UNTRUSTED source (a serialized
 * graph lowered onto the runtime, OR a model-proposed `GraphPatch` op) is just
 * JSON until its SHAPE is verified. `sealNode` only recomputes a node's content
 * address; it does NOT check that the payload conforms to its family's fields.
 *
 * This module factors that check OUT of `ai-cast.ts` (where it began life
 * gating model proposals) so BOTH the AI seam AND the runtime graph loader
 * (`@czap/astro`'s `loadGraphRuntime`) share ONE trust gate — a node the loader
 * accepts is a node the AI validator would accept, and vice versa. There is no
 * second, drifting copy of "is this a well-formed node?".
 *
 * Each family is a kernel `S.struct`; the union over all EIGHT families is the
 * single source of truth. The compile-time exhaustiveness check makes "added a
 * family to document-graph.ts but not a schema here" a BUILD error — closing the
 * "validator missed a family" class for good (no runtime table to forget).
 *
 * Branded string types (ContentAddress / SignalInput / StateName /
 * AddressedDigest) validate as plain `S.string`: the brand is a compile-time
 * refinement and the address FORMAT is an invariant, not a wire law. `meta` and
 * the structurally-opaque fields (CapSet aside, the digests, ProjectionKeys, the
 * evaluate cache) are `S.unknown` — presence is the contract; their shape is
 * sealed/derived elsewhere.
 *
 * @module
 */

import { ValidationError } from '@czap/error';
import { S, decode, toStandardSchema } from './schema/index.js';
import { isCanonicalCapSet } from './caps.js';
import type { DocumentGraphNode, NodeFamily } from './document-graph.js';

/** Branded-string fields validate as plain strings (brand + format are compile-time / invariant laws). */
const Addr = S.string;
/** `meta` + structurally-opaque fields: presence is the contract, internal shape is sealed/derived elsewhere. */
const Opaque = S.unknown;

/**
 * `range` was an effect `Schema.Tuple([Number, Number])`. The kernel AST has no
 * tuple node, so a fixed [start, end] pair is a branded array: decode the two
 * numbers, then a smart constructor enforces exactly-two — preserving the
 * effect Tuple's reject-on-wrong-arity behaviour rather than widening to a
 * variable-length `number[]`.
 */
const RangeTuple = S.brand(
  S.array(S.number),
  (arr): readonly [number, number] => {
    if (arr.length !== 2) {
      throw ValidationError('DocGraph.range', 'range must be a [start, end] pair of exactly two numbers');
    }
    const start = arr[0];
    const end = arr[1];
    if (start === undefined || end === undefined) {
      throw ValidationError('DocGraph.range', 'range must be a [start, end] pair of exactly two numbers');
    }
    return [start, end];
  },
  'DocGraphRange',
);

const SignalNodeSchema = S.struct({
  _tag: S.literal('DocGraphSignalNode'),
  _version: S.literal(1),
  family: S.literal('signal'),
  id: Addr,
  meta: Opaque,
  input: S.string,
  range: S.optional(RangeTuple),
});
const EntityNodeSchema = S.struct({
  _tag: S.literal('DocGraphEntityNode'),
  _version: S.literal(1),
  family: S.literal('entity'),
  id: Addr,
  meta: Opaque,
  components: S.array(Addr),
});
const ComponentNodeSchema = S.struct({
  _tag: S.literal('DocGraphComponentNode'),
  _version: S.literal(1),
  family: S.literal('component'),
  id: Addr,
  meta: Opaque,
  name: S.string,
  boundaryRef: S.optional(Addr),
  thresholds: S.optional(S.array(Opaque)),
  states: S.optional(S.array(S.string)),
});
const PoseNodeSchema = S.struct({
  _tag: S.literal('DocGraphPoseNode'),
  _version: S.literal(1),
  family: S.literal('pose'),
  id: Addr,
  meta: Opaque,
  entityRef: Addr,
  state: S.string,
  bindings: S.record(S.union(S.number, S.string)),
  evaluated: S.optional(Opaque),
});
const TransitionNodeSchema = S.struct({
  _tag: S.literal('DocGraphTransitionNode'),
  _version: S.literal(1),
  family: S.literal('transition'),
  id: Addr,
  meta: Opaque,
  fromPose: Addr,
  toPose: Addr,
  routing: S.union(S.literal('seq'), S.literal('par'), S.literal('choice_then'), S.literal('choice_else')),
  durationMs: S.optional(S.number),
});
const ProjectionNodeSchema = S.struct({
  _tag: S.literal('DocGraphProjectionNode'),
  _version: S.literal(1),
  family: S.literal('projection'),
  id: Addr,
  meta: Opaque,
  target: S.union(
    S.literal('css'),
    S.literal('glsl'),
    S.literal('wgsl'),
    S.literal('aria'),
    S.literal('ai'),
    S.literal('config'),
    S.literal('svg'),
  ),
  sourceRef: Addr,
  keys: Opaque,
  resultDigest: Opaque,
});
const CapTierSchema = S.union(
  S.literal('static'),
  S.literal('styled'),
  S.literal('reactive'),
  S.literal('animated'),
  S.literal('gpu'),
);
// grants is a CapSet: a tagged, deduped level ARRAY. Validated (not Opaque) so a corrupted
// grants — e.g. a Set that JSON-serialized to {} over the mutation channel — is REJECTED by
// isWellFormedNode at the root, never silently accepted into the sealed graph.
//
// Levels must be CANONICAL (deduped, ladder-ascending), not merely an array of valid tiers —
// else an untrusted policy patch could seal a non-canonical CapSet that content-addresses
// DIFFERENTLY from the same logical set built via Cap.from, breaking the identity law at the wire.
// The kernel has no `check`/filter node, so the canonical law rides a `S.brand` smart
// constructor: it decodes the struct, then throws a ValidationError (folded into a
// `schema/brand` decode issue) when the levels are not canonical.
const CapSetSchema = S.brand(
  S.struct({
    _tag: S.literal('CapSet'),
    levels: S.array(CapTierSchema),
  }),
  (cs) => {
    if (!isCanonicalCapSet(cs)) {
      throw ValidationError(
        'DocGraph.CapSet',
        'CapSet.levels must be canonical: deduped and ascending by the capability ladder (static < styled < reactive < animated < gpu)',
      );
    }
    return cs;
  },
  'CapSet',
);
const PolicyNodeSchema = S.struct({
  _tag: S.literal('DocGraphPolicyNode'),
  _version: S.literal(1),
  family: S.literal('policy'),
  id: Addr,
  meta: Opaque,
  appliesTo: S.array(Addr),
  requires: CapTierSchema,
  grants: CapSetSchema,
  sites: S.array(S.union(S.literal('node'), S.literal('browser'), S.literal('worker'), S.literal('edge'))),
  budgets: S.optional(Opaque),
});
const ExportNodeSchema = S.struct({
  _tag: S.literal('DocGraphExportNode'),
  _version: S.literal(1),
  family: S.literal('export'),
  id: Addr,
  meta: Opaque,
  carrier: S.union(
    S.literal('astro-page'),
    S.literal('video'),
    S.literal('svg'),
    S.literal('ship-capsule'),
    S.literal('receipt'),
  ),
  sourceRefs: S.array(Addr),
  artifactDigest: Opaque,
  receiptHash: S.optional(S.string),
});

/** Per-family schemas, keyed by family. */
const NODE_FAMILY_SCHEMAS = {
  signal: SignalNodeSchema,
  entity: EntityNodeSchema,
  component: ComponentNodeSchema,
  pose: PoseNodeSchema,
  transition: TransitionNodeSchema,
  projection: ProjectionNodeSchema,
  policy: PolicyNodeSchema,
  export: ExportNodeSchema,
};

// COMPILE-TIME EXHAUSTIVENESS: every NodeFamily MUST have a schema above. Adding a family
// to document-graph.ts without one here is a build error — this is what closes the
// "validator missed a family" class for good (no runtime table to forget to update).
const _familyExhaustiveness: Record<NodeFamily, unknown> = NODE_FAMILY_SCHEMAS;
void _familyExhaustiveness;

/** The union over all eight families — the single source of truth for a well-formed node. */
const DocumentGraphNodeUnion = S.union(
  SignalNodeSchema,
  EntityNodeSchema,
  ComponentNodeSchema,
  PoseNodeSchema,
  TransitionNodeSchema,
  ProjectionNodeSchema,
  PolicyNodeSchema,
  ExportNodeSchema,
);

/**
 * The single source of truth for "is this a well-formed DocumentGraph node?".
 * Carries the Standard Schema V1 `~standard` interop property (kernel `~standard`
 * bridge, vendor `liteship`), so any Standard-Schema-aware consumer can use the
 * same node gate directly. {@link isWellFormedNode} behavior is unchanged.
 */
export const DocumentGraphNodeSchema = toStandardSchema(DocumentGraphNodeUnion, decode);

/**
 * Type guard: does this untrusted value conform to ONE of the eight
 * `DocumentGraphNode` family schemas (correct `_tag`/`_version`/`family` and the
 * family's required, correctly-typed fields)? The shared trust gate both the AI
 * proposal validator and the runtime graph loader read.
 */
export function isWellFormedNode(value: unknown): value is DocumentGraphNode {
  return decode(DocumentGraphNodeUnion, value).ok;
}
