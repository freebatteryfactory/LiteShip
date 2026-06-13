/**
 * Compositor -- merge multiple quantizers into composite state.
 *
 * The compositor aggregates discrete + blended state from all
 * active quantizers into a single CompositeState, producing
 * typed output channels (css, glsl, aria).
 *
 * Wired: DirtyFlags (selective recomputation), CompositorStatePool
 * (zero-allocation), FrameBudget (priority scheduling), microtask batching,
 * and RuntimeCoordinator (Plan + ECS-backed runtime bookkeeping).
 *
 * Hot path (computeStateSync) is plain JS — no Effect overhead.
 * Effect is used only for resource lifecycle (create/scope) and
 * reactive stream (SubscriptionRef.changes).
 *
 * @module
 */

import type { Scope, Stream } from 'effect';
import { Effect, SubscriptionRef } from 'effect';
import type { Boundary } from './boundary.js';
import type { ContentAddress } from './brands.js';
import { COMPOSITOR_POOL_CAP, DIRTY_FLAGS_MAX } from './defaults.js';
import { CompositorStatePool, accessCompositeState } from './compositor-pool.js';
import { DirtyFlags } from './dirty.js';
import type { PolicyNode, RuntimeSite } from './document-graph.js';
import { chooseRung } from './escalation.js';
import type { FrameBudget } from './frame-budget.js';
import { projectionKeys } from './projection.js';
import type { Quantizer } from './quantizer-types.js';
import { RuntimeCoordinator } from './runtime-coordinator.js';
import { SpeculativeEvaluator } from './speculative.js';

/**
 * Snapshot of the compositor's output per tick: discrete state names for each
 * quantizer, their blend-weight vectors, and the compiled per-target output
 * maps (`css` / `glsl` / `wgsl` / `aria`).
 *
 * `wgsl` mirrors `glsl` (a per-quantizer numeric channel keyed by the
 * quantizer's projection key). D0 carries the channel through the state shape,
 * the pool, and the worker emit so the host and worker paths agree; populating
 * it from a boundary's `@wgsl` cast in the live emit phase is the WGSL agent's
 * job (the `emit-wgsl` runtime phase is deliberately not added here).
 */
export interface CompositeState {
  readonly discrete: Record<string, string>;
  readonly blend: Record<string, Record<string, number>>;
  readonly outputs: {
    readonly css: Record<string, number | string>;
    readonly glsl: Record<string, number>;
    readonly wgsl: Record<string, number>;
    readonly aria: Record<string, string>;
  };
}

/**
 * Options accepted by `Compositor.create`: pool capacity, optional
 * frame-budget gating, whether to enable speculative pre-evaluation, and an
 * optional escalation gate ({@link getPolicy} + {@link runtimeSite}).
 */
export interface CompositorConfig {
  readonly poolCapacity?: number;
  readonly frameBudget?: FrameBudget.Shape;
  readonly speculative?: boolean;
  /**
   * Escalation gate: resolve the {@link PolicyNode} (if any) that governs a
   * projection, by its `ContentAddress`. When a policy applies, the compositor
   * computes `chooseRung(policy, runtimeSite)` at `add` time and emits ONLY the
   * targets that rung admits (`admittedTargets`). A projection with NO matching
   * policy is pass-through (all targets emit). A policy that matches but admits
   * no rung (the `{ error }` branch — site not admitted, or budgets/grants
   * exhaust every rung) DENIES every target for that projection: a constraint
   * that cannot be satisfied must not silently emit at full capability.
   */
  readonly getPolicy?: (projectionId: ContentAddress) => PolicyNode | undefined;
  /**
   * The runtime site the escalation gate evaluates policies against. Defaults to
   * an environment hint: `'browser'` when a `window` global is present, else
   * `'node'`. Ignored unless {@link getPolicy} is supplied.
   */
  readonly runtimeSite?: RuntimeSite;
}

/**
 * Per-projection target admissibility resolved by the escalation gate. `null`
 * (the default) means no policy governs the projection, so every target emits.
 * A present set lists exactly the targets the chosen rung admits; the
 * `{ error }` branch resolves to an EMPTY set, denying every target.
 */
type AdmittedTargets = ReadonlySet<string> | null;

