/**
 * Lifetime — the disposal primitive that replaces `Scope`/`ManagedRuntime` at
 * the shed seams.
 *
 * A Lifetime owns an ordered stack of finalizers and disposes them exactly once
 * in LIFO order. It supports BOTH a synchronous close and an asynchronous
 * teardown in one pass: a sync finalizer's side effects land synchronously
 * inside the `dispose()` call, and the promise `dispose()` returns settles once
 * every async finalizer settles. This is the shape the two anchor sites drew:
 *
 *  - astro `stream.ts` (sync-close-before-async-dispose): the per-connection
 *    SSE scope's finalizers (EventSource close, source null, queue shutdown) are
 *    all synchronous and MUST run before the replacement connection opens, so a
 *    straggler frame from the old generation cannot morph the new one; the owned
 *    runtime is disposed asynchronously afterwards.
 *  - scene `runtime.ts` (idempotent release): `release()` closes the world's
 *    scope exactly once — a second call is a no-op.
 *
 * Laws (pinned in tests/unit/core/lifetime.test.ts):
 *  - LIFO: finalizers run in reverse registration order.
 *  - sync-close-before-async-dispose: sync finalizers execute synchronously in
 *    the `dispose()` call.
 *  - exactly-once / idempotent: finalizers run once; repeat `dispose()` returns
 *    the same promise and runs nothing.
 *  - late registration after dispose runs the finalizer immediately.
 *  - aggregate failure: every finalizer runs even if one throws; the failures
 *    fold into one {@link LifetimeDisposeError}, ordered by LIFO invocation.
 *  - AbortSignal projection: {@link LifetimeShape.signal} aborts synchronously
 *    at dispose start, before any finalizer runs.
 *
 * @module
 */

import { taggedError, type TaggedError } from '@liteship/error';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A teardown function. The sync arm (`void`) runs synchronously inside
 * `dispose()`; the async arm (`Promise<void>`) is awaited by the promise
 * `dispose()` returns.
 */
export type Finalizer = () => void | Promise<void>;

/** Live Lifetime handle — the owner of an ordered finalizer stack. */
export interface LifetimeShape {
  readonly _tag: 'Lifetime';
  /** True once `dispose()` has been initiated (flips synchronously). */
  readonly disposed: boolean;
  /** An `AbortSignal` that aborts synchronously when `dispose()` begins. */
  readonly signal: AbortSignal;
  /**
   * Register `finalizer` to run on dispose (LIFO). Returns a handle that
   * unregisters it if called before dispose. If the Lifetime is already
   * disposed, `finalizer` runs immediately and the handle is a no-op.
   */
  readonly add: (finalizer: Finalizer) => () => void;
  /**
   * Run every finalizer exactly once in LIFO order and abort {@link signal}.
   * Sync finalizers execute synchronously in this call; the returned promise
   * settles once every async finalizer settles. Idempotent — subsequent calls
   * return the same promise. Rejects with a {@link LifetimeDisposeError} if any
   * finalizer threw or rejected; resolves otherwise.
   */
  readonly dispose: () => Promise<void>;
}

/**
 * The aggregate raised when one or more finalizers fail during `dispose()`.
 * `causes` holds every failure in LIFO invocation order; the first is chained
 * through the platform `Error.cause`.
 */
export interface LifetimeDisposeError extends TaggedError<'LifetimeDisposeError'> {
  /** The finalizer failures, in LIFO invocation order. */
  readonly causes: readonly unknown[];
}

/** Build a {@link LifetimeDisposeError} over the collected finalizer failures. */
export const LifetimeDisposeError = (causes: readonly unknown[]): LifetimeDisposeError =>
  taggedError(
    'LifetimeDisposeError',
    `Lifetime.dispose: ${causes.length} finalizer${causes.length === 1 ? '' : 's'} failed`,
    { causes },
    causes.length > 0 ? { cause: causes[0] } : undefined,
  );

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

interface Entry {
  readonly fn: Finalizer;
}

const isPromiseLike = (value: unknown): value is PromiseLike<unknown> =>
  typeof value === 'object' && value !== null && typeof (value as { then?: unknown }).then === 'function';

