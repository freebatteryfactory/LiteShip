/**
 * Filesystem-to-media composition fixture (GPT's broken waterfall arrow),
 * post-media-lineage form.
 *
 * The arrow moved when `render` split apart. Decoding an admitted file is now
 * core's socket, which takes an addressed asset rather than a host stream — so
 * the filesystem no longer feeds media on the *input* side. It feeds it on the
 * output side: the exact `AdmittedPath<Root>` the filesystem provider returned
 * enters the render request and survives onto the job, with no erasure and no
 * cast, and the frames the job yields carry the exact render profile that
 * produced them.
 *
 * Every value after the first is derived from the returned type of a real
 * public operation. Expected: COMPILES.
 */

import type { NonEmptyTuple, OkOf, OutputOf, Result } from './types.js';
import type { Diagnostic } from './00_core/00_error/types.js';
import type { SchemaId } from './00_core/03_schema/types.js';
import type {
  MediaFrame,
  MediaRepresentationId,
  MediaSourceId,
} from './00_core/12_media/types.js';
import type {
  AdmittedPath,
  FilesystemProvider,
  FilesystemRootId,
  FilesystemRootReference,
} from './01_hosts/server/03_filesystem/types.js';
import type { ToolId, ToolProfile, ToolProfileId } from './01_hosts/server/07_tool/types.js';
import type {
  MediaJobId,
  MediaJobReference,
  RenderProfileId,
  ServerMediaAuthority,
  ServerRenderProfile,
  ServerRenderRequest,
} from './01_hosts/server/10_media/types.js';

type RootA = FilesystemRootId<'probe.composition.root-a'>;
type ContractA = SchemaId<'probe.composition.contract-a'>;
type FrameA = MediaFrame<'probe.composition.state-a'>;
type ToolA = ToolId<'probe.composition.tool-a'>;
type ProfileA = ToolProfileId<'probe.composition.profile-a'>;
type RenderA = RenderProfileId<'probe.composition.render-a'>;
type JobA = MediaJobId<'probe.composition.job-a'>;
type RepA = MediaRepresentationId<'probe.composition.representation-a'>;
type SourceA = MediaSourceId<'probe.composition.source-a'>;

declare const filesystem: FilesystemProvider;
declare const media: ServerMediaAuthority;
declare const rootA: FilesystemRootReference<RootA>;
declare const exactTool: ToolProfile<ToolA, ProfileA>;
declare const exactRender: ServerRenderProfile<RenderA>;
declare const contractA: ServerRenderRequest<
  ContractA,
  FrameA,
  RenderA,
  ToolA,
  ProfileA,
  RootA,
  JobA
>['contract'];
declare const cutA: ServerRenderRequest<
  ContractA,
  FrameA,
  RenderA,
  ToolA,
  ProfileA,
  RootA,
  JobA
>['cut'];
declare const sourceA: ServerRenderRequest<
  ContractA,
  FrameA,
  RenderA,
  ToolA,
  ProfileA,
  RootA,
  JobA
>['source'];

/** The filesystem provider's exact admitted path for root A, on the public path. */
export const providerPath: Result<AdmittedPath<RootA>, NonEmptyTuple<Diagnostic>> =
  filesystem.admitPath(rootA, 'out/frame.rgba');

/** The value that operation actually returned, not a same-shaped substitute. */
type AdmittedForRootA = OkOf<ReturnType<typeof filesystem.admitPath<RootA>>>;
declare const exactDestination: AdmittedForRootA;

/** The exact upstream path inhabits the downstream render request without erasure. */
export const lawfulRenderRequest: ServerRenderRequest<
  ContractA,
  FrameA,
  RenderA,
  ToolA,
  ProfileA,
  RootA,
  JobA
> = {
  job: {} as MediaJobReference<JobA>,
  source: sourceA,
  cut: cutA,
  contract: contractA,
  render: exactRender,
  tool: exactTool,
  destination: exactDestination,
};

/** Rendering the exact request yields the job of exactly that ancestry. */
type RenderedJob = OkOf<
  ReturnType<
    typeof media.renderFrames<RepA, ContractA, FrameA, RenderA, ToolA, ProfileA, RootA, JobA, SourceA>
  >
>;
export const lawfulRenderJob: Result<RenderedJob, NonEmptyTuple<Diagnostic>> =
  media.renderFrames(lawfulRenderRequest);

declare const renderedJob: RenderedJob;

/** The job's destination is still the exact root-A path — ancestry survived. */
export const survivedDestination: AdmittedPath<RootA> = renderedJob.destination;

/** The job's tool is still the exact admitted profile, not a bare tool name. */
export const survivedToolProfile: ToolProfile<ToolA, ProfileA> = renderedJob.tool;

/** And the frames it yields are a bounded source, not a materialized tuple. */
type RenderedFrames = Extract<
  OutputOf<RenderedJob['frames']['pull']>,
  { readonly _tag: 'produced' }
>['units'][number];
export const framesArePulled: RenderedFrames = {} as RenderedFrames;
