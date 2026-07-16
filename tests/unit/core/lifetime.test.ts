/**
 * Lifetime — the disposal primitive replacing Scope/ManagedRuntime at seams.
 *
 * Law table (derived from astro stream.ts sync-close-before-async-dispose and
 * scene runtime idempotent release):
 *   - LIFO: finalizers run in reverse registration order.
 *   - sync-close-before-async-dispose: sync finalizers execute synchronously in
 *     the dispose() call; the returned promise settles once async ones settle.
 *   - exactly-once / idempotent: finalizers run once; repeat dispose() is a
 *     no-op returning the same promise.
 *   - late registration after dispose runs immediately.
 *   - aggregate failure: all finalizers run even if one throws; the failures
 *     fold into one @czap/error LifetimeDisposeError.
 *   - AbortSignal projection: signal aborts synchronously at dispose start.
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { hasTag } from '@czap/error';
import { Lifetime, LifetimeDisposeError } from '../../../packages/core/src/lifetime.js';

/** Deterministic external-settle handle — no timers in test logic. */
interface Deferred<T> {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
  readonly reject: (reason: unknown) => void;
}
const deferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

describe('Lifetime.make', () => {
  test('has _tag Lifetime', () => {
    expect(Lifetime.make()._tag).toBe('Lifetime');
  });

  test('is not disposed before dispose()', () => {
    expect(Lifetime.make().disposed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// LIFO order
// ---------------------------------------------------------------------------

describe('Lifetime — LIFO order', () => {
  test('finalizers run in reverse registration order', async () => {
    const order: number[] = [];
    const lt = Lifetime.make();
    lt.add(() => {
      order.push(1);
    });
    lt.add(() => {
      order.push(2);
    });
    lt.add(() => {
      order.push(3);
    });
    await lt.dispose();
    expect(order).toEqual([3, 2, 1]);
  });

  test('reverse-registration order holds for any registration count', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 64 }), (n) => {
        const order: number[] = [];
        const lt = Lifetime.make();
        for (let i = 0; i < n; i++) {
          const tag = i;
          lt.add(() => {
            order.push(tag);
          });
        }
        void lt.dispose();
        const expected = Array.from({ length: n }, (_, i) => n - 1 - i);
        expect(order).toEqual(expected);
      }),
      { seed: 0x11fe, numRuns: 200 },
    );
  });
});

// ---------------------------------------------------------------------------
// sync-close-before-async-dispose
// ---------------------------------------------------------------------------

