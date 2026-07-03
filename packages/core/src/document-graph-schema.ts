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
 * Each family is a `Schema.Struct`; the union over all EIGHT families is the
 * single source of truth. The compile-time exhaustiveness check makes "added a
 * family to document-graph.ts but not a schema here" a BUILD error — closing the
 * "validator missed a family" class for good (no runtime table to forget).
 *
 * Branded string types (ContentAddress / SignalInput / StateName /
 * AddressedDigest) validate as plain `Schema.String`: the brand is a
 * compile-time refinement and the address FORMAT is an invariant, not a wire
 * law. `meta` and the structurally-opaque fields (CapSet, the digests,
 * ProjectionKeys, the evaluate cache) are `Schema.Unknown` — presence is the
 * contract; their shape is sealed/derived elsewhere.
 *
 * @module
 */

import { Schema } from 'effect';
import { isCanonicalCapSet } from './caps.js';
import type { DocumentGraphNode, NodeFamily } from './document-graph.js';

/** Branded-string fields validate as plain strings (brand + format are compile-time / invariant laws). */
const Addr = Schema.String;
/** `meta` + structurally-opaque fields: presence is the contract, internal shape is sealed/derived elsewhere. */
const Opaque = Schema.Unknown;

const SignalNodeSchema = Schema.Struct({
  _tag: Schema.Literal('DocGraphSignalNode'),
  _version: Schema.Literal(1),
  family: Schema.Literal('signal'),
  id: Addr,
  meta: Opaque,
  input: Schema.String,
  range: Schema.optional(Schema.Tuple([Schema.Number, Schema.Number])),
});
const EntityNodeSchema = Schema.Struct({
  _tag: Schema.Literal('DocGraphEntityNode'),
  _version: Schema.Literal(1),
  family: Schema.Literal('entity'),
  id: Addr,
  meta: Opaque,
  components: Schema.Array(Addr),
});
const ComponentNodeSchema = Schema.Struct({
  _tag: Schema.Literal('DocGraphComponentNode'),
  _version: Schema.Literal(1),
  family: Schema.Literal('component'),
  id: Addr,
  meta: Opaque,
  name: Schema.String,
  boundaryRef: Schema.optional(Addr),
  thresholds: Schema.optional(Schema.Array(Opaque)),
  states: Schema.optional(Schema.Array(Schema.String)),
});
const PoseNodeSchema = Schema.Struct({
  _tag: Schema.Literal('DocGraphPoseNode'),
  _version: Schema.Literal(1),
  family: Schema.Literal('pose'),
  id: Addr,
  meta: Opaque,
  entityRef: Addr,
  state: Schema.String,
  bindings: Schema.Record(Schema.String, Schema.Union([Schema.Number, Schema.String])),
  evaluated: Schema.optional(Opaque),
});
const TransitionNodeSchema = Schema.Struct({
  _tag: Schema.Literal('DocGraphTransitionNode'),
  _version: Schema.Literal(1),
  family: Schema.Literal('transition'),
  id: Addr,
  meta: Opaque,
  fromPose: Addr,
  toPose: Addr,
  routing: Schema.Union([
    Schema.Literal('seq'),
    Schema.Literal('par'),
    Schema.Literal('choice_then'),
    Schema.Literal('choice_else'),
  ]),
  durationMs: Schema.optional(Schema.Number),
});
const ProjectionNodeSchema = Schema.Struct({
  _tag: Schema.Literal('DocGraphProjectionNode'),
  _version: Schema.Literal(1),
  family: Schema.Literal('projection'),
  id: Addr,
  meta: Opaque,
  target: Schema.Union([
    Schema.Literal('css'),
    Schema.Literal('glsl'),
    Schema.Literal('wgsl'),
    Schema.Literal('aria'),
    Schema.Literal('ai'),
    Schema.Literal('config'),
    Schema.Literal('svg'),
  ]),
  sourceRef: Addr,
  keys: Opaque,
  resultDigest: Opaque,
});
const CapTierSchema = Schema.Union([
  Schema.Literal('static'),
  Schema.Literal('styled'),
  Schema.Literal('reactive'),
  Schema.Literal('animated'),
  Schema.Literal('gpu'),
]);
// grants is a CapSet: a tagged, deduped level ARRAY. Validated (not Opaque) so a corrupted
// grants — e.g. a Set that JSON-serialized to {} over the mutation channel — is REJECTED by
// isWellFormedNode at the root, never silently accepted into the sealed graph.
const CapSetSchema = Schema.Struct({
  _tag: Schema.Literal('CapSet'),
  levels: Schema.Array(CapTierSchema),
}).pipe(
  // Levels must be CANONICAL (deduped, ladder-ascending), not merely an array of valid tiers —
  // else an untrusted policy patch could seal a non-canonical CapSet that content-addresses
  // DIFFERENTLY from the same logical set built via Cap.from, breaking the identity law at the wire.
  Schema.check(
    Schema.makeFilter((cs) =>
      isCanonicalCapSet(cs)
        ? undefined
        : 'CapSet.levels must be canonical: deduped and ascending by the capability ladder (static < styled < reactive < animated < gpu)',
    ),
  ),
);
const PolicyNodeSchema = Schema.Struct({
  _tag: Schema.Literal('DocGraphPolicyNode'),
  _version: Schema.Literal(1),
  family: Schema.Literal('policy'),
  id: Addr,
  meta: Opaque,
  appliesTo: Schema.Array(Addr),
  requires: CapTierSchema,
  grants: CapSetSchema,
  sites: Schema.Array(
    Schema.Union([Schema.Literal('node'), Schema.Literal('browser'), Schema.Literal('worker'), Schema.Literal('edge')]),
  ),
  budgets: Schema.optional(Opaque),
});
const ExportNodeSchema = Schema.Struct({
  _tag: Schema.Literal('DocGraphExportNode'),
  _version: Schema.Literal(1),
  family: Schema.Literal('export'),
  id: Addr,
  meta: Opaque,
  carrier: Schema.Union([
    Schema.Literal('astro-page'),
    Schema.Literal('video'),
    Schema.Literal('svg'),
    Schema.Literal('ship-capsule'),
    Schema.Literal('receipt'),
  ]),
  sourceRefs: Schema.Array(Addr),
  artifactDigest: Opaque,
  receiptHash: Schema.optional(Schema.String),
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

/**
 * The single source of truth for "is this a well-formed DocumentGraph node?".
 * Carries the Standard Schema V1 `~standard` interop property, so any
 * Standard-Schema-aware consumer can use the same node gate directly.
 * `Schema.is` / {@link isWellFormedNode} behavior is unchanged.
 */
export const DocumentGraphNodeSchema = Schema.toStandardSchemaV1(
  Schema.Union([
    SignalNodeSchema,
    EntityNodeSchema,
    ComponentNodeSchema,
    PoseNodeSchema,
    TransitionNodeSchema,
    ProjectionNodeSchema,
    PolicyNodeSchema,
    ExportNodeSchema,
  ]),
);

/**
 * Type guard: does this untrusted value conform to ONE of the eight
 * `DocumentGraphNode` family schemas (correct `_tag`/`_version`/`family` and the
 * family's required, correctly-typed fields)? The shared trust gate both the AI
 * proposal validator and the runtime graph loader read.
 */
export const isWellFormedNode: (value: unknown) => value is DocumentGraphNode = Schema.is(DocumentGraphNodeSchema) as (
  value: unknown,
) => value is DocumentGraphNode;
