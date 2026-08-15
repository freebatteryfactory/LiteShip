/**
 * Scoped filesystem: roots, admitted paths, owned handles.
 *
 * This home owns scoped filesystem-provider authority. A raw string path is
 * never authority: every path is admitted against the exact root it belongs
 * to — a path admitted under root A structurally cannot be opened under root
 * B — and every handle is a per-use owned resource. Canonicalization,
 * traversal defense, symlink policy, and race behavior are runtime assurance
 * obligations the admission contract exists to anchor.
 *
 * @module
 */

import type {
  BindingsFor,
  Brand,
  CaseOf,
  Hole,
  NonEmptyTuple,
  Reference,
  Result,
  Signature,
  UniqueRequirements,
} from '../../../types.js';
import type {
  BlobStoreRequirement,
  ChangeLogRequirement,
  RevisionStoreRequirement,
  SnapshotStoreRequirement,
} from '../../../00_core/08_state/types.js';
import type { ContentAddress } from '../../../00_core/01_encoding/types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type { GroundingId, RealizationLifecycle, RealizationOfferId } from '../../../00_core/14_compiler/types.js';
import type { ServerGroundingDefinition, ServerRealizationOffer } from '../00_bootstrap/types.js';

export type FilesystemRootId<Name extends string = string> = Brand<
  Name,
  'liteship.server.filesystem-root-id'
>;
export type FilesystemRootReference<Id extends FilesystemRootId = FilesystemRootId> = Reference<
  'server-filesystem-root',
  Id
>;
export type FileStreamId<Name extends string = string> = Brand<Name, 'liteship.server.file-stream-id'>;
export type FileStreamReference<Id extends FileStreamId = FileStreamId> = Reference<
  'server-file-stream',
  Id
>;

/** An admitted path under one exact root. The parameter has no erasing default. */
export type AdmittedPath<Root extends FilesystemRootId> = Brand<
  string,
  'liteship.server.admitted-path'
> & { readonly root: FilesystemRootReference<Root> };

/**
 * One open file handle: bound to the exact root and admitted path that
 * opened it, owned, with real read and atomic-write operations. Ownership ends
 * through the directly exposed lifecycle; no second close operation competes
 * with disposal.
 */