describe('Lifetime — sync close before async dispose', () => {
  test('sync finalizers execute synchronously within the dispose() call', () => {
    let closed = false;
    const lt = Lifetime.make();
    lt.add(() => {
      closed = true;
    });
    void lt.dispose();
    // Not awaited: the sync close must already have landed.
    expect(closed).toBe(true);
  });

  test('async finalizers settle only after the returned promise resolves', async () => {
    let done = false;
    const lt = Lifetime.make();
    lt.add(async () => {
      await Promise.resolve();
      done = true;
    });
    const pending = lt.dispose();
    expect(done).toBe(false);
    await pending;
    expect(done).toBe(true);
  });

  test('sync side effects land before async ones are awaited', async () => {
    const events: string[] = [];
    const gate = deferred<void>();
    const lt = Lifetime.make();
    // registered first -> runs LAST: async, gated open by the test.
    lt.add(async () => {
      await gate.promise;
      events.push('async');
    });
    // registered last -> runs FIRST: sync.
    lt.add(() => {
      events.push('sync');
    });
    const pending = lt.dispose();
    expect(events).toEqual(['sync']);
    gate.resolve();
    await pending;
    expect(events).toEqual(['sync', 'async']);
  });

  test('dispose() with no errors resolves undefined', async () => {
    const lt = Lifetime.make();
    lt.add(() => undefined);
    await expect(lt.dispose()).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// exactly-once / idempotent
// ---------------------------------------------------------------------------

describe('Lifetime — exactly-once / idempotent dispose', () => {
  test('each finalizer runs exactly once across repeated dispose()', async () => {
    let count = 0;
    const lt = Lifetime.make();
    lt.add(() => {
      count += 1;
    });
    await lt.dispose();
    await lt.dispose();
    await lt.dispose();
    expect(count).toBe(1);
  });

  test('disposed flips true synchronously and stays true', () => {
    const lt = Lifetime.make();
    void lt.dispose();
    expect(lt.disposed).toBe(true);
  });

  test('repeat dispose() returns the identical promise', () => {
    const lt = Lifetime.make();
    lt.add(() => undefined);
    const first = lt.dispose();
    const second = lt.dispose();
    expect(second).toBe(first);
  });

  test('a finalizer re-entering dispose() does not re-run finalizers and returns the same promise', async () => {
    let count = 0;
    let inner: Promise<void> | undefined;
    const lt = Lifetime.make();
    lt.add(() => {
      count += 1;
      inner = lt.dispose();
    });
    const outer = lt.dispose();
    await outer;
    expect(count).toBe(1);
    expect(inner).toBe(outer);
  });
});

// ---------------------------------------------------------------------------
// late registration after dispose runs immediately
// ---------------------------------------------------------------------------

describe('Lifetime — late registration', () => {
  test('adding after dispose runs the finalizer immediately and synchronously', async () => {
    const lt = Lifetime.make();
    await lt.dispose();
    let ran = false;
    lt.add(() => {
      ran = true;
    });
    expect(ran).toBe(true);
  });

  test('a late finalizer runs exactly once (not re-run by a later dispose)', async () => {
    const lt = Lifetime.make();
    await lt.dispose();
    let count = 0;
    lt.add(() => {
      count += 1;
    });
    await lt.dispose();
    expect(count).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// remove handle
// ---------------------------------------------------------------------------

describe('Lifetime — remove handle', () => {
  test('a removed finalizer does not run at dispose', async () => {
    const order: string[] = [];
    const lt = Lifetime.make();
    const remove = lt.add(() => {
      order.push('a');
    });
    lt.add(() => {
      order.push('b');
    });
    remove();
    await lt.dispose();
    expect(order).toEqual(['b']);
  });

  test('remove is a no-op after the finalizer has already run', async () => {
    const lt = Lifetime.make();
    const remove = lt.add(() => undefined);
    await lt.dispose();
    expect(() => remove()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// aggregate failure
// ---------------------------------------------------------------------------

describe('Lifetime — aggregate failure', () => {
  test('all finalizers run even when some throw; errors fold into one tagged error', async () => {
    const e1 = new Error('e1');
    const e3 = new Error('e3');
    let middleRan = false;
    const lt = Lifetime.make();
    lt.add(() => {
      throw e1; // registered first -> runs LAST
    });
    lt.add(() => {
      middleRan = true;
    });
    lt.add(() => {
      throw e3; // registered last -> runs FIRST
    });
    const rejection = await lt.dispose().then(
      () => null,
      (error: unknown) => error,
    );
    expect(middleRan).toBe(true);
    expect(rejection).toBeInstanceOf(Error);
    expect(hasTag(rejection, 'LifetimeDisposeError')).toBe(true);
    // LIFO run order: e3 ran first, e1 last.
    expect((rejection as LifetimeDisposeError).causes).toEqual([e3, e1]);
  });

  test('the tagged error chains its first cause through Error.cause', async () => {
    const boom = new Error('boom');
    const lt = Lifetime.make();
    lt.add(() => {
      throw boom;
    });
    const rejection = await lt.dispose().then(
      () => null,
      (error: unknown) => error,
    );
    expect((rejection as Error).cause).toBe(boom);
  });

  test('async rejections aggregate in LIFO invocation order, not settle order', async () => {
    const asyncErr = new Error('async');
    const syncErr = new Error('sync');
    const late = deferred<void>();
    const lt = Lifetime.make();
    // registered first -> runs LAST (sync throw, run index 1)
    lt.add(() => {
      throw syncErr;
    });
    // registered last -> runs FIRST (async reject, run index 0), settles late
    lt.add(() => late.promise);
    const pending = lt.dispose();
    late.reject(asyncErr);
    const rejection = await pending.then(
      () => null,
      (error: unknown) => error,
    );
    expect(hasTag(rejection, 'LifetimeDisposeError')).toBe(true);
    expect((rejection as LifetimeDisposeError).causes).toEqual([asyncErr, syncErr]);
  });

  test('the standalone LifetimeDisposeError constructor is a tagged Error value', () => {
    const err = LifetimeDisposeError([new Error('x')]);
    expect(err).toBeInstanceOf(Error);
    expect(err._tag).toBe('LifetimeDisposeError');
    expect(hasTag(err, 'LifetimeDisposeError')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AbortSignal projection
// ---------------------------------------------------------------------------

describe('Lifetime — AbortSignal projection', () => {
  test('signal is unaborted before dispose', () => {
    expect(Lifetime.make().signal.aborted).toBe(false);
  });

  test('signal aborts synchronously at dispose start', () => {
    const lt = Lifetime.make();
    void lt.dispose();
    expect(lt.signal.aborted).toBe(true);
  });

  test('the abort event fires and finalizers observe an already-aborted signal', async () => {
    const lt = Lifetime.make();
    let eventFired = false;
    lt.signal.addEventListener('abort', () => {
      eventFired = true;
    });
    let abortedWhenRun: boolean | undefined;
    lt.add(() => {
      abortedWhenRun = lt.signal.aborted;
    });
    await lt.dispose();
    expect(eventFired).toBe(true);
    expect(abortedWhenRun).toBe(true);
  });
});
