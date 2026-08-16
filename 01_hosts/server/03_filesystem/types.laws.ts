/**
 * Compile-time laws for `01_hosts/server/03_filesystem`.
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

import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type { ContentAddress } from '../../../00_core/01_encoding/types.js';
import type { RealizationLifecycle } from '../../../00_core/14_compiler/types.js';
import type { Assert, BindingsFor, CaseOf, Equal, NonEmptyTuple, OutputOf, Result, UniqueRequirements } from '../../../types.js';
import type { AdmittedPath, FileBufferBound, FileHandle, FileOpenRequest, FileStream, FileStreamFinalizationReceipt, FileStreamId, FileStreamOpenRequest, FilesystemProvider, FilesystemRootBinding, FilesystemRootId, FilesystemRootReference, FilesystemStoreRow, LockResource, WatchResource } from './types.js';

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

/** Compile-time law: deployment supplies the exact root and its addressed configuration. */
export type ARootBindingNamesThePhysicalRoot = Assert<
  Equal<
    [FilesystemRootBinding['root'], FilesystemRootBinding['configuration']],
    [
      FilesystemRootReference,
      ContentAddress<'application/vnd.liteship.server-filesystem-root+cbor'>,
    ]
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
        request: FileStreamOpenRequest<
          FilesystemRootId<'liteship.server.fs.law.root-a'>,
          FileStreamId<'liteship.server.fs.law.stream-a'>
        >,
      ) => Result<
        FileStream<
          FilesystemRootId<'liteship.server.fs.law.root-a'>,
          FileStreamId<'liteship.server.fs.law.stream-a'>
        >,
        NonEmptyTuple<Diagnostic>
      >
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


/** Compile-time law: stream close finalizes the exact stream and returns its terminal content. */
export type StreamClosePreservesItsTerminalOutput = Assert<
  Equal<
    OutputOf<
      FileStream<
        FilesystemRootId<'liteship.server.fs.law.root-a'>,
        FileStreamId<'liteship.server.fs.law.stream-a'>
      >['close']
    >,
    FileStreamFinalizationReceipt<
      FilesystemRootId<'liteship.server.fs.law.root-a'>,
      FileStreamId<'liteship.server.fs.law.stream-a'>
    >
  >
>;
