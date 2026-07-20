/**
 * BlendTree -- weighted multi-state blending.
 *
 * A blend tree holds named numeric-record values with weights.
 * `compute()` returns the weighted average of all values.
 *
 * The reactive `changes` channel is a no-replay {@link CellKernel.fanout}
 * (the strictly-simpler unbounded-PubSub sibling): every mutation publishes the
 * freshly computed blend synchronously to current subscribers; a late
 * subscriber never sees a prior blend. This replaces the former
 * `PubSub.unbounded` + `Stream.fromPubSub` + `Effect.runSync(PubSub.publish)`
 * triad. The pure blend kernel (`computeBlend` / `finalizeBlend`) is unchanged.
 *
 * @module
 */

import { CellKernel } from '../reactive/cell-kernel.js';
import { Lifetime } from '../reactive/lifetime.js';

interface BlendNodeShape<T> {
  readonly value: T;
  readonly weight: number;
}

/** The public read side of a blend tree's reactive channel: no-replay subscribe. */
type BlendChanges<T> = Pick<CellKernel.Fanout<T>, 'subscribe' | 'closed' | 'size'>;

interface BlendTreeShape<T extends Record<string, number>> {
  add(name: string, value: T, weight: number): void;
  remove(name: string): void;
  setWeight(name: string, weight: number): void;
  compute(): T;
  readonly changes: BlendChanges<T>;
}

/**
 * The pair {@link BlendTree.make} returns: the live tree plus the
 * {@link Lifetime} that owns its teardown. Dispose the lifetime to close the
 * reactive `changes` channel (completing subscribers, making publish inert).
 */
interface BlendTreeHandle<T extends Record<string, number>> {
  readonly tree: BlendTreeShape<T>;
  readonly lifetime: Lifetime;
}

/**
 * Creates a new BlendTree for weighted multi-state blending of numeric records.
 *
 * @example
 * ```ts
 * const { tree } = BlendTree.make<{ x: number; y: number }>();
 * tree.add('idle', { x: 0, y: 0 }, 0.3);
 * tree.add('active', { x: 100, y: 50 }, 0.7);
 * const blended = tree.compute(); // { x: 70, y: 35 }
 * ```
 */
function _make<T extends Record<string, number>>(): BlendTreeHandle<T> {
  const nodes = new Map<string, BlendNodeShape<T>>();
  const channel = CellKernel.fanout<T>();
  const lifetime = Lifetime.make();
  lifetime.add(() => channel.close());

  // The computed result is a Record<string, number> whose keys match T's keys by
  // construction (we only write keys copied from node.value, which is T). TS can't
  // track that structural promise, so we contain one narrowing downcast in a named
  // helper (sound: T extends Record<string, number>, so the assertion only narrows).
  const finalizeBlend = (record: Record<string, number>): T => record as T;

  function computeBlend(): T {
    const result: Record<string, number> = {};
    let totalWeight = 0;

    for (const node of nodes.values()) {
      if (node.weight > 0) totalWeight += node.weight;
    }

    if (totalWeight === 0 || nodes.size === 0) {
      return finalizeBlend(result);
    }

    let initialized = false;
    for (const node of nodes.values()) {
      const w = node.weight > 0 ? node.weight / totalWeight : 0;
      for (const key in node.value) {
        if (Object.prototype.hasOwnProperty.call(node.value, key)) {
          if (!initialized || !(key in result)) {
            result[key] = 0;
          }
          result[key]! += node.value[key]! * w;
        }
      }
      initialized = true;
    }

    return finalizeBlend(result);
  }

  function notifyChange(): void {
    channel.publish(computeBlend());
  }

  const tree: BlendTreeShape<T> = {
    add(name: string, value: T, weight: number): void {
      nodes.set(name, { value, weight });
      notifyChange();
    },

    remove(name: string): void {
      nodes.delete(name);
      notifyChange();
    },

    setWeight(name: string, weight: number): void {
      const node = nodes.get(name);
      if (node) {
        nodes.set(name, { ...node, weight });
        notifyChange();
      }
    },

    compute(): T {
      return computeBlend();
    },

    changes: channel,
  };

  return { tree, lifetime };
}

/**
 * BlendTree -- weighted multi-state blending for numeric records.
 * Add named nodes with values and weights, then compute the weighted average.
 * `make` returns a `{ tree, lifetime }` handle.
 *
 * @example
 * ```ts
 * const { tree } = BlendTree.make<{ opacity: number }>();
 * tree.add('fadeIn', { opacity: 1 }, 0.8);
 * tree.add('fadeOut', { opacity: 0 }, 0.2);
 * const result = tree.compute(); // { opacity: 0.8 }
 * ```
 */
export const BlendTree = { make: _make };

/** Public structural type for `BlendTree`. */
export type BlendTree<T extends Record<string, number>> = BlendTreeShape<T>;

export declare namespace BlendTree {
  /** Individual leaf/intermediate node in a blend tree. */
  export type Node<T> = BlendNodeShape<T>;
  /** The `{ tree, lifetime }` pair {@link BlendTree.make} returns. */
  export type Handle<T extends Record<string, number>> = BlendTreeHandle<T>;
}
