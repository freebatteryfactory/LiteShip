/**
 * Physical browser graphics: canvas, WebGL, and WebGPU.
 *
 * Core owns scene meaning, geometry, shaders, execution kernels, backend
 * parity, and settlement. This home owns physical context and device
 * acquisition, loss, resource lifetime, and the application of admitted scene
 * or runtime outputs to browser graphics egresses.
 *
 * The GPU capability probe is web evidence; a concrete adapter or device is
 * acquired through an offer requiring the access facility. Context and device
 * loss are typed evidence from a lawfully bound authority — never fabricated
 * as a missing binding or a construction failure. Custody is representable
 * both ways: a precreated injected context may be grounded, an acquired one is
 * owned. GPU reconciliation remains research and is not the default browser
 * execution architecture.
 *
 * @module
 */

import type {
  Algebra,
  Assert,
  Brand,
  CaseOf,
  Equal,
  Hole,
  InputOf,
  NonEmptyTuple,
  OutputOf,
  Reference,
  Signature,
  TagOf,
} from '../../../types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type { EvidenceUpdate } from '../../../00_core/06_evidence/types.js';
import type { CanonicalValue, ContentAddress } from '../../../00_core/01_encoding/types.js';
import type {
  GroundingId,
  RealizationLifecycle,
  RealizationOfferId,
} from '../../../00_core/14_compiler/types.js';
import type { RuntimeCommit } from '../../../00_core/16_runtime/types.js';
import type { WebGroundingDefinition, WebRealizationOffer } from '../00_bootstrap/types.js';
import type { WebNodeReference } from '../01_region/types.js';

export type GraphicsResourceId<Name extends string = string> = Brand<Name, 'liteship.web.graphics-resource-id'>;
export type GraphicsResourceReference<Id extends GraphicsResourceId = GraphicsResourceId> = Reference<
  'web-graphics-resource',
  Id
>;

/** The physical browser graphics context kinds. */
export type GraphicsContextKind = 'canvas-2d' | 'webgl' | 'webgpu';

/**
 * One live physical graphics resource. The lifecycle arm is a parameter so an
 * injected precreated context (grounded, custody recorded) and an acquired
 * device (offered, owned) are both representable.
 */
export interface WebGraphicsResource<
  Life extends TagOf<RealizationLifecycle> = TagOf<RealizationLifecycle>,
> {
  readonly id: GraphicsResourceReference;
  readonly kind: GraphicsContextKind;
  readonly lifecycle: CaseOf<RealizationLifecycle, Life>;
}

/**
 * Context or device loss, reported as evidence by a bound authority. Loss is
 * a fact about the world, not a failure of the plan that bound the authority.
 */
export type GraphicsLoss = Algebra<{
  'context-lost': {
    readonly resource: GraphicsResourceReference;
    readonly evidence: EvidenceUpdate;
  };
  'device-lost': {
    readonly resource: GraphicsResourceReference;
    readonly evidence: EvidenceUpdate;
  };
}>;

// ---------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------

/** Narrow intrinsic authority over browser graphics entrypoints. */
export interface GpuAccess {
  readonly acquire: Signature<
    GraphicsContextKind,
    WebGraphicsResource<'owned'>,
    NonEmptyTuple<Diagnostic>
  >;
}

/**
 * The graphics egress: the authority that applies committed outputs to a
 * browser graphics resource. Possessing a device is not applying anything;
 * this is the missing half that makes graphics an egress rather than a
 * collection.
 */
/** One committed application bound to the exact resource that receives it. */
export interface GraphicsApplication {
  readonly commit: RuntimeCommit;
  readonly resource: GraphicsResourceReference;
}

export interface GraphicsEgress {
  readonly apply: Signature<
    GraphicsApplication,
    ContentAddress<'application/vnd.liteship.web-graphics-commit+cbor'>,
    NonEmptyTuple<Diagnostic>
  >;
}

/** A complete acquisition request: kind, physical target, and configuration. */
export interface GraphicsAcquisitionRequest {
  readonly kind: GraphicsContextKind;
  readonly target: WebNodeReference;
  readonly configuration: CanonicalValue;
}

/**
 * The persistent graphics provider: it acquires repeatable device and context
 * resources against real physical targets, adopts injected precreated
 * resources into the same lawful path, and carries the egress that applies
 * committed outputs. A resource record without this authority is furniture.
 */
