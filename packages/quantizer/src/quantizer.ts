/**
 * Two-step quantizer API: {@link defineQuantizer} authors the immutable,
 * content-addressed {@link QuantizerConfig}; {@link createQuantizer} allocates the
 * live {@link LiveQuantizer} — an {@link OwnedQuantizer} that owns its own teardown
 * via `dispose()` — with reactive output streams.
 *
 * Wired: MotionTier-gated output routing, springToLinearCSS auto-generation,
 * content-address memoization via {@link MemoCache}.
 *
 * @module
 */

import type {
  Boundary,
  StateUnion,
  BoundaryCrossing,
  ContentAddress,
  ReactiveQuantizer,
  OutputsFor,
  HLCBrand,
  Clock,
} from '@liteship/core';
import { HLC, CellKernel, Lifetime, attachLifetime } from '@liteship/core';
import type { MotionTier, QualityTierTarget, AsyncOwnedResource } from '@liteship/core';
import {
  StateName as mkStateName,
  CanonicalCbor,
  Diagnostics,
  Easing,
  fnv1aBytes,
  wallClock,
  projectQualityTiers,
} from '@liteship/core';
import { ValidationError } from '@liteship/error';
import { evaluate } from './evaluate.js';
import type { EvaluateResult } from './evaluate.js';
import { MemoCache } from './memo-cache.js';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Typed accessor for the initial state of a boundary. defineBoundary guarantees
 * the states tuple is non-empty, so `states[0]` is always defined; this contains
 * the one unavoidable cast where a generic index access meets noUncheckedIndexedAccess.
 */
function firstState<B extends Boundary>(boundary: B): StateUnion<B> {
  return boundary.states[0] as StateUnion<B>;
}

// ---------------------------------------------------------------------------
// Output target literal type
// ---------------------------------------------------------------------------

/**
 * Compilation target for quantizer per-state outputs.
 *
 * `css` emits style declarations, `glsl`/`wgsl` emit shader uniforms,
 * `aria` emits accessibility attributes, `ai` emits model-facing signals.
 * MotionTier gates which targets a device is permitted to receive; see
 * {@link DefineQuantizerOptions.tier} for the tier → targets table.
 *
 * Aliases `@liteship/core`'s {@link QualityTierTarget} — the shared codomain of the
 * capability-admissibility quality-tier scale both this gate and the core escalation
 * gate project from — so the target vocabulary itself has a single source too.
 */
export type OutputTarget = QualityTierTarget;

// ---------------------------------------------------------------------------
// MotionTier gating (canonical type from @liteship/core)
// ---------------------------------------------------------------------------

export type { MotionTier } from '@liteship/core';

/**
 * MotionTier → allowed {@link OutputTarget} set — a PROJECTION of `@liteship/core`'s
 * shared capability-admissibility quality-tier scale (`quality-tiers.ts`) onto the
 * `MotionTier` tier order. The core escalation chooser's `TIER_TARGET_SETS` projects
 * the SAME scale onto the `CapTier` order; the two are therefore congruent by
 * construction (a drift guard pins them, computing `expected` from the scale).
 *
 * Higher tiers include lower-tier targets. `none` only allows ARIA; `compute`
 * unlocks every target including WGSL and AI signal routing. `force()` can
 * override this gating per-target for prototype and test scenarios.
 */
export const TIER_TARGETS: Record<MotionTier, ReadonlySet<OutputTarget>> = projectQualityTiers<MotionTier>([
  'none',
  'transitions',
  'animations',
  'physics',
  'compute',
]);

// ---------------------------------------------------------------------------
// Quantizer outputs shape
// ---------------------------------------------------------------------------

/**
 * Per-target output tables keyed by boundary state.
 *
 * Each optional field is a record mapping every state in `B` to a target-
 * specific value shape: CSS allows `string | number`, GLSL/WGSL are numeric
 * only, ARIA is string only, AI is unconstrained. Missing fields simply
 * skip that target during dispatch.
 */
