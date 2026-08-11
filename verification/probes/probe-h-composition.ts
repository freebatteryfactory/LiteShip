/**
 * Filesystem-to-media composition fixture (GPT's broken waterfall arrow),
 * post-fold form. The exact FileStream<RootA> the filesystem provider
 * returns feeds the media request that consumes it, with no erasure and no
 * cast, and the whole provider chain — filesystem stream → media request →
 * render → job → output stream — carries the ancestry. Expected: COMPILES.
 */

import type { NonEmptyTuple, OkOf, OutputOf, Result } from './types.js';
import type { Diagnostic } from './00_core/00_error/types.js';
import type { SchemaId } from './00_core/03_schema/types.js';
import type {
  AdmittedPath,
  FileOpenRequest,
  FilesystemProvider,
  FilesystemRootId,
  FileStream,
} from './01_hosts/server/03_filesystem/types.js';
import type { ToolId } from './01_hosts/server/07_tool/types.js';
import type {
  MediaJobId,
  MediaJobReference,
  MediaJobRequest,
  MediaOutputStream,
  ServerMediaAuthority,
  ServerMediaJob,
} from './01_hosts/server/10_media/types.js';

type RootA = FilesystemRootId<'probe.composition.root-a'>;
type ContractA = SchemaId<'probe.composition.contract-a'>;
type ToolA = ToolId<'probe.composition.tool-a'>;
type JobA = MediaJobId<'probe.composition.job-a'>;

declare const filesystem: FilesystemProvider;
declare const media: ServerMediaAuthority;
declare const openRequestA: FileOpenRequest<RootA>;
declare const exactStream: FileStream<RootA>;
declare const exactDestination: AdmittedPath<RootA>;

/** The filesystem provider's exact stream for root A, obtained on the public path. */
export const providerStream: Result<FileStream<RootA>, NonEmptyTuple<Diagnostic>> =
  filesystem.stream(openRequestA);

/** The exact upstream stream inhabits the downstream media request without erasure. */
export const lawfulRequest: MediaJobRequest<ContractA, ToolA, RootA, RootA, JobA> = {
  job: {} as MediaJobReference<JobA>,
  source: {} as MediaJobRequest<ContractA, ToolA, RootA, RootA, JobA>['source'],
  position: {} as MediaJobRequest<ContractA, ToolA, RootA, RootA, JobA>['position'],
  contract: {} as MediaJobRequest<ContractA, ToolA, RootA, RootA, JobA>['contract'],
  tool: {} as MediaJobRequest<ContractA, ToolA, RootA, RootA, JobA>['tool'],
  input: exactStream,
  destination: exactDestination,
};

/** Rendering the exact request yields the job of exactly that ancestry. */
export const lawfulJob: Result<
  ServerMediaJob<ContractA, ToolA, RootA, RootA, JobA>,
  NonEmptyTuple<Diagnostic>
> = media.render(lawfulRequest);

/** The rendered job's input is still the exact root-A stream — ancestry survived. */
export const survivedInput: FileStream<RootA> = (
  {} as OkOf<ReturnType<typeof media.render<ContractA, ToolA, RootA, RootA, JobA>>>
).input;

/** The job's stream remembers its exact job. */
declare const jobA: ServerMediaJob<ContractA, ToolA, RootA, RootA, JobA>;
export const streamKeepsJob: OutputOf<(typeof jobA)['open']> = {} as MediaOutputStream<JobA>;
