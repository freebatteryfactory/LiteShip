/**
 * @liteship/quantizer type spine -- boundary detection, multi-target dispatch, animation.
 */

import type {
  Boundary,
  StateUnion,
  ContentAddress,
  Easing,
  Millis,
  Quantizer,
  ReactiveQuantizer,
  OutputsFor,
  MotionTier,
  Scheduler,
  CellKernel,
  Lifetime,
  Clock,
} from './core.d.ts';

// MotionTier canonical declaration lives in core.d.ts; re-exported here so
// `@liteship/_spine` consumers reading the quantizer surface still see it on
// this sub-spine without an extra import.
export type { MotionTier };

// ═══════════════════════════════════════════════════════════════════════════════
// § 1. QUANTIZER API (defineQuantizer(boundary, { outputs }) → createQuantizer(config))
// ═══════════════════════════════════════════════════════════════════════════════

export type OutputTarget = 'css' | 'glsl' | 'wgsl' | 'aria' | 'ai';

export interface SpringConfig {
  readonly stiffness: number;
  readonly damping: number;
  readonly mass?: number;
}

export interface DefineQuantizerOptions<B extends Boundary, O extends QuantizerOutputs<B> = QuantizerOutputs<B>> {
  readonly outputs: O;
  readonly tier?: MotionTier;
  readonly spring?: SpringConfig;
  readonly force?: readonly OutputTarget[];
}

/**
 * Per-instantiation runtime injection for {@link createQuantizer}: the wall-clock
 * boundary advancing this instance's monotonic crossing HLC (defaults to
 * `wallClock`) and the HLC node id. Injected at instantiation, never part of the
 * cached config's content-addressed identity.
 */
export interface QuantizerRuntime {
  readonly clock?: Clock;
  readonly node?: string;
}

export declare const TIER_TARGETS: Record<MotionTier, ReadonlySet<OutputTarget>>;

export interface QuantizerOutputs<B extends Boundary> {
  readonly css?: OutputsFor<B, Record<string, string | number>>;
  readonly glsl?: OutputsFor<B, Record<string, number>>;
  readonly wgsl?: OutputsFor<B, Record<string, number>>;
  readonly aria?: OutputsFor<B, Record<string, string>>;
  readonly ai?: OutputsFor<B, Record<string, unknown>>;
}

/** The resolved per-target output record a {@link LiveQuantizer} dispatches. */
type OutputRecord = Partial<{ [K in OutputTarget]: Record<string, unknown> }>;

/**
 * Immutable, content-addressed quantizer definition (authored intent). Pass it to
 * {@link createQuantizer} to materialize a live {@link LiveQuantizer} paired with
 * the {@link Lifetime} that owns its teardown.
 */
export interface QuantizerConfig<B extends Boundary, O extends QuantizerOutputs<B> = QuantizerOutputs<B>> {
  readonly boundary: B;
  readonly outputs: O;
  readonly id: ContentAddress;
  readonly tier?: MotionTier;
  readonly spring?: SpringConfig;
  readonly force?: readonly OutputTarget[];
}

export interface LiveQuantizer<
  B extends Boundary,
  O extends QuantizerOutputs<B> = QuantizerOutputs<B>,
> extends ReactiveQuantizer<B> {
  readonly config: QuantizerConfig<B, O>;
  /** Read the currently-active per-target output record (replay-1 read side; was `Effect.Effect<...>`). */
  readonly currentOutputs: Pick<CellKernel.Replay<OutputRecord>, 'read' | 'subscribe' | 'closed' | 'size'>;
  /** Per-target output records emitted on each crossing (replay-1 subscribe side; was `Stream.Stream<...>`). */
  readonly outputChanges: Pick<CellKernel.Replay<OutputRecord>, 'subscribe' | 'read' | 'closed' | 'size'>;
}

/**
 * The pair {@link createQuantizer} returns: the live reactive quantizer plus the
 * {@link Lifetime} that owns its teardown (replaces the former
 * `Effect<..., Scope.Scope>` scope).
 */