export interface QuantizerOutputs<B extends Boundary> {
  /** CSS property map per state (values are raw CSS, e.g. `'16px'` or `1`). */
  readonly css?: OutputsFor<B, Record<string, string | number>>;
  /** GLSL uniform values per state (numeric only). */
  readonly glsl?: OutputsFor<B, Record<string, number>>;
  /** WGSL uniform values per state (numeric only). */
  readonly wgsl?: OutputsFor<B, Record<string, number>>;
  /** ARIA attribute map per state (string values only). */
  readonly aria?: OutputsFor<B, Record<string, string>>;
  /** AI-facing signals per state (free-form; consumed by LLMAdapter). */
  readonly ai?: OutputsFor<B, Record<string, unknown>>;
}

// ---------------------------------------------------------------------------
// Spring config for CSS auto-generation
// ---------------------------------------------------------------------------

/**
 * Spring physics parameters for CSS easing auto-generation.
 *
 * When a {@link QuantizerConfig} carries a spring, its CSS outputs receive an
 * injected `--liteship-easing` custom property derived via `Easing.springToLinearCSS`
 * so native `linear()` timing matches the physical spring response.
 */
export interface SpringConfig {
  /** Spring constant (force per unit displacement); higher = snappier. */
  readonly stiffness: number;
  /** Damping coefficient; higher = less oscillation. */
  readonly damping: number;
  /** Mass of the animated body; defaults to `1`. */
  readonly mass?: number;
}

// ---------------------------------------------------------------------------
// defineQuantizer options
// ---------------------------------------------------------------------------

/**
 * Options accepted by {@link defineQuantizer} — the authored intent of a quantizer.
 *
 * `outputs` is the required per-target output tables (the sole positional argument
 * of the retired `.outputs(...)` chain step). `tier` gates which output targets get
 * produced (see the table on {@link DefineQuantizerOptions.tier}). `spring` enables
 * automatic CSS `--liteship-easing` injection on CSS outputs. `force` is the
 * per-target escape hatch (the retired `.force(...)` chain step), overriding tier
 * gating for the listed targets. Every field is part of the config's
 * content-addressed identity.
 */
export interface DefineQuantizerOptions<B extends Boundary, O extends QuantizerOutputs<B> = QuantizerOutputs<B>> {
  /** Per-target output tables keyed by boundary state. */
  readonly outputs: O;
  /**
   * MotionTier for output gating; omit to allow all targets.
   *
   * Each tier permits a fixed set of output targets (higher tiers include
   * lower-tier targets):
   *
   * | tier          | allowed targets                     |
   * | ------------- | ----------------------------------- |
   * | `none`        | `aria`                              |
   * | `transitions` | `css`, `aria`                       |
   * | `animations`  | `css`, `aria`                       |
   * | `physics`     | `css`, `glsl`, `aria`               |
   * | `compute`     | `css`, `glsl`, `wgsl`, `aria`, `ai` |
   *
   * Outputs defined for a gated-off target are silently dropped; list the target
   * in `force` to override the gating per target.
   */
  readonly tier?: MotionTier;
  /** Spring config that drives CSS easing generation for CSS outputs. */
  readonly spring?: SpringConfig;
  /** Targets to force-enable regardless of the current tier's gating set. */
  readonly force?: readonly OutputTarget[];
}

// ---------------------------------------------------------------------------
// Per-instantiation runtime injection (clock boundary — NOT config identity)
// ---------------------------------------------------------------------------

/**
 * Runtime injection for {@link createQuantizer}.
 *
 * The crossing `timestamp` is an HLC whose `wall_ms` is epoch ms, so the
 * monotonic clock is the {@link Clock} WALL boundary (`@liteship/core`'s
 * `wallClock`), NOT the monotonic `systemClock`. It is injected here — at
 * instantiation, NOT in {@link DefineQuantizerOptions} — so it never enters the
 * content address (a clock is a volatile boundary, not part of a config's
 * identity; folding it into the address would also be unserializable). Each
 * {@link createQuantizer} call therefore owns a fresh monotonic HLC seeded from
 * `node` and advanced by `clock`: same input + a {@link Clock} of fixed time →
 * identical timestamps regardless of how many other quantizers evaluated first.
 * There is no process-wide HLC.
 */
