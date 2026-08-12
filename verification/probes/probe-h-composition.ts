/**
 * Filesystem-to-media composition fixture (GPT's broken waterfall arrow),
 * post-media-fold form. The exact FileStream<RootA> the filesystem provider
 * returns feeds the decode request that consumes it, with no erasure and no
 * cast, and the whole provider chain — filesystem stream → decode request →
 * decode → job → frames → encode request → encode → job → packet stream —
 * carries the ancestry.
 *
 * The chain is longer than it was because the single `render` that used to
 * span it has been split into the four relationships it was pretending to be.
 * Expected: COMPILES.
 */

import type { NonEmptyTuple, OkOf, OutputOf, Result } from './types.js';
import type { Diagnostic } from './00_core/00_error/types.js';
import type { DecodeProfileId, EncodeProfileId } from './00_core/12_media/types.js';
import type {
  FileOpenRequest,
  FilesystemProvider,
  FilesystemRootId,
  FileStream,
} from './01_hosts/server/03_filesystem/types.js';
import type { ToolId, ToolProfile } from './01_hosts/server/07_tool/types.js';
import type {
  MediaJobId,
  MediaJobReference,
  MediaPacketStream,
  ServerDecodeJob,
  ServerDecodeRequest,
  ServerEncodeJob,
  ServerEncodeRequest,
  ServerMediaAuthority,
  ServerPhysicalFrame,
} from './01_hosts/server/10_media/types.js';

type RootA = FilesystemRootId<'probe.composition.root-a'>;
type ToolA = ToolId<'probe.composition.tool-a'>;
type JobA = MediaJobId<'probe.composition.job-a'>;
type DecodeA = DecodeProfileId<'probe.composition.decode-a'>;
type EncodeA = EncodeProfileId<'probe.composition.encode-a'>;

declare const filesystem: FilesystemProvider;
declare const media: ServerMediaAuthority;
declare const openRequestA: FileOpenRequest<RootA>;
declare const exactStream: FileStream<RootA>;
declare const exactTool: ToolProfile<ToolA>;
declare const exactFrames: NonEmptyTuple<ServerPhysicalFrame>;

/** The filesystem provider's exact stream for root A, obtained on the public path. */
export const providerStream: Result<FileStream<RootA>, NonEmptyTuple<Diagnostic>> =
  filesystem.stream(openRequestA);

/** The exact upstream stream inhabits the downstream decode request without erasure. */
export const lawfulDecodeRequest: ServerDecodeRequest<DecodeA, ToolA, RootA, JobA> = {
  job: {} as MediaJobReference<JobA>,
  profile: {} as ServerDecodeRequest<DecodeA, ToolA, RootA, JobA>['profile'],
  tool: exactTool,
  input: exactStream,
};

/** Decoding the exact request yields the job of exactly that ancestry. */
export const lawfulDecodeJob: Result<
  ServerDecodeJob<DecodeA, ToolA, RootA, JobA>,
  NonEmptyTuple<Diagnostic>
> = media.decode(lawfulDecodeRequest);

/** The decode job's input is still the exact root-A stream — ancestry survived. */
export const survivedInput: FileStream<RootA> = (
  {} as OkOf<ReturnType<typeof media.decode<DecodeA, ToolA, RootA, JobA>>>
).input;

/** Real frames — not a schema describing them — enter the encode request. */
export const lawfulEncodeRequest: ServerEncodeRequest<EncodeA, ToolA, JobA> = {
  job: {} as MediaJobReference<JobA>,
  profile: {} as ServerEncodeRequest<EncodeA, ToolA, JobA>['profile'],
  tool: exactTool,
  tracks: {} as ServerEncodeRequest<EncodeA, ToolA, JobA>['tracks'],
  frames: exactFrames,
};

/** Encoding the exact request yields the job of exactly that ancestry. */
export const lawfulEncodeJob: Result<
  ServerEncodeJob<EncodeA, ToolA, JobA>,
  NonEmptyTuple<Diagnostic>
> = media.encode(lawfulEncodeRequest);

/** The encode job's packet stream remembers both its job and its profile. */
declare const encodeJobA: ServerEncodeJob<EncodeA, ToolA, JobA>;
export const streamKeepsJobAndProfile: OutputOf<(typeof encodeJobA)['open']> =
  {} as MediaPacketStream<JobA, EncodeA>;
