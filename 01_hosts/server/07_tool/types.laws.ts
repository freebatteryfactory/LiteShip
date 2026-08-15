/**
 * Compile-time laws for `01_hosts/server/07_tool`.
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
import type { CanonicalValue, ContentAddress } from '../../../00_core/01_encoding/types.js';
import type { ReproducibilityClaim } from '../../../00_core/06_evidence/types.js';
import type { CancellationReceipt } from '../../../00_core/05_lifecycle/types.js';
import type { RealizationLifecycle } from '../../../00_core/14_compiler/types.js';
import type { Assert, CaseOf, Equal, NonEmptyTuple, Result, Signature, TagOf } from '../../../types.js';
import type { ToolAuthority, ToolExecution, ToolExecutionId, ToolExecutionReference, ToolId, ToolInvocationRequest, ToolOutcome, ToolProfile, ToolProfileId, ToolProfileReference, ToolReference, ToolSandbox } from './types.js';

// ---------------------------------------------------------------------------
// Laws
//
// That sandbox scopes are honored and determinism claims hold at runtime are
// `system/assurance`; spawn-versus-pool crossover is empirical.
// ---------------------------------------------------------------------------

/** Compile-time law: an invocation pins its exact tool — A is not B. */
export type AnInvocationCannotClaimAnotherTool = Assert<
  Equal<
    [
      ToolProfile<ToolId<'liteship.server.tool.law.tool-a'>>['tool'],
      ToolExecution<ToolId<'liteship.server.tool.law.tool-b'>> extends ToolExecution<
        ToolId<'liteship.server.tool.law.tool-a'>
      >
        ? true
        : false,
    ],
    [ToolReference<ToolId<'liteship.server.tool.law.tool-a'>>, false]
  >
>;


/** Compile-time law: invocation is tool-correlated through the provider's generic operation. */
export type InvocationIsToolCorrelated = Assert<
  Equal<
    [
      ToolAuthority['invoke'] extends (
        request: ToolInvocationRequest<
          ToolId<'liteship.server.tool.law.tool-a'>,
          ToolProfileId<'liteship.server.tool.law.profile-a'>
        >,
      ) => Result<
        ToolExecution<
          ToolId<'liteship.server.tool.law.tool-a'>,
          ToolProfileId<'liteship.server.tool.law.profile-a'>
        >,
        NonEmptyTuple<Diagnostic>
      >
        ? true
        : false,
      // The profile identity must survive the provider path too. Threading only
      // the tool leaves two distinct admitted profiles of the same binary — one
      // pinned, one from the PATH — freely interchangeable at every consumer.
      ToolExecution<
        ToolId<'liteship.server.tool.law.tool-a'>,
        ToolProfileId<'liteship.server.tool.law.profile-b'>
      > extends ToolExecution<
        ToolId<'liteship.server.tool.law.tool-a'>,
        ToolProfileId<'liteship.server.tool.law.profile-a'>
      >
        ? true
        : false,
      ToolInvocationRequest<
        ToolId<'liteship.server.tool.law.tool-a'>,
        ToolProfileId<'liteship.server.tool.law.profile-b'>
      > extends ToolInvocationRequest<
        ToolId<'liteship.server.tool.law.tool-a'>,
        ToolProfileId<'liteship.server.tool.law.profile-a'>
      >
        ? true
        : false,
    ],
    [true, false, false]
  >
>;


/**
 * Compile-time law: an invocation carries the actual input value beside its
 * contracts and a declared sandbox, and an execution yields an actual
 * result — a produced value with its receipt, or a failure — for exactly its
 * own tool.
 */
export type AnInvocationCarriesContractsAndSandbox = Assert<
  Equal<
    [
      ToolInvocationRequest<ToolId>['value'],
      ToolInvocationRequest<ToolId>['sandbox'],
      ToolExecution<ToolId<'liteship.server.tool.law.tool-a'>>['result'],
      ToolExecution<
        ToolId<'liteship.server.tool.law.tool-a'>,
        ToolProfileId,
        ToolExecutionId<'liteship.server.tool.law.execution-a'>
      >['cancel'],
      CaseOf<ToolOutcome, 'produced'>['value'],
      TagOf<ReproducibilityClaim<ToolProfileReference>>,
    ],
    [
      CanonicalValue,
      ToolSandbox,
      Signature<
        ToolExecutionReference,
        ToolOutcome,
        NonEmptyTuple<Diagnostic>
      >,
      Signature<
        ToolExecutionReference<ToolExecutionId<'liteship.server.tool.law.execution-a'>>,
        CancellationReceipt<ToolExecutionReference<ToolExecutionId<'liteship.server.tool.law.execution-a'>>>,
        NonEmptyTuple<Diagnostic>
      >,
      CanonicalValue,
      'unclaimed' | 'reproducible-under-profile' | 'observed-variable',
    ]
  >
>;


/**
 * Compile-time law: a tool profile names its bytes, its configuration, and its
 * environment, and its reproducibility claim is exact over its own reference.
 *
 * Every member here is the answer to "reproducible under *what*". A profile
 * that keeps the claim and loses the executable address still compiles and
 * still says `reproducible-under-profile`, which is why they are checked one at
 * a time rather than as a whole shape.
 */
export type AToolProfileIsExactAboutWhatItRan = Assert<
  Equal<
    [
      ToolProfile<ToolId<'liteship.server.tool.law.tool-a'>>['executable'] extends ContentAddress
        ? true
        : false,
      ToolProfile<ToolId<'liteship.server.tool.law.tool-a'>>['options'] extends ContentAddress<
        'application/vnd.liteship.server-tool-options+cbor'
      >
        ? true
        : false,
      ToolProfile<ToolId<'liteship.server.tool.law.tool-a'>>['environment'] extends ContentAddress<
        'application/vnd.liteship.server-tool-environment+cbor'
      >
        ? true
        : false,
      ToolProfile<
        ToolId<'liteship.server.tool.law.tool-a'>,
        ToolProfileId<'liteship.server.tool.law.profile-a'>
      >['reproducibility'] extends ReproducibilityClaim<
        ToolProfileReference<ToolProfileId<'liteship.server.tool.law.profile-a'>>
      >
        ? true
        : false,
    ],
    [true, true, true, true]
  >
>;


/** Compile-time law: an execution is receipted and owned. */
export type AnExecutionIsReceiptedAndOwned = Assert<
  Equal<
    [ToolExecution<ToolId>['receipt'], ToolExecution<ToolId>['lifecycle']],
    [
      ContentAddress<'application/vnd.liteship.server-tool-receipt+cbor'>,
      CaseOf<RealizationLifecycle, 'owned'>,
    ]
  >
>;