export interface QuantizerRuntime {
  /**
   * Wall-clock boundary advancing this instance's HLC; defaults to
   * `@liteship/core`'s `wallClock`. Pass a `fixedClock`/`manualClock` for
   * deterministic, replayable crossing timestamps.
   */
  readonly clock?: Clock;
  /** HLC node id seeding this instance's clock; defaults to `'quantizer'`. */
  readonly node?: string;
}

// ---------------------------------------------------------------------------
// Quantizer config (immutable, content-addressed)
// ---------------------------------------------------------------------------

/**
 * Immutable, content-addressed quantizer definition (authored intent).
 *
 * The `id` is an FNV-1a hash over the boundary id, outputs, tier, spring, and
 * forced targets, so two configs with identical definitions share the same
 * address and are deduplicated by the internal memo cache. This is a PURE data
 * definition — pass it to {@link createQuantizer} to materialize a fresh
 * {@link LiveQuantizer} that owns its own teardown via `dispose()`.
 */
export interface QuantizerConfig<B extends Boundary, O extends QuantizerOutputs<B> = QuantizerOutputs<B>> {
  /** Boundary this config quantizes against. */
  readonly boundary: B;
  /** Per-target output tables keyed by state. */
  readonly outputs: O;
  /** Content-addressed identity (FNV-1a of boundary id + outputs + tier + spring + force). */
  readonly id: ContentAddress;
  /** Motion tier gating active targets; see {@link DefineQuantizerOptions.tier} for the tier → targets table. */
  readonly tier?: MotionTier;
  /** Spring config driving CSS easing injection. */
  readonly spring?: SpringConfig;
  /** Targets force-enabled past their tier gate; part of the content address. */
  readonly force?: readonly OutputTarget[];
}

// ---------------------------------------------------------------------------
// Live quantizer (extends base Quantizer with output dispatch)
// ---------------------------------------------------------------------------

/** The resolved per-target output record a {@link LiveQuantizer} dispatches. */
type OutputRecord = Partial<{ [K in OutputTarget]: Record<string, unknown> }>;

/**
 * Runtime-instantiated quantizer with reactive output dispatch.
 *
 * Extends the core {@link ReactiveQuantizer} with a reactive outputs table: as
 * boundary crossings are detected, the outputs {@link CellKernel} publishes the
 * new per-target record, readable via `currentOutputs.read()` and observable via
 * `outputChanges.subscribe(sink)` (replay-1: a new subscriber is replayed the
 * current outputs on attach). Both views are the same underlying replay-1 kernel.
 *
 * @example
 * ```ts
 * import { defineBoundary } from '@liteship/core';
 * import { defineQuantizer, createQuantizer } from '@liteship/quantizer';
 *
 * const b = defineBoundary({
 *   input: 'w',
 *   at: [[0, 'sm'], [768, 'lg']],
 * });
 * const config = defineQuantizer(b, {
 *   outputs: { css: { sm: { fontSize: '14px' }, lg: { fontSize: '18px' } } },
 * });
 * const live = createQuantizer(config);
 * live.evaluate(900); // triggers crossing; outputs kernel publishes CSS
 * await live.dispose();
 * ```
 */
export interface LiveQuantizer<
  B extends Boundary,
  O extends QuantizerOutputs<B> = QuantizerOutputs<B>,
> extends ReactiveQuantizer<B> {
  /** The config this quantizer was created from. */
  readonly config: QuantizerConfig<B, O>;
  /** Read the currently-active per-target output record (replay-1 read side). */
  readonly currentOutputs: Pick<CellKernel.Replay<OutputRecord>, 'read' | 'subscribe' | 'closed' | 'size'>;
  /** Per-target output records emitted on each boundary crossing (replay-1 subscribe side). */
  readonly outputChanges: Pick<CellKernel.Replay<OutputRecord>, 'subscribe' | 'read' | 'closed' | 'size'>;
}

/**
 * A live reactive quantizer that owns its teardown directly
 * ({@link AsyncOwnedResource}): `await quantizer.dispose()` closes the state /
 * outputs / crossings kernels (completing subscribers, making publish inert). The
 * owning {@link Lifetime} stays reachable as `quantizer.lifetime` for advanced
 * composition (e.g. threading it into an {@link AnimatedQuantizer}).
 */