/** Default runtime-site hint when no explicit `runtimeSite` is configured. */
function defaultRuntimeSite(): RuntimeSite {
  return typeof window !== 'undefined' ? 'browser' : 'node';
}

/**
 * Widen a Quantizer's boundary parameter to Boundary.Shape for storage in
 * a heterogeneous registry. Safe because Quantizer<B> is covariant in B
 * (B only appears in return positions on Quantizer).
 */
function widenQuantizer<B extends Boundary.Shape>(q: Quantizer<B>): Quantizer<Boundary.Shape> {
  return q as unknown as Quantizer<Boundary.Shape>;
}

interface CompositorShape {
  add<B extends Boundary.Shape>(name: string, quantizer: Quantizer<B>): Effect.Effect<void>;
  remove(name: string): Effect.Effect<void>;
  compute(): Effect.Effect<CompositeState>;
  setBlendWeights(name: string, weights: Record<string, number>): Effect.Effect<void>;
  evaluateSpeculative(name: string, value: number, velocity?: number): void;
  scheduleBatch(): void;
  readonly changes: Stream.Stream<CompositeState>;
  readonly runtime: RuntimeCoordinator.Shape;
}

interface CompositorFactory {
  create(config?: CompositorConfig): Effect.Effect<CompositorShape, never, Scope.Scope>;
}

interface QuantizerMeta {
  readonly cssKey: string;
  readonly glslKey: string;
  readonly ariaKey: string;
  readonly oneHotWeights: Readonly<Record<string, Readonly<Record<string, number>>>>;
  /**
   * Targets the escalation gate admits for this projection, resolved once at
   * `add` time. `null` = no policy applies (pass-through, all targets emit);
   * a set = emit only listed targets (an empty set denies everything).
   */
  readonly admitted: AdmittedTargets;
}

function emptyCompositeState(): CompositeState {
  return {
    discrete: {},
    blend: {},
    outputs: { css: {}, glsl: {}, wgsl: {}, aria: {} },
  };
}

const MAX_DIRTY_KEYS = DIRTY_FLAGS_MAX;

/**
 * Escalation emit gate: does this projection's resolved policy admit `target`?
 * `meta.admitted === null` means no policy applies (pass-through). Otherwise the
 * target must be in the admitted set (an empty set denies everything).
 */
function admits(meta: QuantizerMeta, target: string): boolean {
  return meta.admitted === null || meta.admitted.has(target);
}

/**
 * Compositor — the live merge point for every attached {@link Quantizer}.
 *
 * `Compositor.create` hands back a scoped Effect that, when run inside a
 * `Scope`, produces a compositor bound to a {@link RuntimeCoordinator}. Adding
 * quantizers, marking dirty flags, and emitting CSS/GLSL/ARIA outputs all flow
 * through the zero-allocation hot path backed by {@link CompositorStatePool}.
 *
 * @example
 * ```ts
 * import { Effect } from 'effect';
 * import { Compositor } from '@czap/core';
 *
 * const program = Effect.scoped(Effect.gen(function* () {
 *   const compositor = yield* Compositor.create({ poolCapacity: 64, speculative: true });
 *   yield* compositor.add('viewport', viewportQuantizer);
 *   const state = yield* compositor.compute();
 *   // state.discrete.viewport === 'tablet'
 *   // state.outputs.css['--czap-viewport'] === 'tablet'
 * }));
 * ```
 */