function make(): LifetimeShape {
  const stack: Entry[] = [];
  const controller = new AbortController();
  let disposedFlag = false;
  // TRUE only while the disposal pass has not yet quiesced. Distinguishes a registration made
  // FROM WITHIN a running finalizer (the pass is still active — fold it into THIS pass) from a
  // registration made after dispose() already settled (nothing to fold into — run + drop).
  let disposing = false;
  // Assigned synchronously at the start of the first dispose(), so a re-entrant
  // dispose() (from within a finalizer) returns THIS promise instead of
  // starting a second pass — the exactly-once guard.
  let disposePromise: Promise<void> | undefined;
  // The active disposal pass's shared state (only mutated while `disposing`): per-slot failures
  // keyed by invocation order (LIFO for the initial pass, ascending thereafter) + the async
  // finalizers still to settle. Drained to quiescence so a finalizer registered mid-pass — even
  // from within an async finalizer's own resolution — is awaited + its failure folded.
  const errors = new Map<number, unknown>();
  const pending: Promise<void>[] = [];
  let nextOrder = 0;

  /** Run one finalizer NOW, folding its outcome into the active pass's shared errors/pending. */
  const runFinalizer = (finalizer: Finalizer): void => {
    const slot = nextOrder++;
    try {
      const result = finalizer();
      if (isPromiseLike(result)) {
        pending.push(
          Promise.resolve(result).then(
            () => undefined,
            (error: unknown) => {
              errors.set(slot, error);
            },
          ),
        );
      }
    } catch (error) {
      errors.set(slot, error);
    }
  };

  const add: LifetimeShape['add'] = (finalizer) => {
    if (disposedFlag) {
      if (disposing) {
        // Registered FROM WITHIN the in-progress disposal (a running finalizer added another):
        // run it now and fold it into the ACTIVE pass, so dispose() awaits its async arm and
        // surfaces its rejection in the aggregate — never silently dropped.
        runFinalizer(finalizer);
      } else {
        // The disposal already SETTLED: nothing to fold into. The sync arm executes synchronously;
        // a late async rejection has no aggregate, so it is caught and dropped rather than
        // surfacing as an unhandled rejection.
        const result = finalizer();
        if (isPromiseLike(result)) void Promise.resolve(result).catch(() => undefined);
      }
      return () => undefined;
    }
    const entry: Entry = { fn: finalizer };
    stack.push(entry);
    return () => {
      const index = stack.indexOf(entry);
      if (index >= 0) stack.splice(index, 1);
    };
  };

  const dispose: LifetimeShape['dispose'] = () => {
    if (disposePromise !== undefined) return disposePromise;
    // Claim disposal synchronously — the executor runs now, so a re-entrant
    // dispose() (from within a finalizer below) returns THIS promise instead of
    // starting a second pass.
    let settle!: () => void;
    let fail!: (error: unknown) => void;
    disposePromise = new Promise<void>((resolve, reject) => {
      settle = resolve;
      fail = reject;
    });

    disposedFlag = true;
    disposing = true;
    controller.abort();

    // One synchronous invocation pass over the LIFO stack — sync finalizers complete here (their
    // side effects land before dispose() returns); async ones are collected into `pending`. Splice
    // + reverse so a finalizer that re-enters add() mutates a fresh pass, not what we iterate.
    for (const entry of stack.splice(0).reverse()) runFinalizer(entry.fn);

    // Drain to QUIESCENCE: a finalizer — or an async finalizer's own resolution — may register
    // MORE teardown via add() while `disposing` is true, so keep awaiting until no pending work
    // remains. `disposing` flips false + the aggregate folds in the SAME synchronous continuation
    // as the empty-check, so no late registration can slip past unawaited. The pending promises
    // never reject (each records into `errors`), so settle/fail cannot throw.
    const drain = async (): Promise<void> => {
      while (pending.length > 0) await Promise.all(pending.splice(0));
      disposing = false;
      if (errors.size === 0) {
        settle();
        return;
      }
      const causes = [...errors.keys()].sort((a, b) => a - b).map((key) => errors.get(key));
      fail(LifetimeDisposeError(causes));
    };
    void drain();
    return disposePromise;
  };

  return {
    _tag: 'Lifetime',
    get disposed() {
      return disposedFlag;
    },
    signal: controller.signal,
    add,
    dispose,
  };
}

// ---------------------------------------------------------------------------
// Namespace export (ADR-0001)
// ---------------------------------------------------------------------------

/**
 * Lifetime — construct a disposal handle that owns a LIFO finalizer stack.
 * Register teardown with `add`, tear down once with `dispose`, and project
 * cancellation through `signal`.
 */
export const Lifetime = {
  /** Build a fresh, undisposed Lifetime. */
  make,
} as const;

/** Public structural type for `Lifetime`. */
export type Lifetime = LifetimeShape;

export declare namespace Lifetime {
  /** A registered teardown function — see {@link Finalizer}. */
  export type Finalizer = () => void | Promise<void>;
}