export type OwnedQuantizer<B extends Boundary, O extends QuantizerOutputs<B> = QuantizerOutputs<B>> = LiveQuantizer<
  B,
  O
> &
  AsyncOwnedResource;

type CachedQuantizerConfig = QuantizerConfig<Boundary, QuantizerOutputs<Boundary>>;

// ---------------------------------------------------------------------------
// Content-address via the ONE canonical encoder (CUT B1): CanonicalCbor (RFC
// 8949 §4.2.1, always-float64) + FNV-1a. Identity-bearing fnv1a addresses must
// NOT be minted through cborg (smallest-float) — see tests/unit/core/
// canonical-identity.test.ts for the divergence that made this a substrate bug.
// ---------------------------------------------------------------------------

/**
 * Config identity covers EVERYTHING the cached config closes over: boundary,
 * outputs, tier (gates `allowedTargets`), spring (drives `--liteship-easing`),
 * and forced targets. Omitting any of these lets the first config minted
 * for a boundary+outputs pair poison later configs built with different
 * options — the same outputs at `tier: 'physics'` would silently reuse a
 * `tier: 'transitions'` config and never emit glsl.
 */
function contentAddress<B extends Boundary, O extends QuantizerOutputs<B>>(
  boundary: B,
  outputs: O,
  tier: MotionTier | undefined,
  spring: SpringConfig | undefined,
  forcedTargets: ReadonlySet<OutputTarget> | null,
): ContentAddress {
  const payload = {
    boundaryId: boundary.id,
    outputs,
    tier: tier ?? null,
    spring: spring ? { stiffness: spring.stiffness, damping: spring.damping, mass: spring.mass ?? 1 } : null,
    force: forcedTargets ? [...forcedTargets].sort() : null,
  };
  return fnv1aBytes(CanonicalCbor.encode(payload));
}

/**
 * Output-cache identity: a derived tuple minted as a true fnv1a ContentAddress.
 * `configId` already covers tier/spring/force, so `{configId, state}` is the
 * complete identity of a resolved output table.
 */
function outputCacheAddress(configId: ContentAddress, state: string): ContentAddress {
  return fnv1aBytes(
    CanonicalCbor.encode({
      configId,
      state,
    }),
  );
}

// ---------------------------------------------------------------------------
// Memoization caches
// ---------------------------------------------------------------------------

const configCache = MemoCache.make<CachedQuantizerConfig>();
const outputCache = MemoCache.make<Partial<{ [K in OutputTarget]: Record<string, unknown> }>>();
const springCSSCache = new Map<string, string>();

// ---------------------------------------------------------------------------
// Resolve outputs for the current state, gated by tier
// ---------------------------------------------------------------------------

/**
 * Read `outputs[target][state]` through the target-agnostic shape
 * `Record<string, Record<string, unknown>>`. Each QuantizerOutputs target
 * has a different value type (CSS allows `string | number`, GLSL is
 * number-only, etc.), so indexing at the `OutputTarget` union level
 * produces a wide union that TS cannot collapse. This helper performs
 * the one bridging cast so callers stay type-clean.
 */
function readTargetState<B extends Boundary, O extends QuantizerOutputs<B>>(
  outputs: O,
  target: OutputTarget,
  state: StateUnion<B>,
): Record<string, unknown> | undefined {
  const table = outputs[target] as Record<string, Record<string, unknown>> | undefined;
  return table?.[state as string];
}

