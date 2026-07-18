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
 * ZERO-ALLOCATION HOT PATH — zero RETAINED **and** zero TRANSIENT. The per-frame
 * compose body (`computeStateSync`) is plain JS that mutates a POOLED
 * {@link CompositeState} in place: it acquires a recycled state from
 * {@link CompositorStatePool}, refills a REUSED dirty-name scratch array (never
 * `Array.from`/`getDirty` — those minted an array per tick), and walks the phases
 * with index loops + no per-tick closures. The result is no RETAINED per-op
 * allocation: the live heap (the growth that survives a forced GC) stays flat at
 * ≈ 0 bytes/op — proven by the allocation gate (`tests/property/compositor-zero-alloc.test.ts`).
 *
 * The reactive publish that feeds `changes` is a RAW, synchronous fan-out over the
 * extracted replay-1 {@link CellKernel} (`CellKernel.replay1`): the publish is
 * `cell.publish(state)`, which assigns the current-value slot then runs
 * `for (const registration of registrations) registration.sink.next(state)` — the
 * SAME code this compositor formerly inlined as `live.current` + `changeListeners`
 * + `publishState`, which the kernel was extracted from. No `Effect` node, no
 * PubSub linked-list node, no replay-buffer node, nothing allocated per publish.
 * (The prior `SubscriptionRef.set` publish was a measured ≈ 22 B/op TRANSIENT floor
 * — NOT the semaphore wrapper as once assumed, but the `PubSub`/`ReplayBuffer` node
 * that `SubscriptionRef` mints on every publish even with no subscriber. Measured:
 * `scripts/micro-publish-probe.mjs`.) When NO `changes` subscriber is attached (the
 * common compose tick) the registration set is empty and the publish allocates
 * nothing — genuine zero transient. A live subscriber adds only the direct,
 * synchronous `sink.next(state)` call (no `Queue`, no enqueue, nothing allocated) —
 * the kernel notifies listeners in one synchronous pass, so the old
 * `Stream.callback` + `Queue.offerUnsafe` bridge cost is gone entirely.
 *
 * SINGLE-WRITER PRECONDITION (why the raw fan-out is safe + contract-preserving).
 * `SubscriptionRef.set` wraps its publish in a semaphore to make concurrent
 * writers atomic. The compositor has exactly ONE writer of the live state — the
 * synchronous `computeStateSync`, reached only from `add` / `remove` / `compute` /
 * the `scheduleBatch` microtask, all of which run to completion on the single JS
 * thread with no `await`/`yield`/fork inside the compose body. There is never a
 * concurrent second writer, so the semaphore's atomicity guarantee is MOOT and the
 * raw publish loses nothing — the replay-1 kernel preserves the `changes` contract
 * exactly (replay-current-on-subscribe + per-subscriber fan-out; behavior identity
 * is the point, pinned by `tests/unit/core/cell-kernel.test.ts`), just without the
 * per-publish allocation. Everything else (create/lifetime) is off the hot path.
 *
 * @module
 */

import type { Boundary } from './boundary.js';
import { CellKernel } from './cell-kernel.js';
import { Lifetime } from './lifetime.js';
import { COMPOSITOR_POOL_CAP, DIRTY_FLAGS_MAX } from './defaults.js';
import { CompositorStatePool, accessCompositeState } from './compositor-pool.js';
import { DirtyFlags } from './dirty.js';
import type { PolicyNode, RuntimeSite } from './document-graph.js';
import { chooseRung } from './escalation.js';
import type { FrameBudget } from './frame-budget.js';
import { projectionKeys } from './projection.js';
import type { Quantizer, ReactiveQuantizer } from './quantizer-types.js';
import { RuntimeCoordinator } from './runtime-coordinator.js';
import { SpeculativeEvaluator } from './speculative.js';

