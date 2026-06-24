/**
 * `Q.from(boundary).outputs({ ... })` builder API.
 * Creates {@link QuantizerConfig} with content-addressed identity, and
 * {@link LiveQuantizer} with reactive output streams.
 *
 * Wired: MotionTier-gated output routing, springToLinearCSS auto-generation,
 * content-address memoization via {@link MemoCache}.
 *
 * @module
 */

import type { Scope } from 'effect';
import { Effect, Stream, SubscriptionRef, Queue } from 'effect';
import type {
  Boundary,
  StateUnion,
  BoundaryCrossing,
  ContentAddress,
  Quantizer,
  OutputsFor,
  HLCBrand,
  Clock,
} from '@czap/core';
import { HLC } from '@czap/core';
import type { MotionTier, LadderTarget } from '@czap/core';
import {
  StateName as mkStateName,
  CanonicalCbor,
  Diagnostics,
  Easing,
  fnv1aBytes,
  wallClock,
  projectLadder,
} from '@czap/core';
import { ValidationError } from '@czap/error';
import { evaluate } from './evaluate.js';
import type { EvaluateResult } from './evaluate.js';
import { MemoCache } from './memo-cache.js';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Typed accessor for the initial state of a boundary. Boundary.make guarantees
 * the states tuple is non-empty, so `states[0]` is always defined; this contains
 * the one unavoidable cast where a generic index access meets noUncheckedIndexedAccess.
 */