function resolveOutputs<B extends Boundary, O extends QuantizerOutputs<B>>(
  outputs: O,
  state: StateUnion<B>,
  allowedTargets: ReadonlySet<OutputTarget> | null,
  forcedTargets: ReadonlySet<OutputTarget> | null,
  configId: ContentAddress,
  springCSS: string | null,
): Partial<{ [K in OutputTarget]: Record<string, unknown> }> {
  // Check output cache
  const cacheKey = outputCacheAddress(configId, state as string);
  const cached = outputCache.get(cacheKey);
  if (cached) return cached;

  const result: Partial<{ [K in OutputTarget]: Record<string, unknown> }> = {};
  const targets: OutputTarget[] = ['css', 'glsl', 'wgsl', 'aria', 'ai'];

  for (const target of targets) {
    // Check tier gating
    if (allowedTargets !== null && !allowedTargets.has(target)) {
      // Check force escape hatch
      if (forcedTargets === null || !forcedTargets.has(target)) {
        continue;
      }
    }

    const stateOutputs = readTargetState(outputs, target, state);
    if (stateOutputs !== undefined) {
      if (target === 'css' && springCSS) {
        // Inject the spring easing CSS custom property alongside CSS outputs
        result[target] = { ...stateOutputs, '--liteship-easing': springCSS };
      } else {
        result[target] = stateOutputs;
      }
    }
  }

  outputCache.set(cacheKey, result);
  return result;
}

// ---------------------------------------------------------------------------
// Spring CSS computation with caching
// ---------------------------------------------------------------------------

function getSpringCSS(spring: SpringConfig): string {
  const key = `${spring.stiffness}:${spring.damping}:${spring.mass ?? 1}`;
  let css = springCSSCache.get(key);
  if (!css) {
    css = Easing.springToLinearCSS(spring);
    springCSSCache.set(key, css);
  }
  return css;
}

// ---------------------------------------------------------------------------
// defineQuantizer(boundary, options) — author the immutable config
// ---------------------------------------------------------------------------

/**
 * Author a content-addressed {@link QuantizerConfig} from a boundary definition
 * and its per-target outputs — the PURE, immutable definition (authored intent).
 *
 * This performs validation and content-addressing up front: an unknown `tier`
 * throws, tier-gated outputs warn once at definition time, and the config is
 * memoized by its content address (identical definitions return the SAME object).
 * Pass the result to {@link createQuantizer} to materialize a live reactive instance.
 *
 * @example
 * ```ts
 * import { defineBoundary } from '@liteship/core';
 * import { defineQuantizer, createQuantizer } from '@liteship/quantizer';
 *
 * const boundary = defineBoundary({
 *   input: 'width',
 *   at: [[0, 'sm'], [640, 'md'], [1024, 'lg']],
 * });
 * const config = defineQuantizer(boundary, {
 *   outputs: { css: { sm: { fontSize: '14px' }, md: { fontSize: '16px' }, lg: { fontSize: '18px' } } },
 * });
 * const live = createQuantizer(config);
 * const result = live.evaluate(800); // 'md'
 * await live.dispose();
 * ```
 *
 * @param boundary - The boundary definition to quantize against
 * @param options  - The `outputs` tables plus optional `tier`, `spring`, and `force`
 * @returns The immutable, content-addressed {@link QuantizerConfig}
 */
export function defineQuantizer<B extends Boundary, O extends QuantizerOutputs<B>>(
  boundary: B,
  options: DefineQuantizerOptions<B, O>,
): QuantizerConfig<B, O> {
  const { outputs, spring, force } = options;
  const tier = options.tier;
  // Failing open on an invalid tier would disable gating entirely and allow
  // every target (including ai/wgsl) — the inverse of what gating is for.
  if (tier !== undefined && !(tier in TIER_TARGETS)) {
    throw ValidationError(
      'defineQuantizer',
      `unknown MotionTier '${String(tier)}'. Valid tiers: ${Object.keys(TIER_TARGETS).join(', ')}. Omit \`tier\` to allow all targets.`,
    );
  }
  const allowedTargets = tier ? TIER_TARGETS[tier] : null;
  const forcedTargets: Set<OutputTarget> | null = force ? new Set(force) : null;

  if (allowedTargets !== null && tier !== undefined) {
    // Outputs for a tier-gated target silently never fire; say so once at
    // definition time with the literal escape hatches.
    for (const target of Object.keys(outputs) as readonly OutputTarget[]) {
      if (outputs[target] === undefined || allowedTargets.has(target) || forcedTargets?.has(target)) continue;
      Diagnostics.warnOnce({
        source: 'liteship/quantizer',
        code: 'tier-gated-output-dropped',
        message: `you defined \`${target}\` outputs but tier '${tier}' only emits ${[...allowedTargets].join('+')}, so they will never fire. Pass a tier that includes ${target} to defineQuantizer(boundary, { tier }), or add '${target}' to the \`force\` option.`,
      });
    }
  }

  const id = contentAddress(boundary, outputs, tier, spring, forcedTargets);

  // Content-address memoization: identical definitions share one object.
  const cachedConfig = configCache.get(id);
  if (cachedConfig) return cachedConfig as QuantizerConfig<B, O>;

  const config: QuantizerConfig<B, O> = {
    boundary,
    outputs,
    id,
    tier,
    spring,
    force,
  };
  configCache.set(id, config);
  return config;
}

