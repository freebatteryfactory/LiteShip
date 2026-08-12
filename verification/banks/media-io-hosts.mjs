// The host media I/O closure: readback correlation, capture altitude, codec
// convergence, and the server render stage.
//
// Two failures this fold removed: a graphics home that could present forever
// and export nothing, and three host codec contracts standing beside core's
// while the README claimed they had met. Every mutation here is a route back.

import { runBank } from '../harness.mjs';

const GX = '01_hosts/web/09_graphics/types.ts';
const WM = '01_hosts/web/08_media/types.ts';
const CP = '01_hosts/web/12_capture/types.ts';
const SM = '01_hosts/server/10_media/types.ts';
const TL = '01_hosts/server/07_tool/types.ts';

const M = [
  // --- graphics readback ---------------------------------------------------
  ['rasterization stops naming the semantic frame it realizes', GX,
    `  readonly resource: GraphicsResourceReference;
  readonly frame: Frame;
  readonly profile: RasterProfile<Profile>;`,
    `  readonly resource: GraphicsResourceReference;
  readonly profile: RasterProfile<Profile>;`],

  ['the rasterization request broadens off its exact frame', GX,
    `  readonly resource: GraphicsResourceReference;
  readonly frame: Frame;`,
    `  readonly resource: GraphicsResourceReference;
  readonly frame: MediaFrame;`],

  ['the rasterized frame fixes its semantic parameter to the broad form', GX,
    `> = RasterizedFrame<Representation, Frame, RasterProfileReference<Profile>>;`,
    `> = RasterizedFrame<Representation, MediaFrame, RasterProfileReference<Profile>>;`],

  ['readback acquires a codec decision', GX,
    `  readonly resource: GraphicsResourceReference;
  readonly frame: Frame;
  readonly profile: RasterProfile<Profile>;`,
    `  readonly resource: GraphicsResourceReference;
  readonly frame: Frame;
  readonly codec: string;
  readonly profile: RasterProfile<Profile>;`],

  ['the graphics provider loses readback and can only present', GX,
    `  readonly adopt: Signature<WebGraphicsResource, WebGraphicsResource, NonEmptyTuple<Diagnostic>>;
  readonly egress: GraphicsEgress;
  readonly readback: GraphicsReadback;`,
    `  readonly adopt: Signature<WebGraphicsResource, WebGraphicsResource, NonEmptyTuple<Diagnostic>>;
  readonly egress: GraphicsEgress;`],

  ['readback loses its bounded sequence and can only hand back one frame', GX,
    `  readonly rasterizeSequence: <`,
    `  readonly unusedRasterizeSequence: <`],

  ['the raster profile collapses back into a context kind', GX,
    `  readonly context: GraphicsContextKind;
  readonly configuration: ContentAddress<'application/vnd.liteship.web-raster-profile+cbor'>;`,
    `  readonly context: GraphicsContextKind;`],

  ['the raster claim broadens off its own profile', GX,
    `  readonly reproducibility: ReproducibilityClaim<RasterProfileReference<Id>>;`,
    `  readonly reproducibility: ReproducibilityClaim<RasterProfileReference>;`],

  // --- browser codec convergence -------------------------------------------
  ['the browser declares a decoder contract of its own again', WM,
    `export type WebDecoderAuthority = MediaDecoderAuthority;`,
    `export type WebDecoderAuthority = { readonly decode: (request: unknown) => unknown };`],

  ['the browser declares an encoder contract of its own again', WM,
    `export type WebEncoderAuthority = MediaEncoderAuthority;`,
    `export type WebEncoderAuthority = { readonly encode: (request: unknown) => unknown };`],

  ['the codec facility stops carrying the core decoder', WM,
    `  readonly decoder: MediaDecoderAuthority;
  readonly encoder: MediaEncoderAuthority;`,
    `  readonly encoder: MediaEncoderAuthority;`],

  ['the codec offer provides browser-local requirements instead of core ones', WM,
    `    readonly [MediaDecoderRequirement, MediaEncoderRequirement, MediaMuxRequirement],
    readonly [WebCodecAdmissionRequirement],`,
    `    readonly [WebCodecAdmissionRequirement],
    readonly [WebCodecAdmissionRequirement],`],

  ['the codec offer drops the mux requirement', WM,
    `    readonly [MediaDecoderRequirement, MediaEncoderRequirement, MediaMuxRequirement],`,
    `    readonly [MediaDecoderRequirement, MediaEncoderRequirement],`],

  ['admission stops covering containers', WM,
    `  readonly admitContainer: Signature<
    ContainerProfileReference,
    CodecAdmission<ContainerProfileReference>,
    NonEmptyTuple<Diagnostic>
  >;`,
    ``],

  ['the codec provider is grounded rather than offered', WM,
    `  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

/** Grounding the narrow browser codec entrypoint — an intrinsic, unowned fact. */`,
    `  readonly lifecycle: RealizationLifecycle;
}

/** Grounding the narrow browser codec entrypoint — an intrinsic, unowned fact. */`],

  ['the admission grounding claims to provide the whole facility', WM,
    `export interface CodecAdmissionGrounding
  extends WebGroundingDefinition<
    readonly [WebCodecAdmissionRequirement],`,
    `export interface CodecAdmissionGrounding
  extends WebGroundingDefinition<
    readonly [MediaEncoderRequirement],`],

  // --- capture -------------------------------------------------------------
  ['capture stops requiring a committed composition', CP,
    `  readonly composition: CapturedComposition<Cut>;
  readonly profile: CaptureProfile<Profile>;`,
    `  readonly profile: CaptureProfile<Profile>;`],

  ['the captured composition drops its projection commit', CP,
    `export interface CapturedComposition<Cut extends SemanticCut = SemanticCut> {
  readonly commit: ProjectionCommit<Cut>;
  readonly scope: CaptureScopeReference;
}`,
    `export interface CapturedComposition<Cut extends SemanticCut = SemanticCut> {
  readonly scope: CaptureScopeReference;
}`],

  ['the captured composition reacquires a second writable boundary', CP,
    `  readonly commit: ProjectionCommit<Cut>;
  readonly scope: CaptureScopeReference;`,
    `  readonly commit: ProjectionCommit<Cut>;
  readonly scope: CaptureScopeReference;
  readonly boundary: import('../01_region/types.js').RegionBoundary;`],

  ['a captured frame claims to realize a semantic frame', CP,
    `> = CapturedFrame<Representation, CapturedComposition<Cut>, CaptureProfileReference<Profile>>;`,
    `> = import('../../../00_core/12_media/types.js').RasterizedFrame<
  Representation,
  import('../../../00_core/12_media/types.js').MediaFrame,
  CaptureProfileReference<Profile>
>;`],

  ['capture acquires a codec decision', CP,
    `  readonly composition: CapturedComposition<Cut>;
  readonly profile: CaptureProfile<Profile>;
  readonly surfaces: readonly GraphicsResourceReference[];`,
    `  readonly composition: CapturedComposition<Cut>;
  readonly profile: CaptureProfile<Profile>;
  readonly codec: string;
  readonly surfaces: readonly GraphicsResourceReference[];`],

  ['capture availability loses the permission case', CP,
    `  'permission-required': { readonly diagnostics: NonEmptyTuple<Diagnostic> };
  unavailable: { readonly diagnostics: NonEmptyTuple<Diagnostic> };`,
    `  unavailable: { readonly diagnostics: NonEmptyTuple<Diagnostic> };`],

  ['an unavailable capture accepts an empty diagnostic population', CP,
    `  unavailable: { readonly diagnostics: NonEmptyTuple<Diagnostic> };`,
    `  unavailable: { readonly diagnostics: readonly Diagnostic[] };`],

  ['the owned capture authority is declared intrinsic again', CP,
    `export interface CaptureFacilityGrounding
  extends WebGroundingDefinition<
    readonly [CaptureFacilityRequirement],`,
    `export interface CaptureFacilityGrounding
  extends WebGroundingDefinition<
    readonly [CaptureAuthorityRequirement],`],

  ['the capture offer stops requiring the intrinsic facility', CP,
    `    readonly [CaptureAuthorityRequirement],
    readonly [CaptureFacilityRequirement],`,
    `    readonly [CaptureAuthorityRequirement],
    readonly [],`],

  ['capture loses its bounded sequence', CP,
    `  readonly captureSequence: <`,
    `  readonly unusedCaptureSequence: <`],

  ['the capture profile claim broadens off its own profile', CP,
    `  readonly reproducibility: ReproducibilityClaim<CaptureProfileReference<Id>>;`,
    `  readonly reproducibility: ReproducibilityClaim<CaptureProfileReference>;`],

  // --- server render -------------------------------------------------------
  ['the render job materializes every frame as a tuple', SM,
    `  readonly frames: MediaSource<ServerPhysicalFrame<Representation, Frame, Render>, Source>;`,
    `  readonly frames: NonEmptyTuple<ServerPhysicalFrame<Representation, Frame, Render>>;`],

  ['the render job goes back to a schema instead of frames', SM,
    `  readonly frames: MediaSource<ServerPhysicalFrame<Representation, Frame, Render>, Source>;
  readonly cancel: Signature<MediaJobReference<Id>, MediaJobReference<Id>, NonEmptyTuple<Diagnostic>>;`,
    `  readonly cancel: Signature<MediaJobReference<Id>, MediaJobReference<Id>, NonEmptyTuple<Diagnostic>>;`],

  ['the render job stops naming the cut it rendered', SM,
    `  readonly source: ContentAddress<'application/vnd.liteship.program+cbor'>;
  readonly cut: MediaCut;
  readonly contract: SchemaReference<Contract, Frame>;
  readonly render: ServerRenderProfile<Render>;
  readonly tool: ToolProfile<Tool, Profile>;
  readonly destination: AdmittedPath<Out>;
  readonly frames:`,
    `  readonly source: ContentAddress<'application/vnd.liteship.program+cbor'>;
  readonly contract: SchemaReference<Contract, Frame>;
  readonly render: ServerRenderProfile<Render>;
  readonly tool: ToolProfile<Tool, Profile>;
  readonly destination: AdmittedPath<Out>;
  readonly frames:`],

  ['the render job reacquires a sample position beside its cut', SM,
    `  readonly cut: MediaCut;
  readonly contract: SchemaReference<Contract, Frame>;
  readonly render: ServerRenderProfile<Render>;
  readonly tool: ToolProfile<Tool, Profile>;
  readonly destination: AdmittedPath<Out>;
  readonly frames:`,
    `  readonly cut: MediaCut;
  readonly position: ServerSamplePosition;
  readonly contract: SchemaReference<Contract, Frame>;
  readonly render: ServerRenderProfile<Render>;
  readonly tool: ToolProfile<Tool, Profile>;
  readonly destination: AdmittedPath<Out>;
  readonly frames:`],

  ['the render stage borrows the encode profile again', SM,
    `> = RasterizedFrame<Representation, Frame, RenderProfileReference<Profile>>;`,
    `> = RasterizedFrame<Representation, Frame, EncodeProfileReference>;`],

  ['the render profile loses its own reproducibility claim', SM,
    `  readonly configuration: ContentAddress<'application/vnd.liteship.server-render-profile+cbor'>;
  readonly reproducibility: ReproducibilityClaim<RenderProfileReference<Id>>;`,
    `  readonly configuration: ContentAddress<'application/vnd.liteship.server-render-profile+cbor'>;`],

  ['the render job goes back to a bare tool reference', SM,
    `  readonly render: ServerRenderProfile<Render>;
  readonly tool: ToolProfile<Tool, Profile>;
  readonly destination: AdmittedPath<Out>;
  readonly frames:`,
    `  readonly render: ServerRenderProfile<Render>;
  readonly tool: import('../07_tool/types.js').ToolReference<Tool>;
  readonly destination: AdmittedPath<Out>;
  readonly frames:`],

  ['the server media offer stops providing the core codec sockets', SM,
    `      ServerMediaRequirement,
      MediaDecoderRequirement,
      MediaEncoderRequirement,
      MediaMuxRequirement,
    ],`,
    `      ServerMediaRequirement,
    ],`],

  ['the server reacquires a decode contract of its own', SM,
    `export interface ServerMediaAuthority {
  readonly renderFrames: <`,
    `export interface ServerMediaAuthority {
  readonly decode: (request: unknown) => unknown;
  readonly renderFrames: <`],

  // --- tool profile threading ----------------------------------------------
  ['the invocation request erases its profile identity', TL,
    `export interface ToolInvocationRequest<Tool extends ToolId, Profile extends ToolProfileId = ToolProfileId> {
  readonly profile: ToolProfile<Tool, Profile>;`,
    `export interface ToolInvocationRequest<Tool extends ToolId, Profile extends ToolProfileId = ToolProfileId> {
  readonly profile: ToolProfile<Tool>;`],

  ['the execution erases its profile identity', TL,
    `export interface ToolExecution<Tool extends ToolId, Profile extends ToolProfileId = ToolProfileId> {
  readonly profile: ToolProfile<Tool, Profile>;`,
    `export interface ToolExecution<Tool extends ToolId, Profile extends ToolProfileId = ToolProfileId> {
  readonly profile: ToolProfile<Tool>;`],

  ['the provider path stops threading the profile identity', TL,
    `  readonly invoke: <Tool extends ToolId, Profile extends ToolProfileId>(
    request: ToolInvocationRequest<Tool, Profile>,
  ) => Result<ToolExecution<Tool, Profile>, NonEmptyTuple<Diagnostic>>;`,
    `  readonly invoke: <Tool extends ToolId, Profile extends ToolProfileId>(
    request: ToolInvocationRequest<Tool, Profile>,
  ) => Result<ToolExecution<Tool>, NonEmptyTuple<Diagnostic>>;`],

  ['the tool profile stops naming its executable bytes', TL,
    `  readonly version: ToolVersion;
  readonly executable: ContentAddress;`,
    `  readonly version: ToolVersion;`],
];

process.exit(runBank('media-io-hosts', M).clean ? 0 : 1);