function firstState<B extends Boundary.Shape>(boundary: B): StateUnion<B> {
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
 * {@link QuantizerFromOptions.tier} for the tier → targets table.
 *
 * Aliases `@czap/core`'s {@link LadderTarget} — the shared codomain of the
 * capability-admissibility ladder both this gate and the core escalation gate
 * project from — so the target vocabulary itself has a single source too.
 */
export type OutputTarget = LadderTarget;

// ---------------------------------------------------------------------------
// MotionTier gating (canonical type from @czap/core)
// ---------------------------------------------------------------------------

export type { MotionTier } from '@czap/core';

/**
 * MotionTier → allowed {@link OutputTarget} set — a PROJECTION of `@czap/core`'s
 * shared capability-admissibility ladder (`cap-ladder.ts`) onto the `MotionTier`
 * rung order. The core escalation chooser's `RUNG_TARGETS` projects the SAME
 * ladder onto the `CapTier` order; the two are therefore congruent by
 * construction (a drift guard pins them, computing `expected` from the ladder).
 *
 * Higher tiers include lower-tier targets. `none` only allows ARIA; `compute`
 * unlocks every target including WGSL and AI signal routing. `force()` can
 * override this gating per-target for prototype and test scenarios.
 */
export const TIER_TARGETS: Record<MotionTier, ReadonlySet<OutputTarget>> = projectLadder<MotionTier>([
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
export interface QuantizerOutputs<B extends Boundary.Shape> {
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
 * injected `--czap-easing` custom property derived via `Easing.springToLinearCSS`
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
// Builder options
// ---------------------------------------------------------------------------

/**
 * Options accepted by {@link Q.from}.
 *
 * `tier` gates which output targets get produced (see the table on
 * {@link QuantizerFromOptions.tier}).
 * `spring` enables automatic CSS `--czap-easing` injection on CSS outputs.
 */
export interface QuantizerFromOptions {
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
   * Outputs defined for a gated-off target are silently dropped;
   * `.force(...targets)` overrides the gating per target.
   */
  readonly tier?: MotionTier;
  /** Spring config that drives CSS easing generation for CSS outputs. */
  readonly spring?: SpringConfig;
}

// ---------------------------------------------------------------------------
// Per-instantiation runtime injection (clock boundary — NOT config identity)
// ---------------------------------------------------------------------------

/**
 * Runtime injection for {@link QuantizerConfig.create}.
 *
 * The crossing `timestamp` is an HLC whose `wall_ms` is epoch ms, so the
 * monotonic clock is the {@link Clock} WALL boundary (`@czap/core`'s
 * `wallClock`), NOT the monotonic `systemClock`. It is injected here — at
 * instantiation, NOT in {@link QuantizerFromOptions} — so it never enters the
 * content address (a clock is a volatile boundary, not part of a config's
 * identity; folding it into the address would also be unserializable). Each
 * `create()` call therefore owns a fresh monotonic HLC seeded from `node` and
 * advanced by `clock`: same input + a {@link Clock} of fixed time → identical
 * timestamps regardless of how many other quantizers evaluated first. There is
 * no process-wide HLC.
 */
export interface QuantizerRuntime {
  /**
   * Wall-clock boundary advancing this instance's HLC; defaults to
   * `@czap/core`'s `wallClock`. Pass a `fixedClock`/`manualClock` for
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
 * Immutable, content-addressed quantizer definition.
 *
 * The `id` is an FNV-1a hash over the boundary id and outputs, so two
 * configs with identical definitions share the same address and are
 * deduplicated by the internal memo cache. `create()` materializes a
 * fresh {@link LiveQuantizer} within an Effect scope.
 */
export interface QuantizerConfig<B extends Boundary.Shape, O extends QuantizerOutputs<B> = QuantizerOutputs<B>> {
  /** Boundary this config quantizes against. */
  readonly boundary: B;
  /** Per-target output tables keyed by state. */
  readonly outputs: O;
  /** Content-addressed identity (FNV-1a of boundary id + outputs). */
  readonly id: ContentAddress;
  /** Motion tier gating active targets; see {@link QuantizerFromOptions.tier} for the tier → targets table. */
  readonly tier?: MotionTier;
  /** Spring config driving CSS easing injection. */
  readonly spring?: SpringConfig;
  /**
   * Instantiate a reactive {@link LiveQuantizer} scoped to an Effect fiber.
   *
   * Pass a {@link QuantizerRuntime} to inject the wall-clock boundary that
   * advances this instance's monotonic crossing HLC; omit it to default to
   * `@czap/core`'s `wallClock`. The clock is per-instantiation, never part of
   * the cached config's identity.
   */
  create(runtime?: QuantizerRuntime): Effect.Effect<LiveQuantizer<B, O>, never, Scope.Scope>;
}

// ---------------------------------------------------------------------------
// Live quantizer (extends base Quantizer with output dispatch)
// ---------------------------------------------------------------------------

/**
 * Runtime-instantiated quantizer with reactive output dispatch.
 *
 * Extends the core {@link Quantizer} with a reactive outputs table: as
 * boundary crossings are detected, `currentOutputs` updates and
 * `outputChanges` streams the new per-target record. Consumers typically
 * subscribe via `Stream.runForEach(liveQuantizer.outputChanges, …)`.
 *
 * @example
 * ```ts
 * import { Boundary } from '@czap/core';
 * import { Q } from '@czap/quantizer';
 * import { Effect, Stream } from 'effect';
 *
 * const b = Boundary.make({
 *   input: 'w',
 *   at: [[0, 'sm'], [768, 'lg']],
 * });
 * const config = Q.from(b).outputs({
 *   css: { sm: { fontSize: '14px' }, lg: { fontSize: '18px' } },
 * });
 * Effect.runSync(Effect.scoped(Effect.gen(function* () {
 *   const live = yield* config.create();
 *   live.evaluate(900); // triggers crossing; outputs stream emits CSS
 * })));
 * ```
 */
export interface LiveQuantizer<
  B extends Boundary.Shape,
  O extends QuantizerOutputs<B> = QuantizerOutputs<B>,
> extends Quantizer<B> {
  /** The config this quantizer was created from. */
  readonly config: QuantizerConfig<B, O>;
  /** Read the currently-active per-target output record. */
  readonly currentOutputs: Effect.Effect<Partial<{ [K in OutputTarget]: Record<string, unknown> }>>;
  /** Stream of per-target output records emitted on each boundary crossing. */
  readonly outputChanges: Stream.Stream<Partial<{ [K in OutputTarget]: Record<string, unknown> }>>;
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

/**
 * Fluent builder returned by {@link Q.from}.
 *
 * Call `.outputs({ ... })` to produce a content-addressed
 * {@link QuantizerConfig}, optionally preceded by `.force(targets)` to
 * override MotionTier gating for specific targets (e.g., enabling AI
 * signals at the `none` tier for testing).
 */
export interface QuantizerBuilder<B extends Boundary.Shape> {
  /** Attach per-target output tables and produce a {@link QuantizerConfig}. */
  outputs<O extends QuantizerOutputs<B>>(outputs: O): QuantizerConfig<B, O>;
  /** Force-enable specific targets regardless of the current tier's gating set. */
  force(...targets: OutputTarget[]): QuantizerBuilder<B>;
}

type CachedQuantizerConfig = QuantizerConfig<Boundary.Shape, QuantizerOutputs<Boundary.Shape>>;

// ---------------------------------------------------------------------------
// Content-address via the ONE canonical encoder (CUT B1): CanonicalCbor (RFC
// 8949 §4.2.1, always-float64) + FNV-1a. Identity-bearing fnv1a addresses must
// NOT be minted through cborg (smallest-float) — see tests/unit/core/
// canonical-identity.test.ts for the divergence that made this a substrate bug.
// ---------------------------------------------------------------------------

/**
 * Config identity covers EVERYTHING the cached config closes over: boundary,
 * outputs, tier (gates `allowedTargets`), spring (drives `--czap-easing`),
 * and `force()` targets. Omitting any of these lets the first config minted
 * for a boundary+outputs pair poison later configs built with different
 * options — the same outputs at `tier: 'physics'` would silently reuse a
 * `tier: 'transitions'` config and never emit glsl.
 */
function contentAddress<B extends Boundary.Shape, O extends QuantizerOutputs<B>>(
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
function readTargetState<B extends Boundary.Shape, O extends QuantizerOutputs<B>>(
  outputs: O,
  target: OutputTarget,
  state: StateUnion<B>,
): Record<string, unknown> | undefined {
  const table = outputs[target] as Record<string, Record<string, unknown>> | undefined;
  return table?.[state as string];
}

function resolveOutputs<B extends Boundary.Shape, O extends QuantizerOutputs<B>>(
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
        result[target] = { ...stateOutputs, '--czap-easing': springCSS };
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
// Q.from(boundary) builder factory
// ---------------------------------------------------------------------------

/**
 * Create a quantizer builder from a boundary definition.
 *
 * Starts a fluent chain: `Q.from(boundary).outputs({...})` produces a
 * content-addressed `QuantizerConfig` whose `.create()` method yields a
 * reactive `LiveQuantizer` inside an Effect scope.
 *
 * @example
 * ```ts
 * import { Boundary } from '@czap/core';
 * import { Q } from '@czap/quantizer';
 * import { Effect } from 'effect';
 *
 * const boundary = Boundary.make({
 *   input: 'width',
 *   at: [[0, 'sm'], [640, 'md'], [1024, 'lg']],
 * });
 * const config = Q.from(boundary).outputs({
 *   css: { sm: { fontSize: '14px' }, md: { fontSize: '16px' }, lg: { fontSize: '18px' } },
 * });
 * const state = Effect.scoped(
 *   Effect.gen(function* () {
 *     const live = yield* config.create();
 *     return live.evaluate(800); // 'md'
 *   }),
 * );
 * const result = Effect.runSync(state);
 * ```
 *
 * @param boundary - The boundary definition to quantize against
 * @param options  - Optional motion tier and spring configuration
 * @returns A {@link QuantizerBuilder} for chaining `.outputs()` and `.force()`
 */
function fromBoundary<B extends Boundary.Shape>(boundary: B, options?: QuantizerFromOptions): QuantizerBuilder<B> {
  const tier = options?.tier;
  // Failing open on an invalid tier would disable gating entirely and allow
  // every target (including ai/wgsl) — the inverse of what gating is for.
  if (tier !== undefined && !(tier in TIER_TARGETS)) {
    throw ValidationError(
      'Q.from',
      `unknown MotionTier '${String(tier)}'. Valid tiers: ${Object.keys(TIER_TARGETS).join(', ')}. Omit \`tier\` to allow all targets.`,
    );
  }
  const spring = options?.spring;
  const allowedTargets = tier ? TIER_TARGETS[tier] : null;
  let forcedTargets: Set<OutputTarget> | null = null;

  const builder: QuantizerBuilder<B> = {
    outputs<O extends QuantizerOutputs<B>>(outputs: O): QuantizerConfig<B, O> {
      const frozenForced = forcedTargets;
      if (allowedTargets !== null && tier !== undefined) {
        // Outputs for a tier-gated target silently never fire; say so once at
        // build time with the literal escape hatches.
        for (const target of Object.keys(outputs) as readonly OutputTarget[]) {
          if (outputs[target] === undefined || allowedTargets.has(target) || frozenForced?.has(target)) continue;
          Diagnostics.warnOnce({
            source: 'czap/quantizer',
            code: 'tier-gated-output-dropped',
            message: `you defined \`${target}\` outputs but tier '${tier}' only emits ${[...allowedTargets].join('+')}, so they will never fire. Pass a tier that includes ${target} to Q.from(boundary, { tier }), or chain .force('${target}').`,
          });
        }
      }
      const id = contentAddress(boundary, outputs, tier, spring, frozenForced);

      // Check config cache
      const cachedConfig = configCache.get(id);
      if (cachedConfig) return cachedConfig as QuantizerConfig<B, O>;

      // Compute spring CSS if spring config present and CSS outputs exist
      const springCSS = spring && outputs.css ? getSpringCSS(spring) : null;

      const config: QuantizerConfig<B, O> = {
        boundary,
        outputs,
        id,
        tier,
        spring,
        create(runtime?: QuantizerRuntime): Effect.Effect<LiveQuantizer<B, O>, never, Scope.Scope> {
          // Per-instantiation monotonic clock: this live quantizer OWNS its HLC,
          // so its crossing timestamps depend only on its own evaluate() calls
          // and the injected wall-clock boundary — never on how many other
          // quantizers evaluated first in this process. No module global.
          const tickClock: Clock = runtime?.clock ?? wallClock;
          let hlc = HLC.create(runtime?.node ?? 'quantizer');
          return Effect.gen(function* () {
            // Boundary.make guarantees non-empty states; head access widens to StateUnion<B>.
            const initialState: StateUnion<B> = firstState(boundary);
            const initialOutputs = resolveOutputs(outputs, initialState, allowedTargets, frozenForced, id, springCSS);

            const stateRef = yield* SubscriptionRef.make(initialState);
            const outputRef = yield* SubscriptionRef.make(initialOutputs);

            const crossingQueue = yield* Queue.unbounded<BoundaryCrossing<StateUnion<B> & string>>();

            let previousState: StateUnion<B> = initialState;
            const crossingStream: Stream.Stream<BoundaryCrossing<StateUnion<B> & string>> =
              Stream.fromQueue(crossingQueue);

            const liveQuantizer: LiveQuantizer<B, O> = {
              _tag: 'Quantizer',
              boundary,
              config,
              state: SubscriptionRef.get(stateRef),
              stateSync: () => previousState,
              changes: crossingStream,

              evaluate(value: number): StateUnion<B> {
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

                  const newOutputs = resolveOutputs(outputs, result.state, allowedTargets, frozenForced, id, springCSS);
                  Effect.runSync(
                    Effect.all([
                      SubscriptionRef.set(stateRef, result.state),
                      SubscriptionRef.set(outputRef, newOutputs),
                    ]),
                  );
                  Queue.offerUnsafe(crossingQueue, crossing);
                }

                return result.state;
              },

              currentOutputs: SubscriptionRef.get(outputRef),
              outputChanges: SubscriptionRef.changes(outputRef),
            };

            return liveQuantizer;
          });
        },
      };

      configCache.set(id, config);
      forcedTargets = null;
      return config;
    },

    force(...targets: OutputTarget[]): QuantizerBuilder<B> {
      forcedTargets = new Set(targets);
      return builder;
    },
  };

  return builder;
}

/**
 * Quantizer builder namespace.
 *
 * `Q.from(boundary)` starts a fluent builder that produces a content-addressed
 * {@link QuantizerConfig}. Calling `config.create()` within an Effect scope
 * yields a reactive {@link LiveQuantizer} that evaluates numeric input values
 * against boundary thresholds, dispatches state transitions, and routes
 * per-state outputs (CSS, GLSL, WGSL, ARIA, AI) gated by MotionTier.
 *
 * @example
 * ```ts
 * import { Boundary } from '@czap/core';
 * import { Q } from '@czap/quantizer';
 * import { Effect } from 'effect';
 *
 * const boundary = Boundary.make({
 *   input: 'width',
 *   at: [[0, 'sm'], [768, 'lg']],
 * });
 * const config = Q.from(boundary).outputs({
 *   css: { sm: { display: 'block' }, lg: { display: 'grid' } },
 * });
 * const result = Effect.runSync(Effect.scoped(
 *   Effect.gen(function* () {
 *     const live = yield* config.create();
 *     live.evaluate(1024);
 *     return yield* live.currentOutputs;
 *   }),
 * ));
 * // result.css => { display: 'grid' }
 * ```
 */
export const Q = {
  from: fromBoundary,
} as const;
