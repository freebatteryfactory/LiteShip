// The host media I/O closure: readback, capture, browser codecs, and the four
// server relationships.
//
// The two failures this fold removed were a graphics home that could present
// forever and export nothing, and a server media path whose only operation
// accepted a schema describing a frame and emitted bytes framed as network
// traffic. Every mutation here is a route back to one of them.

import { runBank } from '../harness.mjs';

const GX = '01_hosts/web/09_graphics/types.ts';
const WM = '01_hosts/web/08_media/types.ts';
const CP = '01_hosts/web/12_capture/types.ts';
const SM = '01_hosts/server/10_media/types.ts';

const M = [
  // --- graphics readback ---------------------------------------------------
  ['rasterization stops naming the semantic frame it realizes', GX,
    `  readonly resource: GraphicsResourceReference;
  readonly frame: MediaFrame;
  readonly profile: RasterProfile<Profile>;`,
    `  readonly resource: GraphicsResourceReference;
  readonly profile: RasterProfile<Profile>;`],

  ['rasterization stops naming the resource it drew on', GX,
    `  readonly resource: GraphicsResourceReference;
  readonly frame: MediaFrame;`,
    `  readonly frame: MediaFrame;`],

  ['readback acquires a codec decision', GX,
    `  readonly resource: GraphicsResourceReference;
  readonly frame: MediaFrame;
  readonly profile: RasterProfile<Profile>;`,
    `  readonly resource: GraphicsResourceReference;
  readonly frame: MediaFrame;
  readonly codec: string;
  readonly profile: RasterProfile<Profile>;`],

  ['readback acquires a container decision', GX,
    `  readonly resource: GraphicsResourceReference;
  readonly frame: MediaFrame;
  readonly profile: RasterProfile<Profile>;`,
    `  readonly resource: GraphicsResourceReference;
  readonly frame: MediaFrame;
  readonly container: string;
  readonly profile: RasterProfile<Profile>;`],

  ['the graphics provider loses readback and can only present', GX,
    `  readonly adopt: Signature<WebGraphicsResource, WebGraphicsResource, NonEmptyTuple<Diagnostic>>;
  readonly egress: GraphicsEgress;
  readonly readback: GraphicsReadback;`,
    `  readonly adopt: Signature<WebGraphicsResource, WebGraphicsResource, NonEmptyTuple<Diagnostic>>;
  readonly egress: GraphicsEgress;`],

  ['the rasterized frame stops being exact over its profile', GX,
    `export type WebPhysicalFrame<Profile extends RasterProfileId = RasterProfileId> = PhysicalFrame<
  WebFramePayload,
  MediaFrame,
  RasterProfileReference<Profile>,
  never
>;`,
    `export type WebPhysicalFrame<Profile extends RasterProfileId = RasterProfileId> = PhysicalFrame<
  WebFramePayload,
  MediaFrame,
  RasterProfileReference<RasterProfileId>,
  never
>;`],

  // --- browser codecs ------------------------------------------------------
  ['the browser decoder loses its operation and goes back to construction', WM,
    `  readonly admit: Signature<DecodeProfileReference, CodecSupport, NonEmptyTuple<Diagnostic>>;
  readonly decode: <Profile extends DecodeProfileId>(
    request: WebDecodeRequest<Profile>,
  ) => Result<WebDecodeProduct<Profile>, NonEmptyTuple<Diagnostic>>;`,
    `  readonly admit: Signature<DecodeProfileReference, CodecSupport, NonEmptyTuple<Diagnostic>>;`],

  ['the browser encoder loses its operation', WM,
    `  readonly admit: Signature<EncodeProfileReference, CodecSupport, NonEmptyTuple<Diagnostic>>;
  readonly encode: <Profile extends EncodeProfileId, Frame extends PhysicalFrame>(
    request: WebEncodeRequest<Profile, Frame>,
  ) => Result<WebEncodeProduct<Profile, Frame>, NonEmptyTuple<Diagnostic>>;`,
    `  readonly admit: Signature<EncodeProfileReference, CodecSupport, NonEmptyTuple<Diagnostic>>;`],

  ['the mux authority loses its operation', WM,
    `export interface WebMuxAuthority {
  readonly finalize: <`,
    `export interface WebMuxAuthority {
  readonly unusedFinalize: <`],

  ['an unsupported codec configuration goes silent', WM,
    `  unsupported: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
}>;

/** The browser's physical media payload — pixels or samples, addressed. */`,
    `  unsupported: Record<never, never>;
}>;

/** The browser's physical media payload — pixels or samples, addressed. */`],

  ['unsupported codec diagnostics accept an empty population', WM,
    `  unsupported: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
}>;

/** The browser's physical media payload — pixels or samples, addressed. */`,
    `  unsupported: { readonly diagnostics: readonly Diagnostic[] };
}>;

/** The browser's physical media payload — pixels or samples, addressed. */`],

  ['the browser encode accepts an empty frame population', WM,
    `  readonly tracks: MediaTrackConfiguration;
  readonly frames: NonEmptyTuple<Frame>;
}

export interface WebEncodeProduct<`,
    `  readonly tracks: MediaTrackConfiguration;
  readonly frames: readonly Frame[];
}

export interface WebEncodeProduct<`],

  ['browser packets stop being exact over their profile', WM,
    `  readonly packets: NonEmptyTuple<MediaPacket<Profile>>;
  readonly reproducibility: ReproducibilityClaim<EncodeProfileReference<Profile>>;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;`,
    `  readonly packets: NonEmptyTuple<MediaPacket>;
  readonly reproducibility: ReproducibilityClaim<EncodeProfileReference<Profile>>;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;`],

  ['the encode product stops being owned and cannot be disposed', WM,
    `  readonly reproducibility: ReproducibilityClaim<EncodeProfileReference<Profile>>;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;`,
    `  readonly reproducibility: ReproducibilityClaim<EncodeProfileReference<Profile>>;
  readonly lifecycle: RealizationLifecycle;`],

  // --- capture -------------------------------------------------------------
  ['capture stops requiring a committed composition', CP,
    `  readonly composition: CapturedComposition;
  readonly profile: CaptureProfile<Profile>;`,
    `  readonly profile: CaptureProfile<Profile>;`],

  ['the captured composition drops its projection commit', CP,
    `export interface CapturedComposition {
  readonly commit: ProjectionCommit;
  readonly boundary: RegionBoundary;
}`,
    `export interface CapturedComposition {
  readonly boundary: RegionBoundary;
}`],

  ['a captured frame claims to realize a semantic frame', CP,
    `export type CapturedFrame<Profile extends CaptureProfileId = CaptureProfileId> = PhysicalFrame<
  CapturePayload,
  never,
  CaptureProfileReference<Profile>,
  CapturedComposition
>;`,
    `export type CapturedFrame<Profile extends CaptureProfileId = CaptureProfileId> = PhysicalFrame<
  CapturePayload,
  MediaFrame,
  CaptureProfileReference<Profile>,
  CapturedComposition
>;`],

  ['capture acquires a codec decision', CP,
    `  readonly composition: CapturedComposition;
  readonly profile: CaptureProfile<Profile>;
  readonly surfaces: readonly GraphicsResourceReference[];`,
    `  readonly composition: CapturedComposition;
  readonly profile: CaptureProfile<Profile>;
  readonly codec: string;
  readonly surfaces: readonly GraphicsResourceReference[];`],

  ['capture acquires a scene model of its own', CP,
    `  readonly composition: CapturedComposition;
  readonly profile: CaptureProfile<Profile>;
  readonly surfaces: readonly GraphicsResourceReference[];`,
    `  readonly composition: CapturedComposition;
  readonly profile: CaptureProfile<Profile>;
  readonly scene: { readonly nodes: readonly unknown[] };
  readonly surfaces: readonly GraphicsResourceReference[];`],

  ['capture availability collapses to two arms and loses the permission case', CP,
    `  'permission-required': { readonly diagnostics: NonEmptyTuple<Diagnostic> };
  unavailable: { readonly diagnostics: NonEmptyTuple<Diagnostic> };`,
    `  unavailable: { readonly diagnostics: NonEmptyTuple<Diagnostic> };`],

  ['a permission refusal goes silent about why', CP,
    `  'permission-required': { readonly diagnostics: NonEmptyTuple<Diagnostic> };`,
    `  'permission-required': Record<never, never>;`],

  // --- server media --------------------------------------------------------
  ['the render job goes back to a schema instead of frames', SM,
    `  readonly destination: AdmittedPath<Out>;
  readonly frames: NonEmptyTuple<ServerPhysicalFrame>;
  readonly cancel: Signature<MediaJobReference<Id>, MediaJobReference<Id>, NonEmptyTuple<Diagnostic>>;`,
    `  readonly destination: AdmittedPath<Out>;
  readonly cancel: Signature<MediaJobReference<Id>, MediaJobReference<Id>, NonEmptyTuple<Diagnostic>>;`],

  ['the render job accepts an empty frame population', SM,
    `  readonly frames: NonEmptyTuple<ServerPhysicalFrame>;
  readonly cancel: Signature<MediaJobReference<Id>, MediaJobReference<Id>, NonEmptyTuple<Diagnostic>>;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

// ---------------------------------------------------------------------------
// Encode`,
    `  readonly frames: readonly ServerPhysicalFrame[];
  readonly cancel: Signature<MediaJobReference<Id>, MediaJobReference<Id>, NonEmptyTuple<Diagnostic>>;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

// ---------------------------------------------------------------------------
// Encode`],

  ['the packet stream goes back to network framing', SM,
    `  readonly receive: Signature<
    MediaBufferBound,
    readonly MediaPacket<Profile>[],
    NonEmptyTuple<Diagnostic>
  >;`,
    `  readonly receive: Signature<
    MediaBufferBound,
    readonly import('../04_network/types.js').ServerEncodedChunk[],
    NonEmptyTuple<Diagnostic>
  >;`],

  ['the packet stream stops being exact over its profile', SM,
    `  readonly receive: Signature<
    MediaBufferBound,
    readonly MediaPacket<Profile>[],
    NonEmptyTuple<Diagnostic>
  >;`,
    `  readonly receive: Signature<
    MediaBufferBound,
    readonly MediaPacket[],
    NonEmptyTuple<Diagnostic>
  >;`],

  ['the media job goes back to a bare tool reference', SM,
    `  readonly contract: SchemaReference<Contract, MediaFrame>;
  readonly tool: ToolProfile<Tool>;
  readonly destination: AdmittedPath<Out>;
  readonly frames: NonEmptyTuple<ServerPhysicalFrame>;`,
    `  readonly contract: SchemaReference<Contract, MediaFrame>;
  readonly tool: import('../07_tool/types.js').ToolReference<Tool>;
  readonly destination: AdmittedPath<Out>;
  readonly frames: NonEmptyTuple<ServerPhysicalFrame>;`],

  ['the render job stops naming the cut it rendered', SM,
    `  readonly source: ContentAddress<'application/vnd.liteship.program+cbor'>;
  readonly cut: SemanticCut;
  readonly position: ServerSamplePosition;
  readonly contract: SchemaReference<Contract, MediaFrame>;
  readonly tool: ToolProfile<Tool>;
  readonly destination: AdmittedPath<Out>;
  readonly frames: NonEmptyTuple<ServerPhysicalFrame>;`,
    `  readonly source: ContentAddress<'application/vnd.liteship.program+cbor'>;
  readonly position: ServerSamplePosition;
  readonly contract: SchemaReference<Contract, MediaFrame>;
  readonly tool: ToolProfile<Tool>;
  readonly destination: AdmittedPath<Out>;
  readonly frames: NonEmptyTuple<ServerPhysicalFrame>;`],

  ['the four server operations collapse back into one render', SM,
    `  readonly encode: <Profile extends EncodeProfileId, Tool extends ToolId, Id extends MediaJobId>(
    request: ServerEncodeRequest<Profile, Tool, Id>,
  ) => Result<ServerEncodeJob<Profile, Tool, Id>, NonEmptyTuple<Diagnostic>>;`,
    ``],

  ['the mux stage claims reproducibility over the encoder instead of the container', SM,
    `  readonly artifact: MediaArtifact<Asset, Container>;
  readonly reproducibility: ReproducibilityClaim<ContainerProfileReference<Container>>;`,
    `  readonly artifact: MediaArtifact<Asset, Container>;
  readonly reproducibility: ReproducibilityClaim<EncodeProfileReference<Profile>>;`],

  ['the encode job opens a stream that forgets its job', SM,
    `  readonly open: Signature<
    MediaJobReference<Id>,
    MediaPacketStream<Id, Profile>,
    NonEmptyTuple<Diagnostic>
  >;`,
    `  readonly open: Signature<
    MediaJobReference<Id>,
    MediaPacketStream<MediaJobId, Profile>,
    NonEmptyTuple<Diagnostic>
  >;`],
];

process.exit(runBank('media-io-hosts', M).clean ? 0 : 1);