/**
 * Snapshot of the compositor's output per tick: discrete state names for each
 * quantizer, their blend-weight vectors, and the compiled per-target output
 * maps (`css` / `glsl` / `wgsl` / `aria`).
 *
 * `wgsl` mirrors `glsl` (a per-quantizer numeric channel keyed by the
 * quantizer's bare snake_case projection key). D0 carries the channel through
 * the state shape, the pool, and the worker emit; D1-WGSL adds the live
 * `emit-wgsl` runtime phase (below) that populates it from the state index,
 * escalation-gated on the `wgsl` target (admitted only at the `gpu` rung).
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
   * projection, keyed by the quantizer's compositor registry name (the same
   * `name` passed to `add()` — the compositor knows names, not graph projection
   * ids, so a host wiring graph projections maps id → name here). When a policy applies, the compositor
   * computes `chooseRung(policy, runtimeSite)` at `add` time and emits ONLY the
   * targets that rung admits (`admittedTargets`). A projection with NO matching
   * policy is pass-through (all targets emit). A policy that matches but admits
   * no rung (the `{ error }` branch — site not admitted, or budgets/grants
   * exhaust every rung) DENIES every target for that projection: a constraint
   * that cannot be satisfied must not silently emit at full capability.
   */
  readonly getPolicy?: (projectionName: string) => PolicyNode | undefined;
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
  // Detect the realm before falling back to `node`, so worker/edge runtimes
  // (which this escalation gate explicitly targets) don't collapse to `node` and
  // consult the wrong admission table. A real DOM document ⇒ browser; a worker
  // global (`WorkerGlobalScope`/`importScripts`) ⇒ worker; an edge global ⇒ edge.
  const g = globalThis as Record<string, unknown>;
  if (typeof g['window'] !== 'undefined' && typeof g['document'] !== 'undefined') return 'browser';
  if (typeof g['WorkerGlobalScope'] !== 'undefined' || typeof g['importScripts'] === 'function') return 'worker';
  if (typeof g['EdgeRuntime'] !== 'undefined') return 'edge';
  return 'node';
}

/**
 * Widen a Quantizer's boundary parameter to Boundary.Shape for storage in
 * a heterogeneous registry. Safe because Quantizer<B> is covariant in B
 * (B only appears in return positions on Quantizer).
 */
function widenQuantizer<B extends Boundary.Shape>(q: Quantizer<B>): Quantizer<Boundary.Shape> {
  return q as unknown as Quantizer<Boundary.Shape>;
}

/**
 * The public, read-only view of the compositor's reactive `changes` kernel: the
 * replay-1 subscription surface of the extracted {@link CellKernel}. `subscribe`
 * replays the current live state on attach (the replay-1 contract) and returns a
 * disposer; `read` returns the current state; every subsequent
 * compose fans out synchronously to every subscriber. `publish`/`close` are
 * intentionally excluded — the compositor is the sole writer and the owning
 * {@link Lifetime} closes the kernel on dispose.
 */
type CompositorChanges = Pick<CellKernel.Replay<CompositeState>, 'subscribe' | 'read' | 'closed' | 'size'>;

interface CompositorShape {
  add<B extends Boundary.Shape>(name: string, quantizer: Quantizer<B>): void;
  remove(name: string): void;
  compute(): CompositeState;
  setBlendWeights(name: string, weights: Record<string, number>): void;
  evaluateSpeculative(name: string, value: number, velocity?: number): void;
  scheduleBatch(): void;
  readonly changes: CompositorChanges;
  readonly runtime: RuntimeCoordinator.Shape;
}

/**
 * The pair returned by {@link Compositor.create}: the live compositor instance
 * plus the {@link Lifetime} that owns its teardown. The Lifetime's sole finalizer
 * closes the reactive `changes` kernel — completing every subscriber and making
 * publish inert — so consumers thread compositor lifecycle through one uniform
 * `dispose()`.
 */
interface CompositorHandle {
  readonly compositor: CompositorShape;
  readonly lifetime: Lifetime.Shape;
}

interface CompositorFactory {
  create(config?: CompositorConfig): CompositorHandle;
}