export interface LiveQuantizerHandle<B extends Boundary, O extends QuantizerOutputs<B> = QuantizerOutputs<B>> {
  readonly quantizer: LiveQuantizer<B, O>;
  readonly lifetime: Lifetime;
}

export declare function defineQuantizer<B extends Boundary, O extends QuantizerOutputs<B>>(
  boundary: B,
  options: DefineQuantizerOptions<B, O>,
): QuantizerConfig<B, O>;

export declare function createQuantizer<B extends Boundary, O extends QuantizerOutputs<B>>(
  definition: QuantizerConfig<B, O>,
  runtime?: QuantizerRuntime,
): LiveQuantizerHandle<B, O>;

// ═══════════════════════════════════════════════════════════════════════════════
// § 2. EVALUATE (boundary detection + hysteresis)
// ═══════════════════════════════════════════════════════════════════════════════

export interface EvaluateResult<S extends string = string> {
  readonly state: S;
  readonly index: number;
  readonly value: number;
  readonly crossed: boolean;
}

export declare function evaluate<B extends Boundary>(
  boundary: B,
  value: number,
  previousState?: StateUnion<B>,
): EvaluateResult<StateUnion<B> & string>;

// ═══════════════════════════════════════════════════════════════════════════════
// § 3. TRANSITION
// ═══════════════════════════════════════════════════════════════════════════════

export interface TransitionConfig {
  readonly duration: number | Millis;
  readonly easing?: Easing.Fn;
  readonly delay?: number | Millis;
}

export type TransitionMap<S extends string = string> = {
  readonly '*'?: TransitionConfig;
} & {
  readonly [K in `${S}->${S}`]?: TransitionConfig;
};

export interface Transition<B extends Boundary> {
  readonly config: TransitionMap<StateUnion<B> & string>;
  getTransition(from: StateUnion<B>, to: StateUnion<B>): TransitionConfig;
}

export declare const Transition: {
  for<B extends Boundary>(quantizer: Quantizer<B>, config: TransitionMap<StateUnion<B> & string>): Transition<B>;
  for<B extends Boundary>(boundary: B, config: TransitionMap<StateUnion<B> & string>): Transition<B>;
};

// ═══════════════════════════════════════════════════════════════════════════════
// § 4. ANIMATED QUANTIZER
// ═══════════════════════════════════════════════════════════════════════════════

/** An interpolated animation frame emitted during a crossing. */
export interface InterpolatedFrame<B extends Boundary> {
  readonly state: StateUnion<B>;
  readonly progress: number;
  readonly outputs: Record<string, number | string>;
}

export interface AnimatedQuantizerShape<B extends Boundary> extends ReactiveQuantizer<B> {
  readonly transition: Transition<B>;
  /**
   * No-replay subscription of interpolated animation frames during crossings (was
   * `Stream.Stream<{ state; progress; outputs }>`): a late subscriber never sees a
   * prior frame.
   */
  readonly interpolated: Pick<CellKernel.Fanout<InterpolatedFrame<B>>, 'subscribe' | 'closed' | 'size'>;
}

/**
 * The pair {@link AnimatedQuantizer.make} returns: the live animated quantizer
 * plus the {@link Lifetime} that owns its teardown (replaces the former
 * `Effect<..., Scope.Scope>` scope).
 */
export interface AnimatedQuantizerHandle<B extends Boundary> {
  readonly animated: AnimatedQuantizerShape<B>;
  readonly lifetime: Lifetime;
}

export declare const AnimatedQuantizer: {
  make<B extends Boundary>(
    quantizer: ReactiveQuantizer<B>,
    transitions: TransitionMap<StateUnion<B> & string>,
    /** Omitted: derived from a LiveQuantizer's `config.outputs.css` tables. */
    outputs?: Record<string, Record<string, number | string>>,
    /** Optional frame-clock injection; omitted, drives an internal ~60fps 16ms loop. */
    options?: { readonly scheduler?: Scheduler },
  ): AnimatedQuantizerHandle<B>;
};
