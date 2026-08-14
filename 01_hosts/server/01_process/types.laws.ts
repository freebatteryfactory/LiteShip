/**
 * Compile-time laws for `01_hosts/server/01_process`.
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
import type { Assert, CaseOf, Equal, NonEmptyTuple, Signature, TagOf } from '../../../types.js';
import type { ChildProcess, ChildProcessAuthority, ChildProcessRequest, ProcessExit, ProcessSignal, StdioRole } from './types.js';

// ---------------------------------------------------------------------------
// Laws
//
// Sandbox scope honoring and resource-limit enforcement are runtime
// `system/assurance` obligations; pool sizes and timeouts are empirical.
// ---------------------------------------------------------------------------

/** Compile-time law: the signal and stdio vocabularies are closed. */
export type TheProcessVocabulariesAreClosed = Assert<
  Equal<
    [ProcessSignal, StdioRole],
    ['interrupt' | 'terminate' | 'hangup', 'stdin' | 'stdout' | 'stderr']
  >
>;


/** Compile-time law: the exit arms are phase-correct with their evidence. */
export type ExitsArePhaseCorrect = Assert<
  Equal<
    [TagOf<ProcessExit>, CaseOf<ProcessExit, 'crashed'>['diagnostics']],
    ['exited' | 'signalled' | 'crashed', NonEmptyTuple<Diagnostic>]
  >
>;


/** Compile-time law: a child is owned, configuration-scoped, and cancellable. */
export type AChildIsOwnedAndScoped = Assert<
  Equal<
    [ChildProcess['lifecycle'], ChildProcess['configuration']],
    [
      CaseOf<RealizationLifecycle, 'owned'>,
      ContentAddress<'application/vnd.liteship.server-child-configuration+cbor'>,
    ]
  >
>;


/** Compile-time law: spawning consumes a complete scoped request. */
export type SpawningConsumesAScopedRequest = Assert<
  Equal<
    ChildProcessAuthority['spawn'],
    Signature<ChildProcessRequest, ChildProcess, NonEmptyTuple<Diagnostic>>
  >
>;