// ---------------------------------------------------------------------------
// createQuantizer(definition) — allocate the live reactive instance
// ---------------------------------------------------------------------------

/**
 * Allocate a live {@link LiveQuantizer} from an immutable {@link QuantizerConfig}
 * definition, paired with the {@link Lifetime} that owns its teardown.
 *
 * The instance evaluates numeric input values against the boundary's thresholds,
 * dispatches state transitions, and routes per-state outputs (CSS, GLSL, WGSL,
 * ARIA, AI) gated by MotionTier. Disposing the lifetime closes the state /
 * outputs / crossings kernels (completing every subscriber and making publish
 * inert).
 *
 * Pass a {@link QuantizerRuntime} to inject the wall-clock boundary that advances
 * this instance's monotonic crossing HLC; omit it to default to `@liteship/core`'s
 * `wallClock`. The clock is per-instantiation, never part of the cached config's
 * identity.
 *
 * @example
 * ```ts
 * import { defineBoundary } from '@liteship/core';
 * import { defineQuantizer, createQuantizer } from '@liteship/quantizer';
 *
 * const boundary = defineBoundary({
 *   input: 'width',
 *   at: [[0, 'sm'], [768, 'lg']],
 * });
 * const config = defineQuantizer(boundary, {
 *   outputs: { css: { sm: { display: 'block' }, lg: { display: 'grid' } } },
 * });
 * const live = createQuantizer(config);
 * live.evaluate(1024);
 * const result = live.currentOutputs.read();
 * // result.css => { display: 'grid' }
 * await live.dispose();
 * ```
 *
 * @param definition - The immutable config authored by {@link defineQuantizer}
 * @param runtime    - Optional per-instantiation clock / HLC node injection
 * @returns An {@link OwnedQuantizer} — the live instance that owns its own teardown via `dispose()`
 */
