/**
 * Compile-time laws for `00_core/16_runtime`.
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

import type { Assert, Equal, OutputOf } from '../../types.js';
import type { TransactionGeneration } from '../04_time/types.js';
import type { DraftSemanticCut, SemanticCut } from '../08_state/types.js';
import type { BackendId, ExecutionRequest, RuntimeCommit, RuntimeExecutor, RuntimeTransaction, RuntimeTypeSurface } from './types.js';

/** Compile-time law: an executor produces the runtime commit, nothing looser. */
export type AnExecutorProducesTheRuntimeCommit = Assert<
  Equal<OutputOf<RuntimeExecutor['execute']>, RuntimeCommit>
>;


/**
 * Compile-time law: an execution names one departure coordinate and no sibling
 * revision or time.
 *
 * Their return is the whole failure this fold removed: two members that agree
 * with the cut until the first execution where they do not.
 */
export type AnExecutionRequestNamesOneCut = Assert<
  Equal<
    [
      ExecutionRequest['base'] extends SemanticCut ? true : false,
      'baseRevision' extends keyof ExecutionRequest ? true : false,
      'time' extends keyof ExecutionRequest ? true : false,
      'world' extends keyof ExecutionRequest ? true : false,
      'evidence' extends keyof ExecutionRequest ? true : false,
    ],
    [true, false, false, false, false]
  >
>;


/**
 * Compile-time law: the runtime commit is the residual-path witness that a
 * committed cut exists, and it cannot witness a draft.
 *
 * A preview must be able to evaluate and rasterize without committing. What it
 * must never be able to do is produce this object, because everything
 * downstream reads it as proof that application reality moved.
 */
export type ARuntimeCommitWitnessesACommittedCut = Assert<
  Equal<
    [
      RuntimeCommit['semantic']['cut'] extends SemanticCut ? true : false,
      RuntimeCommit['semantic']['cut'] extends DraftSemanticCut ? true : false,
      'time' extends keyof RuntimeTransaction ? true : false,
    ],
    [true, false, false]
  >
>;


/** Compile-time law: an execution request carries its transactional coordinates. */
export type AnExecutionRequestCarriesItsTransaction = Assert<
  Equal<
    [ExecutionRequest['base'], ExecutionRequest['generation'], ExecutionRequest['driver']],
    [SemanticCut, TransactionGeneration, BackendId]
  >
>;


/** Compile-time law: the owner surface exposes the executor relationship. */
export type TheSurfaceReachesTheExecutor = Assert<
  Equal<
    [RuntimeTypeSurface['executor'], RuntimeTypeSurface['executionRequest']],
    [RuntimeExecutor, ExecutionRequest]
  >
>;