export interface GraphicsAuthority {
  readonly acquire: Signature<
    GraphicsAcquisitionRequest,
    WebGraphicsResource<'owned'>,
    NonEmptyTuple<Diagnostic>
  >;
  readonly adopt: Signature<WebGraphicsResource, WebGraphicsResource, NonEmptyTuple<Diagnostic>>;
  readonly egress: GraphicsEgress;
}

export type GpuAccessRequirement = Hole<'liteship.web.gpu-access', GpuAccess>;
export type GraphicsAuthorityRequirement = Hole<'liteship.web.graphics-authority', GraphicsAuthority>;

/** Intrinsic grounding: the access facility, not any acquired device. */
export interface GpuAccessGrounding
  extends WebGroundingDefinition<readonly [GpuAccessRequirement], unknown, 'intrinsic', 'unowned'> {
  readonly id: GroundingId<'liteship.web.grounding.gpu-access'>;
}

/**
 * Standing up the graphics provider is an offer requiring the access
 * facility. Devices and contexts are its repeatable resources; an injected
 * precreated context reaches the same egress through `adopt`, which wraps
 * without pretending it acquired anything.
 */
export interface GraphicsAuthorityOffer
  extends WebRealizationOffer<
    readonly [GraphicsAuthorityRequirement],
    readonly [GpuAccessRequirement],
    unknown,
    unknown,
    'owned'
  > {
  readonly id: RealizationOfferId<'liteship.web.offer.graphics-authority'>;
  readonly locations: NonEmptyTuple<'local' | 'live'>;
  readonly backends: NonEmptyTuple<'javascript' | 'webgpu'>;
}

// ---------------------------------------------------------------------------
// Laws
//
// WebGPU thresholds and backend crossover points are empirical profile
// territory, never declared constants.
// ---------------------------------------------------------------------------

/** Compile-time law: loss carries evidence and never a fabricated failure key. */
export type LossIsEvidenceNeverAFabricatedFailure = Assert<
  Equal<
    [
      GraphicsLoss extends { readonly evidence: EvidenceUpdate } ? true : false,
      'failure' extends keyof CaseOf<GraphicsLoss, 'context-lost'> ? true : false,
      'failure' extends keyof CaseOf<GraphicsLoss, 'device-lost'> ? true : false,
    ],
    [true, false, false]
  >
>;

/** Compile-time law: the physical context set is closed and declared. */
export type TheContextSetIsClosedAndDeclared = Assert<
  Equal<GraphicsContextKind, 'canvas-2d' | 'webgl' | 'webgpu'>
>;

/**
 * Compile-time law: the provider acquires against a real physical target,
 * adopts injected resources into the same path, carries the egress, and its
 * resources are repeatable values — never a resource-shaped hole.
 */
export type TheProviderAcquiresAdoptsAndApplies = Assert<
  Equal<
    [
      InputOf<GraphicsAuthority['acquire']>,
      GraphicsAcquisitionRequest['target'],
      OutputOf<GraphicsAuthority['adopt']>,
      GraphicsAuthority['egress'],
      GraphicsAuthorityOffer['id'],
      readonly [WebGraphicsResource, WebGraphicsResource] extends readonly WebGraphicsResource[]
        ? true
        : false,
    ],
    [
      GraphicsAcquisitionRequest,
      WebNodeReference,
      WebGraphicsResource,
      GraphicsEgress,
      RealizationOfferId<'liteship.web.offer.graphics-authority'>,
      true,
    ]
  >
>;

/** Compile-time law: the egress applies a committed output to a named resource. */
export type TheEgressAppliesToANamedResource = Assert<
  Equal<
    [InputOf<GraphicsEgress['apply']>, GraphicsApplication['commit'], GraphicsApplication['resource']],
    [GraphicsApplication, RuntimeCommit, GraphicsResourceReference]
  >
>;

/** Compile-time law: an injected precreated context is representable with retained custody. */
export type InjectedContextCustodyIsRepresentable = Assert<
  Equal<WebGraphicsResource<'unowned'>['lifecycle'], CaseOf<RealizationLifecycle, 'unowned'>>
>;

/** Type summary consumed by the web topology. */
export interface WebGraphicsTypeSurface {
  readonly resource: WebGraphicsResource;
  readonly loss: GraphicsLoss;
  readonly egress: GraphicsEgress;
  readonly authority: GraphicsAuthority;
  readonly access: GpuAccessGrounding;
  readonly offer: GraphicsAuthorityOffer;
}