export function createQuantizer<B extends Boundary, O extends QuantizerOutputs<B>>(
  definition: QuantizerConfig<B, O>,
  runtime?: QuantizerRuntime,
): OwnedQuantizer<B, O> {
  const { boundary, outputs, id, tier, spring, force } = definition;
  const allowedTargets = tier ? TIER_TARGETS[tier] : null;
  const forcedTargets: ReadonlySet<OutputTarget> | null = force ? new Set(force) : null;
  // Recompute (getSpringCSS is memoized): the easing string is derived reactive
  // value, not part of the config's authored identity, so it lives on the instance.
  const springCSS = spring && outputs.css ? getSpringCSS(spring) : null;

  // Per-instantiation monotonic clock: this live quantizer OWNS its HLC,
  // so its crossing timestamps depend only on its own evaluate() calls
  // and the injected wall-clock boundary — never on how many other
  // quantizers evaluated first in this process. No module global.
  const tickClock: Clock = runtime?.clock ?? wallClock;
  let hlc = HLC.create(runtime?.node ?? 'quantizer');

  // defineBoundary guarantees non-empty states; head access widens to StateUnion<B>.
  const initialState: StateUnion<B> = firstState(boundary);
  const initialOutputs = resolveOutputs(outputs, initialState, allowedTargets, forcedTargets, id, springCSS);

  // Reactive substrate on the extracted CellKernel (was SubscriptionRef /
  // Queue): a replay-1 current-state slot, a replay-1 outputs slot (its
  // `subscribe` gives the outputChanges replay-1 stream, its `read` the
  // currentOutputs read), and a no-replay crossing fan-out. The owning
  // Lifetime closes all three on dispose (replacing the Effect scope).
  const stateCell = CellKernel.replay1<StateUnion<B>>(initialState);
  const outputCell = CellKernel.replay1<OutputRecord>(initialOutputs);
  const crossingChannel = CellKernel.fanout<BoundaryCrossing<StateUnion<B> & string>>();

  const lifetime = Lifetime.make();
  lifetime.add(() => {
    // Close ALL three channels even if one channel's completion pass throws
    // (a `complete` callback can throw, and `CellKernel.close` rethrows the
    // first fault per the sink-error law). A bare sequential
    // `stateCell.close(); outputCell.close(); crossingChannel.close();` would
    // let the first throw STRAND the later channels open, so a still-open
    // channel could keep publishing to subscribers that were never completed.
    // Complete every channel, then rethrow the first fault (same law the
    // kernel's own `close` applies to its sinks).
    let firstFault: { readonly error: unknown } | undefined;
    for (const closeChannel of [stateCell.close, outputCell.close, crossingChannel.close]) {
      try {
        closeChannel();
      } catch (error) {
        if (firstFault === undefined) firstFault = { error };
      }
    }
    if (firstFault !== undefined) throw firstFault.error;
  });

  let previousState: StateUnion<B> = initialState;

  const quantizer: LiveQuantizer<B, O> = {
    _tag: 'Quantizer',
    boundary,
    config: definition,
    state: stateCell,
    stateSync: () => previousState,
    changes: crossingChannel,

    evaluate(value: number): StateUnion<B> {
      // Disposed → the state/outputs/crossing kernels are closed and their publishes
      // are inert; advancing `previousState`/HLC here would diverge `stateSync()` (and
      // this return) from the frozen `state.read()`/`currentOutputs.read()` — and a
      // disposed-but-referenced quantizer would report an advancing discrete state its
      // own reactive channel never emits (Compositor.computeStateSync reads stateSync()).
      // Freeze at the last committed state.
      if (lifetime.disposed) return previousState;
      const result: EvaluateResult<StateUnion<B> & string> = evaluate(boundary, value, previousState);

      if (result.crossed) {
        // Live crossing stamp: HLC wall_ms is epoch ms (the protocol
        // defines it as ≈ Date.now()), so advance through the injected
        // wall-clock boundary (`tickClock`, defaulting to wallClock) —
        // the epoch entropy boundary — not the monotonic systemClock.
        // `hlc` is this instance's own clock, so the stamp is a
        // function of this quantizer's crossings alone.
        hlc = HLC.increment(hlc, tickClock.now());
        const crossing: BoundaryCrossing<StateUnion<B> & string> = {
          from: mkStateName<StateUnion<B> & string>(previousState),
          to: mkStateName(result.state),
          timestamp: hlc satisfies HLCBrand,
          value,
        };
        previousState = result.state;

        const newOutputs = resolveOutputs(outputs, result.state, allowedTargets, forcedTargets, id, springCSS);
        // Publish state + outputs + crossing as ONE consistent advance (were
        // `Effect.runSync(Effect.all([...]))` + `Queue.offerUnsafe`). The kernel
        // fan-out is fail-fast, so a bare sequential publish would let a throwing
        // subscriber on the first channel ABORT before the later channels advance —
        // stranding `currentOutputs`/`changes` on the old state while `previousState`
        // has already moved (an inconsistent public view that can strand a
        // crossing-driven AnimatedQuantizer). Attempt all three, then rethrow the
        // first listener fault — the same sink-error law the disposal path applies.
        let publishFault: { readonly error: unknown } | undefined;
        for (const publish of [
          (): void => stateCell.publish(result.state),
          (): void => outputCell.publish(newOutputs),
          (): void => crossingChannel.publish(crossing),
        ]) {
          try {
            publish();
          } catch (error) {
            if (publishFault === undefined) publishFault = { error };
          }
        }
        if (publishFault !== undefined) throw publishFault.error;
      }

      return result.state;
    },

    currentOutputs: outputCell,
    outputChanges: outputCell,
  };

  return attachLifetime(quantizer, lifetime);
}