interface QuantizerMeta {
  readonly cssKey: string;
  readonly glslKey: string;
  readonly wgslKey: string;
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
 * `Compositor.create` returns a live compositor bound to a fresh
 * {@link RuntimeCoordinator}, paired with the {@link Lifetime} that owns its
 * teardown. Adding quantizers, marking dirty flags, and emitting CSS/GLSL/ARIA
 * outputs all flow through the zero-allocation hot path backed by
 * {@link CompositorStatePool}.
 *
 * @example
 * ```ts
 * import { Compositor } from '@czap/core';
 *
 * const { compositor, lifetime } = Compositor.create({ poolCapacity: 64, speculative: true });
 * compositor.add('viewport', viewportQuantizer);
 * const state = compositor.compute();
 * // state.discrete.viewport === 'tablet'
 * // state.outputs.css['--czap-viewport'] === 'tablet'
 * await lifetime.dispose();
 * ```
 */
export const Compositor: CompositorFactory = {
  /** Build a compositor bound to a fresh {@link RuntimeCoordinator}, paired with its owning {@link Lifetime}. */
  create(config?: CompositorConfig): CompositorHandle {
    // Reactive notification seam — the extracted replay-1 {@link CellKernel}
    // (`CellKernel.replay1`). Its current-value slot + synchronous generation-
    // bounded fan-out ARE the code this compositor formerly inlined as
    // `live.current` + `changeListeners` + `publishState`; the kernel was extracted
    // from exactly those lines, so behavior is identical (pinned by
    // cell-kernel.test.ts). The compositor never subscribes during a publish, so
    // the S6.1a membership refinement (dispatch-snapshot, retiring the mid-fan-out
    // live-set double delivery) leaves its extraction byte-faithful.
    // `publish` assigns the slot then notifies each listener in one synchronous
    // pass — no Effect node, no PubSub/replay-buffer node per publish, so the
    // zero-transient hot path is preserved (the old `SubscriptionRef.set` minted
    // a ≈ 22 B/op node every tick even with no subscriber). Safe because the
    // compositor is the single writer of the current slot (the synchronous
    // `computeStateSync`, never concurrent — see the module-level single-writer
    // precondition). The slot holds the most-recently-published state so a late
    // `changes` subscriber replays it on attach (the replay-1 contract the old
    // `changes` stream gave).
    const cell = CellKernel.replay1<CompositeState>(emptyCompositeState());

    /**
     * Raw, zero-allocation reactive publish: assign the current-value slot, then
     * fan it out to every active `changes` subscriber synchronously via the
     * kernel. No `Effect` node, no PubSub node, no `Queue` — the publish
     * allocates nothing (the registration set's iterator is the only churn and
     * V8 stack-allocates it; measured ≈ 0 B/op with no subscriber).
     */
    function publishState(state: CompositeState): void {
      cell.publish(state);
    }

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
      const policy = getPolicy(name);
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
    // Last runtime dirty-epoch this compositor has already folded into its
    // local `dirty` set, per quantizer name. `runtime.markDirty(name)` is the
    // public re-mark the Stage dual-export sweep and the worker host call
    // between ticks; it advances the runtime's epoch but does NOT touch the
    // compositor's local `dirty` flags. Without reconciling the two, `compute()`
    // would take the stale carry-forward path and FREEZE on every tick after the
    // first (the dual-export frozen-MP4 class of bug). Folding epoch advances in
    // at the top of `computeStateSync` makes `runtime.markDirty` a real recompute
    // trigger while preserving the freeze-when-nothing-was-marked law.
    const seenEpoch = new Map<string, number>();

    // Zero-allocation scratch for the per-tick dirty-name list. Refilled IN
    // PLACE every tick (length tracked separately) so the hot path never
    // allocates a fresh array — the old `Array.from(qMap.keys())` /
    // `dirtyFlags.getDirty()` both minted one array per compute(). The array
    // only ever GROWS (when more quantizers attach than it has held before), so
    // it reaches a steady size and then allocates nothing.
    const dirtyNamesScratch: string[] = [];
    let dirtyCount = 0;
    /**
     * Refill {@link dirtyNamesScratch} with the names to (re)compute this tick:
     * EVERY quantizer when in the recompute-all / no-flags path, else exactly the
     * marked names. Writes in place and sets {@link dirtyCount}; allocates nothing
     * once the scratch has reached its high-water size.
     */
    function refillDirtyNames(recomputeEverything: boolean, flags: DirtyFlags.Shape<string> | null): void {
      dirtyCount = 0;
      for (const name of qMap.keys()) {
        if (recomputeEverything || flags === null || flags.isDirty(name)) {
          dirtyNamesScratch[dirtyCount] = name;
          dirtyCount++;
        }
      }
    }

    function reconcileRuntimeDirty(): void {
      if (dirty === null) return; // recomputeAll path already recomputes everything
      for (const name of qMap.keys()) {
        const epoch = runtime.getDirtyEpoch(name);
        if (epoch !== (seenEpoch.get(name) ?? 0)) {
          dirty.mark(name);
          seenEpoch.set(name, epoch);
        }
      }
    }
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
      // Fold any out-of-band `runtime.markDirty` re-marks into the local dirty
      // set before reading it, so a host that drives a quantizer's `evaluate`
      // and then `runtime.markDirty(name)` (Stage dual-export, worker) sees the
      // new state instead of the frozen carry-forward.
      reconcileRuntimeDirty();
      const dirtyFlags = dirty;
      const recomputeEverything = recomputeAll || dirtyFlags === null;
      // Refill the reused scratch in place — no per-tick array allocation.
      refillDirtyNames(recomputeEverything, dirtyFlags);

      const state = pool.acquire();
      const { discrete, blend, css, glsl, wgsl, aria } = accessCompositeState(state);

      for (const [name] of qMap) {
        // shouldRecompute(name): everything recomputes in the no-flags path, else
        // only the marked names. Inlined (was a per-tick closure allocation).
        if (recomputeEverything || (dirtyFlags !== null && dirtyFlags.isDirty(name))) {
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

        // WGSL exposes a single fixed `state_index` struct field (the field the
        // WGSL compiler generates and the runtime reads from uniform slot 0) —
        // not a per-quantizer key like glsl/css.
        const previousWgsl = previousState.outputs.wgsl['state_index'];
        if (previousWgsl !== undefined) {
          wgsl['state_index'] = previousWgsl;
        }

        const previousAria = previousState.outputs.aria[meta.ariaKey];
        if (previousAria !== undefined) {
          aria[meta.ariaKey] = previousAria;
        }
      }

      for (const phase of runtime.phases) {
        switch (phase) {
          case 'compute-discrete':
            for (let i = 0; i < dirtyCount; i++) {
              const name = dirtyNamesScratch[i]!;
              const quantizer = qMap.get(name)!;

              const prefetched = prefetchedStates.get(name);
              // Sync hot path prefers `stateSync()`; the reactive fallback reads the
              // current discrete state off the quantizer's replay-1 CellKernel. A
              // quantizer with no `stateSync` is necessarily a ReactiveQuantizer (the
              // `@czap/quantizer` builder always produces one), so the narrowing cast
              // is sound. No residual Effect in this file.
              const stateStr =
                prefetched ??
                (quantizer.stateSync
                  ? quantizer.stateSync()
                  : (quantizer as ReactiveQuantizer<Boundary.Shape>).state.read());
              discrete[name] = stateStr;
              runtime.setState(name, stateStr);
              prefetchedStates.delete(name);
            }
            break;

          case 'compute-blend':
            for (let i = 0; i < dirtyCount; i++) {
              const name = dirtyNamesScratch[i]!;
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
            for (let i = 0; i < dirtyCount; i++) {
              const name = dirtyNamesScratch[i]!;
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
              for (let i = 0; i < dirtyCount; i++) {
                const name = dirtyNamesScratch[i]!;
                const meta = metaMap.get(name)!;
                // Escalation gate: skip projections whose policy does not admit `glsl`.
                if (admits(meta, 'glsl')) {
                  glsl[meta.glslKey] = runtime.getStateIndex(name);
                }
              }
            }
            break;

          case 'emit-wgsl':
            // The live WGSL state index goes into the single fixed `state_index`
            // struct field that `WGSLCompiler` generates and the `client:gpu`
            // WGSL runtime reads from uniform-buffer slot 0 — NOT the authored
            // per-quantizer field key (those ride the payload). WGSL is the
            // heaviest (gpu-rung) target, so it shares glsl's `high` budget gate.
            if (!frameBudget || frameBudget.canRun('high')) {
              for (let i = 0; i < dirtyCount; i++) {
                const name = dirtyNamesScratch[i]!;
                const meta = metaMap.get(name)!;
                // Escalation gate: skip projections whose policy does not admit `wgsl`.
                // (wgsl is admitted only at the `gpu` rung — strictly above glsl.)
                if (admits(meta, 'wgsl')) {
                  wgsl['state_index'] = runtime.getStateIndex(name);
                }
              }
            }
            break;

          case 'emit-aria':
            if (!frameBudget || frameBudget.canRun('low')) {
              for (let i = 0; i < dirtyCount; i++) {
                const name = dirtyNamesScratch[i]!;
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
      // Raw zero-allocation reactive publish (replaces `SubscriptionRef.set`).
      // The two-slot rotation above guarantees `state` stays live + stable for
      // one more tick, so a subscriber that reads it on this same tick sees valid
      // pooled data before it can be recycled.
      publishState(state);
      if (releasable && releasable !== state) pool.release(releasable);
      return state;
    }

    const compositor: CompositorShape = {
      add: <B extends Boundary.Shape>(name: string, quantizer: Quantizer<B>): void => {
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
      },

      remove: (name: string): void => {
        qMap.delete(name);
        metaMap.delete(name);
        nameList = nameList.filter((entry) => entry !== name);
        rebuildDirtyFlags();
        runtime.removeQuantizer(name);
        speculativeEvaluators.delete(name);
        prefetchedStates.delete(name);
        seenEpoch.delete(name);
        computeStateSync();
      },

      compute: (): CompositeState => computeStateSync(),

      setBlendWeights: (name: string, weights: Record<string, number>): void => {
        overrides.set(name, weights);
        if (dirty) {
          dirty.mark(name);
        }
        runtime.markDirty(name);
      },

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

      // `changes` IS the compositor's reactive replay-1 {@link CellKernel},
      // exposed as a read-only subscription surface (`CompositorChanges`): on
      // each `subscribe` the kernel replays the current live state (the replay-1
      // semantics the old `SubscriptionRef.changes` / `Stream.callback` bridge
      // provided) and returns a disposer; every subsequent compose is fanned out
      // synchronously by `publishState`. Delivery is synchronous and never drops
      // or backpressures the compose publish, so every compose reaches every
      // subscriber in order — with no `Queue` and no per-publish allocation.
      // `publish`/`close` are intentionally not reachable through the public
      // view; the compositor is the sole writer and the owning Lifetime closes
      // the kernel on dispose.
      changes: cell,
      runtime,
    };

    const lifetime = Lifetime.make();
    // The compositor's one disposable resource is its reactive `changes` kernel;
    // disposing the Lifetime completes every `changes` subscriber and makes the
    // kernel inert (publish no-ops, subscribe completes immediately).
    lifetime.add(() => {
      cell.close();
    });

    return { compositor, lifetime };
  },
};

export declare namespace Compositor {
  /** Structural shape of a live compositor instance. */
  export type Shape = CompositorShape;
  /** Alias for {@link CompositorConfig}. */
  export type Config = CompositorConfig;
  /** The `{ compositor, lifetime }` pair returned by {@link Compositor.create}. */
  export type Handle = CompositorHandle;
}
