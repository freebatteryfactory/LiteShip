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
 * (`@liteship/astro`'s `loadGraphRuntime`) share ONE trust gate — a node the loader
 * accepts is a node the AI validator would accept, and vice versa. There is no
 * second, drifting copy of "is this a well-formed node?".
 *
 * Each family is a kernel `schema.struct`; the union over all EIGHT families is the
 * single source of truth. The compile-time exhaustiveness check makes "added a
 * family to document-graph.ts but not a schema here" a BUILD error — closing the
 * "validator missed a family" class for good (no runtime table to forget).
 *
 * Branded string types (ContentAddress / SignalInput / StateName /
 * AddressedDigest) validate as plain `schema.string`: the brand is a compile-time
 * refinement and the address FORMAT is an invariant, not a wire law. `meta` and
 * the structurally-opaque fields (CapSet aside, the digests, ProjectionKeys, the
 * evaluate cache) are `schema.unknown` — presence is the contract; their shape is
 * sealed/derived elsewhere.
 *
 * @module
 */

import { ValidationError } from '@liteship/error';
import { schema } from '../schema/constructors.js';
import { decode } from '../schema/decode.js';
import { toStandardSchema } from '../schema/standard.js';
import { isCanonicalCapSet } from '../evidence/caps.js';
import type { DocumentGraphNode, NodeFamily } from './document-graph.js';

/** Branded-string fields validate as plain strings (brand + format are compile-time / invariant laws). */
const Addr = schema.string;
/** `meta` + structurally-opaque fields: presence is the contract, internal shape is sealed/derived elsewhere. */
const Opaque = schema.unknown;

/**
 * `range` was an effect `Schema.Tuple([Number, Number])`. The kernel AST has no
 * tuple node, so a fixed [start, end] pair is a branded array: decode the two
 * numbers, then a smart constructor enforces exactly-two — preserving the
 * effect Tuple's reject-on-wrong-arity behaviour rather than widening to a
 * variable-length `number[]`.
 */
const RangeTuple = schema.brand(
  schema.array(schema.number),
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

const SignalNodeSchema = schema.struct({
  _tag: schema.literal('DocGraphSignalNode'),
  _version: schema.literal(1),
  family: schema.literal('signal'),
  id: Addr,
  meta: Opaque,
  input: schema.string,
  range: schema.optional(RangeTuple),
});
const EntityNodeSchema = schema.struct({
  _tag: schema.literal('DocGraphEntityNode'),
  _version: schema.literal(1),
  family: schema.literal('entity'),
  id: Addr,
  meta: Opaque,
  components: schema.array(Addr),
});
const ComponentNodeSchema = schema.struct({
  _tag: schema.literal('DocGraphComponentNode'),
  _version: schema.literal(1),
  family: schema.literal('component'),
  id: Addr,
  meta: Opaque,
  name: schema.string,
  boundaryRef: schema.optional(Addr),
  thresholds: schema.optional(schema.array(Opaque)),
  states: schema.optional(schema.array(schema.string)),
});
const PoseNodeSchema = schema.struct({
  _tag: schema.literal('DocGraphPoseNode'),
  _version: schema.literal(1),
  family: schema.literal('pose'),
  id: Addr,
  meta: Opaque,
  entityRef: Addr,
  state: schema.string,
  bindings: schema.record(schema.union(schema.number, schema.string)),
  evaluated: schema.optional(Opaque),
});
const TransitionNodeSchema = schema.struct({
  _tag: schema.literal('DocGraphTransitionNode'),
  _version: schema.literal(1),
  family: schema.literal('transition'),
  id: Addr,
  meta: Opaque,
  fromPose: Addr,
  toPose: Addr,
  routing: schema.union(
    schema.literal('seq'),
    schema.literal('par'),
    schema.literal('choice_then'),
    schema.literal('choice_else'),
  ),
  durationMs: schema.optional(schema.number),
});
const ProjectionNodeSchema = schema.struct({
  _tag: schema.literal('DocGraphProjectionNode'),
  _version: schema.literal(1),
  family: schema.literal('projection'),
  id: Addr,
  meta: Opaque,
  target: schema.union(
    schema.literal('css'),
    schema.literal('glsl'),
    schema.literal('wgsl'),
    schema.literal('aria'),
    schema.literal('ai'),
    schema.literal('config'),
    schema.literal('svg'),
  ),
  sourceRef: Addr,
  keys: Opaque,
  resultDigest: Opaque,
});
const CapTierSchema = schema.union(
  schema.literal('static'),
  schema.literal('styled'),
  schema.literal('reactive'),
  schema.literal('animated'),
  schema.literal('gpu'),
);
// grants is a CapSet: a tagged, deduped level ARRAY. Validated (not Opaque) so a corrupted
// grants — e.g. a Set that JSON-serialized to {} over the mutation channel — is REJECTED by
// isWellFormedNode at the root, never silently accepted into the sealed graph.
//
// Levels must be CANONICAL (deduped, ladder-ascending), not merely an array of valid tiers —
// else an untrusted policy patch could seal a non-canonical CapSet that content-addresses
// DIFFERENTLY from the same logical set built via Cap.from, breaking the identity law at the wire.
// The kernel has no `check`/filter node, so the canonical law rides a `schema.brand` smart
// constructor: it decodes the struct, then throws a ValidationError (folded into a
// `schema/brand` decode issue) when the levels are not canonical.
const CapSetSchema = schema.brand(
  schema.struct({
    _tag: schema.literal('CapSet'),
    levels: schema.array(CapTierSchema),
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
const PolicyNodeSchema = schema.struct({
  _tag: schema.literal('DocGraphPolicyNode'),
  _version: schema.literal(1),
  family: schema.literal('policy'),
  id: Addr,
  meta: Opaque,
  appliesTo: schema.array(Addr),
  requires: CapTierSchema,
  grants: CapSetSchema,
  sites: schema.array(
    schema.union(schema.literal('node'), schema.literal('browser'), schema.literal('worker'), schema.literal('edge')),
  ),
  budgets: schema.optional(Opaque),
});
const ExportNodeSchema = schema.struct({
  _tag: schema.literal('DocGraphExportNode'),
  _version: schema.literal(1),
  family: schema.literal('export'),
  id: Addr,
  meta: Opaque,
  carrier: schema.union(
    schema.literal('astro-page'),
    schema.literal('video'),
    schema.literal('svg'),
    schema.literal('ship-capsule'),
    schema.literal('receipt'),
  ),
  sourceRefs: schema.array(Addr),
  artifactDigest: Opaque,
  receiptHash: schema.optional(schema.string),
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
const DocumentGraphNodeUnion = schema.union(
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
