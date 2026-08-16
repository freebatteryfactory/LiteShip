/**
 * Compile-time laws for `01_hosts/web/09_graphics`.
 *
 * A law is a fixture about the specification, not part of it. Root states the
 * reason and this file applies it: a fixture living in a declaration file
 * becomes part of that file's addressed public type surface, so the proofs live
 * beside the declarations they constrain rather than inside them.
 *
 * Nothing imports this file. It emits no JavaScript and exports no value.
 *
 * @module
 */

import type { ContentAddress } from '../../../00_core/01_encoding/types.js';
import type { EvidenceUpdate, ReproducibilityClaim } from '../../../00_core/06_evidence/types.js';
import type { MediaFrame, MediaRepresentationId } from '../../../00_core/12_media/types.js';
import type { RealizationLifecycle, RealizationOfferId } from '../../../00_core/14_compiler/types.js';
import type { RuntimeCommit } from '../../../00_core/16_runtime/types.js';
import type { Assert, CaseOf, Equal, InputOf, OutputOf } from '../../../types.js';
import type { WebNodeReference } from '../01_region/types.js';
import type { GraphicsAcquisitionRequest, GraphicsApplication, GraphicsAuthority, GraphicsAuthorityOffer, GraphicsContextKind, GraphicsEgress, GraphicsLoss, GraphicsReadback, GraphicsResourceReference, RasterProfile, RasterProfileId, RasterProfileReference, RasterizationRequest, WebGraphicsResource, WebPhysicalFrame } from './types.js';

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


type RasterLawProfileA = RasterProfileId<'liteship.web.graphics.law.profile-a'>;

type RasterLawProfileB = RasterProfileId<'liteship.web.graphics.law.profile-b'>;

type RasterLawRepA = MediaRepresentationId<'liteship.web.graphics.law.representation-a'>;

type RasterLawFrameA = MediaFrame<'liteship.web.graphics.law.state-a'>;

type RasterLawFrameB = MediaFrame<'liteship.web.graphics.law.state-b'>;


/**
 * Compile-time law: a rasterized frame names the *exact* semantic frame it
 * realizes, and a frame realizing another one cannot substitute.
 *
 * The second and third members are the whole law. An earlier form fixed the
 * semantic parameter to broad `MediaFrame` and checked only that a frame-shaped
 * member existed, so a request carrying frame A could return pixels whose
 * provenance named frame B and nothing complained. Presence is not correlation.
 */
export type ARasterizedFrameNamesItsSemanticFrame = Assert<
  Equal<
    [
      RasterizationRequest<RasterLawFrameA, RasterLawProfileA>['frame'],
      CaseOf<
        WebPhysicalFrame<RasterLawRepA, RasterLawFrameA, RasterLawProfileA>['provenance'],
        'rasterized'
      >['frame'],
      WebPhysicalFrame<RasterLawRepA, RasterLawFrameB, RasterLawProfileA> extends WebPhysicalFrame<
        RasterLawRepA,
        RasterLawFrameA,
        RasterLawProfileA
      >
        ? true
        : false,
      WebPhysicalFrame<RasterLawRepA, RasterLawFrameA, RasterLawProfileB> extends WebPhysicalFrame<
        RasterLawRepA,
        RasterLawFrameA,
        RasterLawProfileA
      >
        ? true
        : false,
    ],
    [RasterLawFrameA, RasterLawFrameA, false, false]
  >
>;


/**
 * Compile-time law: a rasterized frame carries no coordinate of its own — the
 * semantic frame it names owns it.
 */
export type ARasterizedFrameBorrowsNoCoordinate = Assert<
  Equal<
    [
      'time' extends keyof WebPhysicalFrame ? true : false,
      'at' extends keyof WebPhysicalFrame ? true : false,
      'provenance' extends keyof WebPhysicalFrame ? true : false,
    ],
    [false, false, true]
  >
>;


/**
 * Compile-time law: readback decides nothing about encoding.
 *
 * A capture that could choose a codec, a container, or a bitrate would have
 * become an encoder wearing the graphics home's name.
 */
export type ReadbackCarriesNoCodecDecision = Assert<
  Equal<
    [
      'codec' extends keyof RasterizationRequest ? true : false,
      'container' extends keyof RasterizationRequest ? true : false,
      'bitrate' extends keyof RasterizationRequest ? true : false,
      'profile' extends keyof RasterizationRequest ? true : false,
    ],
    [false, false, false, true]
  >
>;


/**
 * Compile-time law: a raster profile is more than a context kind, and its
 * reproducibility claim is exact over its own reference.
 */
export type ARasterProfileIsMoreThanAContextKind = Assert<
  Equal<
    [
      RasterProfile<RasterLawProfileA>['configuration'] extends ContentAddress<
        'application/vnd.liteship.web-raster-profile+cbor'
      >
        ? true
        : false,
      RasterProfile<RasterLawProfileA>['reproducibility'] extends ReproducibilityClaim<
        RasterProfileReference<RasterLawProfileA>
      >
        ? true
        : false,
      GraphicsContextKind extends RasterProfile<RasterLawProfileA> ? true : false,
    ],
    [true, true, false]
  >
>;


/**
 * Compile-time law: the provider carries readback beside egress, and readback
 * offers a bounded sequence rather than only a single frame.
 *
 * Long-form export pulls. A provider that can only hand back one frame at a
 * time through a per-call operation forces the consumer to hold the whole
 * render, which is the memory wall this fold exists to remove.
 */
export type TheProviderCarriesReadbackBesideEgress = Assert<
  Equal<
    [
      GraphicsAuthority['readback'],
      GraphicsAuthority['egress'],
      'rasterizeSequence' extends keyof GraphicsReadback ? true : false,
    ],
    [GraphicsReadback, GraphicsEgress, true]
  >
>;