export const Compositor: CompositorFactory = {
  /** Build a scoped compositor bound to a fresh {@link RuntimeCoordinator}. */
  create(config?: CompositorConfig): Effect.Effect<CompositorShape, never, Scope.Scope> {
    return Effect.gen(function* () {
      const stateRef = yield* SubscriptionRef.make<CompositeState>(emptyCompositeState());

      const qMap = new Map<string, Quantizer<Boundary.Shape>>();
      const metaMap = new Map<string, QuantizerMeta>();
      const overrides = new Map<string, Record<string, number>>();

      const pool = CompositorStatePool.make(config?.poolCapacity ?? COMPOSITOR_POOL_CAP);
      const frameBudget = config?.frameBudget;
      const useSpeculative = config?.speculative ?? false;
      const getPolicy = config?.getPolicy;
      const runtimeSite = config?.runtimeSite ?? defaultRuntimeSite();

      /**
       * Resolve the escalation-admitted target set for a projection at `add`
       * time. No policy → `null` (pass-through). A policy that resolves to the
       * `{ error }` branch → empty set (deny all targets). Otherwise the rung's
       * `admittedTargets`.
       */
      const resolveAdmitted = (name: string): AdmittedTargets => {
        if (getPolicy === undefined) return null;
        const policy = getPolicy(name as ContentAddress);
        if (policy === undefined) return null;
        const choice = chooseRung(policy, runtimeSite);
        return 'error' in choice ? new Set<string>() : choice.admittedTargets;
      };
      const runtime = RuntimeCoordinator.create({
        capacity: Math.max(config?.poolCapacity ?? COMPOSITOR_POOL_CAP, MAX_DIRTY_KEYS + 8),
        name: 'czap-compositor-runtime',
      });

      const speculativeEvaluators = new Map<string, SpeculativeEvaluator.Shape<Boundary.Shape>>();
      const prefetchedStates = new Map<string, string>();

      let nameList: string[] = [];
      let dirty: DirtyFlags.Shape<string> | null = null;
      let recomputeAll = false;
      let previousState: CompositeState = emptyCompositeState();
      let priorPreviousState: CompositeState | null = null;
      let batchScheduled = false;
      function rebuildDirtyFlags(): void {
        if (nameList.length > MAX_DIRTY_KEYS) {
          dirty = null;
          recomputeAll = true;
          return;
        }

        dirty = DirtyFlags.make(nameList);
        recomputeAll = false;
        for (const name of nameList) {
          dirty.mark(name);
          runtime.markDirty(name);
        }
      }

      function computeStateSync(): CompositeState {
        const dirtyFlags = dirty;
        const dirtyNames = recomputeAll || dirtyFlags === null ? Array.from(qMap.keys()) : dirtyFlags.getDirty();
        const shouldRecompute =
          recomputeAll || dirtyFlags === null ? () => true : (name: string) => dirtyFlags.isDirty(name);

        const state = pool.acquire();
        const { discrete, blend, css, glsl, aria } = accessCompositeState(state);

        for (const [name] of qMap) {
          if (shouldRecompute(name)) {
            continue;
          }

          const meta = metaMap.get(name)!;
          const previousDiscrete = previousState.discrete[name];
          if (previousDiscrete !== undefined) {
            discrete[name] = previousDiscrete;
          }

          const previousBlend = previousState.blend[name]!;
          blend[name] = previousBlend;

          const previousCss = previousState.outputs.css[meta.cssKey];
          if (previousCss !== undefined) {
            css[meta.cssKey] = previousCss;
          }

          const previousGlsl = previousState.outputs.glsl[meta.glslKey];
          if (previousGlsl !== undefined) {
            glsl[meta.glslKey] = previousGlsl;
          }

          const previousAria = previousState.outputs.aria[meta.ariaKey];
          if (previousAria !== undefined) {
            aria[meta.ariaKey] = previousAria;
          }
        }

        for (const phase of runtime.phases) {
          switch (phase) {
            case 'compute-discrete':
              for (const name of dirtyNames) {
                const quantizer = qMap.get(name)!;

                const prefetched = prefetchedStates.get(name);
                const stateStr =
                  prefetched ?? (quantizer.stateSync ? quantizer.stateSync() : Effect.runSync(quantizer.state));
                discrete[name] = stateStr;
                runtime.setState(name, stateStr);
                prefetchedStates.delete(name);
              }
              break;

            case 'compute-blend':
              for (const name of dirtyNames) {
                const meta = metaMap.get(name)!;

                const override = overrides.get(name);
                if (override !== undefined) {
                  blend[name] = override;
                  continue;
                }

                blend[name] = meta.oneHotWeights[discrete[name] ?? ''] ?? {};
              }
              break;

            case 'emit-css':
              for (const name of dirtyNames) {
                const meta = metaMap.get(name);
                const stateStr = discrete[name];
                // Escalation gate: skip projections whose policy does not admit `css`.
                if (stateStr !== undefined && meta && admits(meta, 'css')) {
                  css[meta.cssKey] = stateStr;
                }
              }
              break;

            case 'emit-glsl':
              if (!frameBudget || frameBudget.canRun('high')) {
                for (const name of dirtyNames) {
                  const meta = metaMap.get(name)!;
                  // Escalation gate: skip projections whose policy does not admit `glsl`.
                  if (admits(meta, 'glsl')) {
                    glsl[meta.glslKey] = runtime.getStateIndex(name);
                  }
                }
              }
              break;

            case 'emit-aria':
              if (!frameBudget || frameBudget.canRun('low')) {
                for (const name of dirtyNames) {
                  const meta = metaMap.get(name)!;
                  const stateStr = discrete[name];
                  // Escalation gate: skip projections whose policy does not admit `aria`.
                  if (stateStr !== undefined && admits(meta, 'aria')) {
                    aria[meta.ariaKey] = stateStr;
                  }
                }
              }
              break;
          }
        }

        if (dirty) {
          dirty.clearAll();
        }

        // Two-slot rotation: the most-recently-published state stays readable for one
        // more tick (so consumers who hold a reference returned from compute() see live
        // data until the *next-next* publish). Without this rotation, every tick takes
        // the overflow path in CompositorStatePool.acquire and the pool grows unboundedly.
        const releasable = priorPreviousState;
        priorPreviousState = previousState;
        previousState = state;
        Effect.runSync(SubscriptionRef.set(stateRef, state));
        if (releasable && releasable !== state) pool.release(releasable);
        return state;
      }

      const compositor: CompositorShape = {
        add: <B extends Boundary.Shape>(name: string, quantizer: Quantizer<B>) =>
          Effect.sync(() => {
            // Quantizer<B> is covariant in B (B only appears in return types), so widening
            // to Quantizer<Boundary.Shape> is sound; wrap in a named helper to document.
            qMap.set(name, widenQuantizer(quantizer));
            metaMap.set(name, {
              ...projectionKeys(name),
              admitted: resolveAdmitted(name),
              oneHotWeights: Object.fromEntries(
                quantizer.boundary.states.map((activeState) => [
                  activeState as string,
                  Object.freeze(
                    Object.fromEntries(
                      quantizer.boundary.states.map((stateName) => [
                        stateName as string,
                        stateName === activeState ? 1 : 0,
                      ]),
                    ),
                  ),
                ]),
              ),
            });
            runtime.registerQuantizer(name, quantizer.boundary.states as readonly string[]);
            runtime.markDirty(name);

            if (!nameList.includes(name)) {
              nameList.push(name);
              rebuildDirtyFlags();
            }
            if (dirty) {
              dirty.mark(name);
            }

            if (useSpeculative) {
              speculativeEvaluators.set(name, SpeculativeEvaluator.make(quantizer.boundary));
            }

            computeStateSync();
          }),

        remove: (name: string) =>
          Effect.sync(() => {
            qMap.delete(name);
            metaMap.delete(name);
            nameList = nameList.filter((entry) => entry !== name);
            rebuildDirtyFlags();
            runtime.removeQuantizer(name);
            speculativeEvaluators.delete(name);
            prefetchedStates.delete(name);
            computeStateSync();
          }),

        compute: () => Effect.sync(() => computeStateSync()),

        setBlendWeights: (name: string, weights: Record<string, number>) =>
          Effect.sync(() => {
            overrides.set(name, weights);
            if (dirty) {
              dirty.mark(name);
            }
            runtime.markDirty(name);
          }),

        evaluateSpeculative(name: string, value: number, velocity?: number): void {
          const speculative = speculativeEvaluators.get(name);
          if (!speculative) {
            return;
          }

          const result = speculative.evaluate(value, velocity);
          if (result.prefetched && result.confidence > 0.7) {
            prefetchedStates.set(name, result.prefetched as string);
            runtime.markDirty(name);
            if (dirty) {
              dirty.mark(name);
            }
            return;
          }

          prefetchedStates.delete(name);
        },

        scheduleBatch(): void {
          if (batchScheduled) {
            return;
          }

          batchScheduled = true;
          queueMicrotask(() => {
            batchScheduled = false;
            computeStateSync();
          });
        },

        changes: SubscriptionRef.changes(stateRef),
        runtime,
      };

      return compositor;
    });
  },
};

export declare namespace Compositor {
  /** Structural shape of a live compositor instance. */
  export type Shape = CompositorShape;
  /** Alias for {@link CompositorConfig}. */
  export type Config = CompositorConfig;
}
