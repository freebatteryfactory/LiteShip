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
  Brand,
  CaseOf,
  Hole,
  NonEmptyTuple,
  Reference,
  Result,
  Signature,
  TagOf,
} from '../../../types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type { EvidenceUpdate, ReproducibilityClaim } from '../../../00_core/06_evidence/types.js';
import type {
  MediaFrame,
  MediaRepresentationId,
  MediaSource,
  MediaSourceId,
  RasterizedFrame,
} from '../../../00_core/12_media/types.js';
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

// ---------------------------------------------------------------------------
// Rasterization and readback
// ---------------------------------------------------------------------------

export type RasterProfileId<Name extends string = string> = Brand<Name, 'liteship.web.raster-profile-id'>;
export type RasterProfileReference<Id extends RasterProfileId = RasterProfileId> = Reference<
  'web-raster-profile',
  Id
>;

/**
 * Everything physical that decided what these pixels look like.
 *
 * A context kind is not a raster profile. `webgpu` says which API drew the
 * frame and nothing about the font stack, colour space, device pixel ratio, or
 * adapter that determined its bytes — and a reproducibility claim made against
 * a label that coarse is a claim about nothing.
 */
export interface RasterProfile<Id extends RasterProfileId = RasterProfileId> {
  readonly id: RasterProfileReference<Id>;
  readonly context: GraphicsContextKind;
  readonly configuration: ContentAddress<'application/vnd.liteship.web-raster-profile+cbor'>;
  readonly reproducibility: ReproducibilityClaim<RasterProfileReference<Id>>;
}

/**
 * One rasterized frame as this host produces it.
 *
 * Exact over the semantic frame it realizes, not merely over a frame-shaped
 * member. An earlier form fixed the semantic parameter to broad `MediaFrame`,
 * which meant a request carrying frame A could lawfully return pixels whose
 * provenance named frame B — both being assignable to the same broad type. The
 * law read as "a frame member exists" while claiming to read "these pixels
 * realize this exact frame".
 *
 * The payload is exact over its representation. Realm is not part of payload
 * identity; origin lives in provenance.
 */
export type WebPhysicalFrame<
  Representation extends MediaRepresentationId = MediaRepresentationId,
  Frame extends MediaFrame = MediaFrame,
  Profile extends RasterProfileId = RasterProfileId,
> = RasterizedFrame<Representation, Frame, RasterProfileReference<Profile>>;

/**
 * A request to realize one semantic frame on one exact graphics resource.
 *
 * Either cut form is admissible. The editor must be able to rasterize and
 * inspect a counterfactual without committing it to application reality —
 * refusing draft-derived output at a production slot is publication authority
 * and belongs with publication, not with rasterization physics.
 */
export interface RasterizationRequest<
  Frame extends MediaFrame = MediaFrame,
  Profile extends RasterProfileId = RasterProfileId,
> {
  readonly resource: GraphicsResourceReference;
  readonly frame: Frame;
  readonly profile: RasterProfile<Profile>;
}

/**
 * The readback authority: pixels, and the exact semantic frame they realize.
 *
 * This is where live presentation and export become the same evaluation. A
 * readback that could produce a frame without naming the semantic frame it came
 * from would leave the two paths agreeing only by whatever the renderer
 * happened to do that day — which is the entire failure this home exists to
 * make unrepresentable.
 *
 * It carries no codec, container, or bitrate decision. Those belong to the
 * media home, and a readback that chose them would have quietly become an
 * encoder.
 */
export interface GraphicsReadback {
  readonly rasterize: <
    Representation extends MediaRepresentationId,
    Frame extends MediaFrame,
    Profile extends RasterProfileId,
  >(
    request: RasterizationRequest<Frame, Profile>,
  ) => Result<WebPhysicalFrame<Representation, Frame, Profile>, NonEmptyTuple<Diagnostic>>;

  /**
   * A bounded source of rasterized frames for one exact profile.
   *
   * Long-form export pulls; it does not materialize. A five-minute render
   * cannot exist in memory before encoding starts, and an operation returning
   * every frame at once makes that the only shape available.
   */
  readonly rasterizeSequence: <
    Representation extends MediaRepresentationId,
    Frame extends MediaFrame,
    Profile extends RasterProfileId,
    Source extends MediaSourceId,
  >(
    request: RasterizationRequest<Frame, Profile>,
  ) => Result<
    MediaSource<WebPhysicalFrame<Representation, Frame, Profile>, Source>,
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
  readonly readback: GraphicsReadback;
}

export type GpuAccessRequirement = Hole<'liteship.web.gpu-access', GpuAccess>;
export type GraphicsAuthorityRequirement = Hole<'liteship.web.graphics-authority', GraphicsAuthority>;

/** Intrinsic grounding: the access facility, not any acquired device. */
export interface GpuAccessGrounding
  extends WebGroundingDefinition<readonly [GpuAccessRequirement], GpuAccess, 'intrinsic', 'unowned'> {
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

/** Type summary consumed by the web topology. */
export interface WebGraphicsTypeSurface {
  readonly resource: WebGraphicsResource;
  readonly loss: GraphicsLoss;
  readonly egress: GraphicsEgress;
  readonly readback: GraphicsReadback;
  readonly rasterProfile: RasterProfile;
  readonly physicalFrame: WebPhysicalFrame;
  readonly frameSource: MediaSource<WebPhysicalFrame>;
  readonly authority: GraphicsAuthority;
  readonly access: GpuAccessGrounding;
  readonly offer: GraphicsAuthorityOffer;
}
