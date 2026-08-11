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
  Assert,
  BindingsFor,
  Brand,
  CaseOf,
  Equal,
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

/** An admitted path under one exact root. The parameter has no erasing default. */
export type AdmittedPath<Root extends FilesystemRootId> = Brand<
  string,
  'liteship.server.admitted-path'
> & { readonly root: FilesystemRootReference<Root> };

/**
 * One open file handle: bound to the exact root and admitted path that
 * opened it, owned, with real read, atomic-write, and close operations.
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
  readonly close: Signature<AdmittedPath<Root>, FilesystemRootReference<Root>, NonEmptyTuple<Diagnostic>>;
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

/** One watch: root-bound change observation, bounded, owned, closable. */
export interface WatchResource<Root extends FilesystemRootId> {
  readonly root: FilesystemRootReference<Root>;
  readonly path: AdmittedPath<Root>;
  readonly buffer: FileBufferBound;
  readonly receive: Signature<FileBufferBound, readonly AdmittedPath<Root>[], NonEmptyTuple<Diagnostic>>;
  readonly close: Signature<AdmittedPath<Root>, FilesystemRootReference<Root>, NonEmptyTuple<Diagnostic>>;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

/** One lock: root-bound exclusivity as an owned resource released exactly once. */
export interface LockResource<Root extends FilesystemRootId> {
  readonly root: FilesystemRootReference<Root>;
  readonly path: AdmittedPath<Root>;
  readonly release: Signature<AdmittedPath<Root>, FilesystemRootReference<Root>, NonEmptyTuple<Diagnostic>>;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

/** One file stream: root-bound chunked read/write with backpressure. */
export interface FileStream<Root extends FilesystemRootId> {
  readonly root: FilesystemRootReference<Root>;
  readonly path: AdmittedPath<Root>;
  readonly buffer: FileBufferBound;
  readonly read: Signature<FileBufferBound, readonly FileChunk[], NonEmptyTuple<Diagnostic>>;
  readonly write: Signature<FileChunk, FileBufferBound, NonEmptyTuple<Diagnostic>>;
  readonly close: Signature<AdmittedPath<Root>, FilesystemRootReference<Root>, NonEmptyTuple<Diagnostic>>;
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
  readonly stream: <Root extends FilesystemRootId>(
    request: FileOpenRequest<Root>,
  ) => Result<FileStream<Root>, NonEmptyTuple<Diagnostic>>;
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
    unknown,
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

// ---------------------------------------------------------------------------
// Laws
//
// Traversal, symlink, and race resistance are runtime `system/assurance`
// obligations; buffer and chunk sizes and watch strategy are empirical.
// ---------------------------------------------------------------------------

/** Compile-time law: a path admitted under root A is not a path under root B. */
export type APathCannotClaimAnotherRoot = Assert<
  Equal<
    [
      AdmittedPath<FilesystemRootId<'liteship.server.fs.law.root-a'>>['root'],
      AdmittedPath<FilesystemRootId<'liteship.server.fs.law.root-b'>> extends AdmittedPath<
        FilesystemRootId<'liteship.server.fs.law.root-a'>
      >
        ? true
        : false,
    ],
    [FilesystemRootReference<FilesystemRootId<'liteship.server.fs.law.root-a'>>, false]
  >
>;

/** Compile-time law: opening is root-correlated through the provider's generic operation. */
export type OpeningIsRootCorrelated = Assert<
  Equal<
    FilesystemProvider['open'] extends (
      request: FileOpenRequest<FilesystemRootId<'liteship.server.fs.law.root-a'>>,
    ) => Result<FileHandle<FilesystemRootId<'liteship.server.fs.law.root-a'>>, NonEmptyTuple<Diagnostic>>
      ? true
      : false,
    true
  >
>;

/**
 * Compile-time law: every resource family exists, is root-correlated through
 * the provider's generic operations, and streams under a declared bound —
 * a stream opened under root A is provably not a stream of root B, and port
 * realization returns exact bindings for the exact unique row.
 */
export type TheResourceFamiliesAreRealAndRootCorrelated = Assert<
  Equal<
    [
      FilesystemProvider['stream'] extends (
        request: FileOpenRequest<FilesystemRootId<'liteship.server.fs.law.root-a'>>,
      ) => Result<FileStream<FilesystemRootId<'liteship.server.fs.law.root-a'>>, NonEmptyTuple<Diagnostic>>
        ? true
        : false,
      FileStream<FilesystemRootId<'liteship.server.fs.law.root-b'>> extends FileStream<
        FilesystemRootId<'liteship.server.fs.law.root-a'>
      >
        ? true
        : false,
      WatchResource<FilesystemRootId>['buffer'],
      LockResource<FilesystemRootId>['lifecycle'],
      FilesystemProvider['construct'],
    ],
    [
      true,
      false,
      FileBufferBound,
      CaseOf<RealizationLifecycle, 'owned'>,
      <Row extends FilesystemStoreRow>(
        row: UniqueRequirements<Row>,
      ) => Result<BindingsFor<Row>, NonEmptyTuple<Diagnostic>>,
    ]
  >
>;

/** Compile-time law: a handle is bound to its root and path, and is owned. */
export type AHandleIsBoundAndOwned = Assert<
  Equal<
    [
      FileHandle<FilesystemRootId<'liteship.server.fs.law.root-a'>>['root'],
      FileHandle<FilesystemRootId>['lifecycle'],
    ],
    [
      FilesystemRootReference<FilesystemRootId<'liteship.server.fs.law.root-a'>>,
      CaseOf<RealizationLifecycle, 'owned'>,
    ]
  >
>;

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