export interface FileHandle<Root extends FilesystemRootId> {
  readonly root: FilesystemRootReference<Root>;
  readonly path: AdmittedPath<Root>;
  readonly read: Signature<
    AdmittedPath<Root>,
    ContentAddress<'application/vnd.liteship.server-file-content+cbor'>,
    NonEmptyTuple<Diagnostic>
  >;
  readonly writeAtomically: Signature<
    ContentAddress<'application/vnd.liteship.server-file-content+cbor'>,
    AdmittedPath<Root>,
    NonEmptyTuple<Diagnostic>
  >;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

/** An encoded file chunk. */
export type FileChunk = Brand<Uint8Array, 'liteship.server.file-chunk'>;

/** Bounded streaming shape — backpressure, never a numeric constant. */
export interface FileBufferBound {
  readonly bounded: true;
}

/** One directory handle: root-bound listing as a per-use owned resource. */
export interface DirectoryHandle<Root extends FilesystemRootId> {
  readonly root: FilesystemRootReference<Root>;
  readonly path: AdmittedPath<Root>;
  readonly list: Signature<AdmittedPath<Root>, readonly AdmittedPath<Root>[], NonEmptyTuple<Diagnostic>>;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

/** One watch: root-bound change observation, bounded, owned, and directly disposable. */
export interface WatchResource<Root extends FilesystemRootId> {
  readonly root: FilesystemRootReference<Root>;
  readonly path: AdmittedPath<Root>;
  readonly buffer: FileBufferBound;
  readonly receive: Signature<FileBufferBound, readonly AdmittedPath<Root>[], NonEmptyTuple<Diagnostic>>;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

/** One lock: root-bound exclusivity as an owned resource released exactly once. */
export interface LockResource<Root extends FilesystemRootId> {
  readonly root: FilesystemRootReference<Root>;
  readonly path: AdmittedPath<Root>;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

/** Finalizing a writable stream flushes it and names the terminal file content. */
export interface FileStreamFinalizationReceipt<
  Root extends FilesystemRootId,
  Id extends FileStreamId = FileStreamId,
> {
  readonly stream: FileStreamReference<Id>;
  readonly root: FilesystemRootReference<Root>;
  readonly path: AdmittedPath<Root>;
  readonly content: ContentAddress<'application/vnd.liteship.server-file-content+cbor'>;
}

/** One file stream: root-bound chunked read/write with backpressure. */
export interface FileStream<Root extends FilesystemRootId, Id extends FileStreamId = FileStreamId> {
  readonly id: FileStreamReference<Id>;
  readonly root: FilesystemRootReference<Root>;
  readonly path: AdmittedPath<Root>;
  readonly buffer: FileBufferBound;
  readonly read: Signature<FileBufferBound, readonly FileChunk[], NonEmptyTuple<Diagnostic>>;
  readonly write: Signature<FileChunk, FileBufferBound, NonEmptyTuple<Diagnostic>>;
  readonly close: Signature<
    FileStreamReference<Id>,
    FileStreamFinalizationReceipt<Root, Id>,
    NonEmptyTuple<Diagnostic>
  >;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

/** The store ports a filesystem provider may realize — exactly the core four. */
export type FilesystemStorePortRequirement =
  | RevisionStoreRequirement
  | SnapshotStoreRequirement
  | ChangeLogRequirement
  | BlobStoreRequirement;

/** A non-empty exact subset of the store ports. */
export type FilesystemStoreRow = readonly [
  FilesystemStorePortRequirement,
  ...FilesystemStorePortRequirement[],
];

/** The complete open request: exact root and admitted path together. */
export interface FileOpenRequest<Root extends FilesystemRootId> {
  readonly root: FilesystemRootReference<Root>;
  readonly path: AdmittedPath<Root>;
}

/** A stream open carries the fresh per-use stream identity. */
export interface FileStreamOpenRequest<Root extends FilesystemRootId, Id extends FileStreamId>
  extends FileOpenRequest<Root> {
  readonly stream: FileStreamReference<Id>;
}

/**
 * The scoped filesystem provider: admission and opening are root-correlated.
 * Admitting a raw candidate yields a path under the exact root requested;
 * opening yields a handle bound to that same root.
 */
export interface FilesystemProvider {
  readonly admitPath: <Root extends FilesystemRootId>(
    root: FilesystemRootReference<Root>,
    candidate: string,
  ) => Result<AdmittedPath<Root>, NonEmptyTuple<Diagnostic>>;
  readonly open: <Root extends FilesystemRootId>(
    request: FileOpenRequest<Root>,
  ) => Result<FileHandle<Root>, NonEmptyTuple<Diagnostic>>;
  readonly directory: <Root extends FilesystemRootId>(
    request: FileOpenRequest<Root>,
  ) => Result<DirectoryHandle<Root>, NonEmptyTuple<Diagnostic>>;
  readonly watch: <Root extends FilesystemRootId>(
    request: FileOpenRequest<Root>,
  ) => Result<WatchResource<Root>, NonEmptyTuple<Diagnostic>>;
  readonly lock: <Root extends FilesystemRootId>(
    request: FileOpenRequest<Root>,
  ) => Result<LockResource<Root>, NonEmptyTuple<Diagnostic>>;
  readonly stream: <Root extends FilesystemRootId, Id extends FileStreamId>(
    request: FileStreamOpenRequest<Root, Id>,
  ) => Result<FileStream<Root, Id>, NonEmptyTuple<Diagnostic>>;
  readonly construct: <Row extends FilesystemStoreRow>(
    row: UniqueRequirements<Row>,
  ) => Result<BindingsFor<Row>, NonEmptyTuple<Diagnostic>>;
}

/** The admitted scoped root beneath the provider. */
export interface FilesystemRootBinding {
  readonly admitted: true;
}

export type FilesystemRootRequirement = Hole<
  'liteship.server.filesystem-root',
  FilesystemRootBinding
>;
export type FilesystemRequirement = Hole<'liteship.server.filesystem', FilesystemProvider>;

/** Deployment grounding: scoped roots enter admitted from deployment. */
export interface FilesystemRootGrounding
  extends ServerGroundingDefinition<
    readonly [FilesystemRootRequirement],
    FilesystemRootBinding,
    'deployment',
    'unowned'
  > {
  readonly id: GroundingId<'liteship.server.grounding.filesystem-root'>;
}

/** Constructing the scoped filesystem provider. */
export interface FilesystemProviderOffer
  extends ServerRealizationOffer<
    readonly [FilesystemRequirement],
    readonly [FilesystemRootRequirement],
    unknown,
    unknown,
    'owned'
  > {
  readonly id: RealizationOfferId<'liteship.server.offer.filesystem-provider'>;
  readonly locations: NonEmptyTuple<'local'>;
  readonly backends: NonEmptyTuple<'javascript' | 'host-native'>;
}

/** Type summary consumed by the server topology. */
export interface ServerFilesystemTypeSurface {
  readonly path: AdmittedPath<FilesystemRootId>;
  readonly handle: FileHandle<FilesystemRootId>;
  readonly stream: FileStream<FilesystemRootId>;
  readonly watchResource: WatchResource<FilesystemRootId>;
  readonly provider: FilesystemProvider;
  readonly rootGrounding: FilesystemRootGrounding;
  readonly filesystemOffer: FilesystemProviderOffer;
}
