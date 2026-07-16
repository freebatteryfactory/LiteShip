/**
 * @czap/core type spine -- the contract all implementations satisfy.
 *
 * Three sections:
 *   1. NEW types (brands, boundary, signals, animation, game engine patterns)
 *   2. PROTOCOL types (from typesp -- CellEnvelope, CellKind, ECS, Visual IR)
 *   3. RUNTIME types (from @kit -- Cell, Derived, Zap, Store, Wire, Op, etc.)
 *
 * Effect v4 beta -- SubscriptionRef.changes(ref), Stream.callback, etc.
 */

import type { Effect, Stream, SubscriptionRef, PubSub, Scope } from 'effect';

// ═══════════════════════════════════════════════════════════════════════════════
// § 0. CAPABILITY TIERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * The runtime motion tier — derived from device capability + user preference
 * (notably `prefers-reduced-motion`) and used to gate animation / output
 * targets. Canonical declaration; `_spine/detect.d.ts` and `_spine/quantizer.d.ts`
 * re-anchor from here, and `packages/core/src/ui-quality.ts` re-exports it.
 *
 * Order is from lowest capability to highest. `none` is forced by
 * `prefers-reduced-motion: reduce` regardless of GPU tier; `compute` unlocks
 * every output target including the Rust/WASM kernels.
 */
export type MotionTier = 'none' | 'transitions' | 'animations' | 'physics' | 'compute';

// ═══════════════════════════════════════════════════════════════════════════════
// § 1. BRANDS
// ═══════════════════════════════════════════════════════════════════════════════

declare const SignalInputBrand: unique symbol;
declare const ThresholdValueBrand: unique symbol;
declare const StateNameBrand: unique symbol;
declare const ContentAddressBrand: unique symbol;
declare const IntegrityDigestBrand: unique symbol;
declare const HLCBrand: unique symbol;
declare const MillisBrand: unique symbol;

/** Branded input signal name -- e.g. 'viewport.width', 'prefers-color-scheme' */
export type SignalInput<I extends string = string> = I & { readonly [SignalInputBrand]: I };

/** Branded threshold number on a boundary */
export type ThresholdValue = number & { readonly [ThresholdValueBrand]: true };

/** Branded state name -- e.g. 'mobile', 'tablet', 'desktop' */
export type StateName<S extends string = string> = S & { readonly [StateNameBrand]: S };

/**
 * Content-addressed hash (FNV-1a, fnv1a:hex format).
 *
 * APEX of THREE intentional homes (ADR-0012) — do NOT merge them. This spine
 * type is the strictest: a symbol-brand, so a raw `fnv1a:...` string cannot be
 * typed as ContentAddress without a validating constructor. `@czap/core` and
 * `@czap/genui` re-anchor this brand (`type ContentAddress = _ContentAddress`)
 * with validating constructors; `@czap/canonical` is intentionally zero-dep
 * (only `@czap/error`) and uses a `` `fnv1a:${string}` `` template-literal brand
 * instead. Merging the homes would either break canonical's zero-dep property or
 * weaken this symbol-brand to a template literal. The three are parity-guarded at
 * runtime by tests/unit/core/brand-validators.test.ts ("ContentAddress three-home
 * parity drift-guard").
 */
export type ContentAddress = string & { readonly [ContentAddressBrand]: true };

/**
 * Cryptographic content digest. Format: `sha256:<64-hex>` or `blake3:<64-hex>`.
 * The algorithmic complement to {@link ContentAddress}: same canonical bytes,
 * stronger hash. Carried by {@link AddressedDigest} on external/release
 * artifacts where collision resistance matters (see ADR-0011).
 */
export type IntegrityDigest = string & { readonly [IntegrityDigestBrand]: true };

/**
 * A pair of hashes over the same canonical bytes: the ergonomic identity
 * ({@link ContentAddress}, fnv1a) plus a cryptographic digest
 * ({@link IntegrityDigest}, sha256 or blake3). Used by external-artifact
 * carriers like ShipCapsule (ADR-0011). `algo` records which hash family
 * minted the integrity digest; v0.1.0 emits `sha256`, v0.2 will emit `blake3`.
 */
export interface AddressedDigest {
  readonly display_id: ContentAddress;
  readonly integrity_digest: IntegrityDigest;
  readonly algo: 'sha256' | 'blake3';
}

/**
 * Branded millisecond duration -- forces explicit wrapping of raw numbers at temporal API boundaries.
 * Non-negative millisecond duration. Fractional values allowed. Use Millis(0) for immediate.
 */
export type Millis = number & { readonly [MillisBrand]: true };

/** Hybrid Logical Clock -- physical time + logical counter + node identity */
export interface HLC {
  readonly wall_ms: number;
  readonly counter: number;
  readonly node_id: string;
}

// Brand factory
export declare function brand<T, B extends symbol>(value: T): T & { readonly [K in B]: true };

// ═══════════════════════════════════════════════════════════════════════════════
// § 2. TYPE-LEVEL UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/** Flatten branded intersections for clean IDE hints */
export type Prettify<T> = { [K in keyof T]: T[K] } & {};

/** Extract literal union of state names from a Boundary.Shape */
export type StateUnion<B extends Boundary.Shape> = B['states'][number];

/** Generate valid output shapes per state */
export type OutputsFor<B extends Boundary.Shape, T> = {
  readonly [S in StateUnion<B>]: T;
};

/** Discriminated union of boundary crossings */
export type BoundaryCrossing<S extends string = string> = {
  readonly from: StateName<S>;
  readonly to: StateName<S>;
  readonly timestamp: HLC;
  readonly value: number;
};

// ═══════════════════════════════════════════════════════════════════════════════
// § 3. BOUNDARY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Optional per-boundary activation filter: gate a boundary on device
 * capabilities, an epoch-ms time window, or experiment participation. When a
 * spec is present and `BoundarySpec.isActive` returns false for the current
 * context, the boundary is skipped during evaluation.
 */
export interface BoundarySpec {
  /** Only evaluate this boundary when the device filter returns true. */
  readonly deviceFilter?: (capabilities: Record<string, unknown>) => boolean;
  /** Only evaluate this boundary within this time range (epoch ms). */
  readonly timeRange?: { readonly from?: number; readonly until?: number };
  /** Only evaluate this boundary for participants in this experiment. */
  readonly experimentId?: string;
}

export declare namespace Boundary {
  /**
   * The core primitive. Source of truth for quantization boundaries.
   *
   * `S` is a non-empty state tuple (`readonly [string, ...string[]]`) — a
   * boundary always names at least one state. `_version` pins the structural
   * schema generation; `spec` is the optional activation filter.
   */
  export interface Shape<
    I extends string = string,
    S extends readonly [string, ...string[]] = readonly [string, ...string[]],
  > {
    readonly _tag: 'BoundaryDef';
    readonly _version: 1;
    readonly id: ContentAddress;
    readonly input: SignalInput<I>;
    readonly thresholds: readonly ThresholdValue[];
    readonly states: S;
    readonly hysteresis?: number;
    readonly spec?: BoundarySpec;
  }

  /** Alias for {@link BoundarySpec}. */
  export type Spec = BoundarySpec;

  export function make<I extends string, const S extends readonly [string, ...string[]]>(config: {
    readonly input: I;
    readonly at: { readonly [K in keyof S]: readonly [number, S[K]] };
    readonly hysteresis?: number;
    readonly spec?: BoundarySpec;
  }): Shape<I, S>;

  export function evaluate<B extends Shape>(boundary: B, value: number): StateUnion<B>;

  export function evaluateWithHysteresis<B extends Shape>(
    boundary: B,
    value: number,
    previousState: StateUnion<B>,
  ): StateUnion<B>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 4. SIGNALS
// ═══════════════════════════════════════════════════════════════════════════════

export type SignalSourceType = 'viewport' | 'time' | 'pointer' | 'scroll' | 'media' | 'custom' | 'audio';

/**
 * Discriminant payloads default to the common case when omitted:
 * viewport `axis: 'width'`, time `mode: 'elapsed'`, pointer `axis: 'x'`,
 * scroll `axis: 'y'`, audio `mode: 'sample'`. `Signal.make` normalizes the
 * source, so the returned signal's `source` always carries explicit values.
 *
 * Audio modes: `sample`/`normalized` are offline/scrub reads; `amplitude`
 * (0..1 RMS) / `beat` (0/1 onset pulse) are live analyser-driven feeds
 * published by a host runtime producer.
 */
export type SignalSource =
  | { readonly type: 'viewport'; readonly axis?: 'width' | 'height' }
  | { readonly type: 'time'; readonly mode?: 'elapsed' | 'absolute' | 'scheduled' }
  | { readonly type: 'pointer'; readonly axis?: 'x' | 'y' | 'pressure' }
  | { readonly type: 'scroll'; readonly axis?: 'x' | 'y' | 'progress' }
  | { readonly type: 'media'; readonly query: string }
  | { readonly type: 'custom'; readonly id: string }
  | { readonly type: 'audio'; readonly mode?: 'sample' | 'normalized' | 'amplitude' | 'beat' };

export interface Signal<T> {
  readonly source: SignalSource;
  readonly current: Effect.Effect<T>;
  readonly changes: Stream.Stream<T>;
}

export interface ControllableSignal<T> extends Signal<T> {
  seek(to: T): Effect.Effect<void>;
  pause(): Effect.Effect<void>;
  resume(): Effect.Effect<void>;
}

export declare namespace Signal {
  export function make(source: SignalSource): Effect.Effect<Signal<number>, never, Scope.Scope>;
  export function controllable(): Effect.Effect<ControllableSignal<number>, never, Scope.Scope>;
}

/**
 * The sanctioned bidirectional bridge between {@link SignalSource} (the typed
 * union) and {@link SignalInput} (the branded dot-string). `inputToSource`
 * returns `undefined` for strings outside the vocabulary — it is lenient by
 * design (the brand is unvalidated free-form). They round-trip on every
 * recognized source after normalization.
 */
export function sourceToInput(source: SignalSource): SignalInput;
export function inputToSource(input: string): SignalSource | undefined;
export function inputSourceType(input: string): SignalSourceType | undefined;

// ═══════════════════════════════════════════════════════════════════════════════
// § 5. ANIMATION
// ═══════════════════════════════════════════════════════════════════════════════

export declare namespace Easing {
  /** Pure easing function: t ∈ [0,1] -> value ∈ [0,1] */
  export type Fn = (t: number) => number;

  export interface Config {
    /** Default: 170. */
    stiffness?: number;
    /** Default: 26. */
    damping?: number;
    /** Default: 1. */
    mass?: number;
  }

  export interface Fns {
    readonly linear: Fn;
    readonly easeInCubic: Fn;
    readonly easeOutCubic: Fn;
    readonly easeInOutCubic: Fn;
    readonly easeOutExpo: Fn;
    readonly easeOutBack: Fn;
    readonly easeOutElastic: Fn;
    readonly easeOutBounce: Fn;
    readonly ease: Fn;
    readonly easeIn: Fn;
    readonly easeOut: Fn;
    readonly easeInOut: Fn;
    spring(config: Config): Fn;
    cubicBezier(x1: number, y1: number, x2: number, y2: number): Fn;
  }
}

export declare const Easing: Easing.Fns;

export declare namespace Animation {
  export interface Frame {
    readonly progress: number;
    readonly eased: number;
    readonly elapsed: number;
    readonly timestamp: number;
  }

  export function run(config: { duration: number; easing?: Easing.Fn }): Stream.Stream<Frame>;

  export function interpolate<T extends Record<string, number>>(from: T, to: T, eased: number): T;
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 6. TIMELINE
// ═══════════════════════════════════════════════════════════════════════════════

export declare namespace Timeline {
  export interface Shape<B extends Boundary.Shape = Boundary.Shape> {
    readonly boundary: B;
    readonly state: Effect.Effect<StateUnion<B>>;
    readonly progress: Effect.Effect<number>;
    readonly elapsed: Effect.Effect<number>;
    readonly changes: Stream.Stream<StateUnion<B>>;
    play(): Effect.Effect<void>;
    pause(): Effect.Effect<void>;
    reverse(): Effect.Effect<void>;
    seek(ms: number): Effect.Effect<void>;
    scrub(progress: number): Effect.Effect<void>;
  }

  export function from<B extends Boundary.Shape>(
    boundary: B,
    config?: { duration?: number; loop?: boolean; scheduler?: Scheduler.Shape },
  ): Effect.Effect<Shape<B>, never, Scope.Scope>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 7. COMPOSITOR
// ═══════════════════════════════════════════════════════════════════════════════

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

export declare namespace Compositor {
  export interface Shape {
    add<B extends Boundary.Shape>(name: string, quantizer: Quantizer<B>): Effect.Effect<void>;
    remove(name: string): Effect.Effect<void>;
    compute(): Effect.Effect<CompositeState>;
    readonly changes: Stream.Stream<CompositeState>;
  }

  export function create(): Effect.Effect<Shape, never, Scope.Scope>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 8. BLEND TREES
// ═══════════════════════════════════════════════════════════════════════════════

export interface BlendNode<T> {
  readonly value: T;
  readonly weight: number;
}

export interface BlendTree<T extends Record<string, number>> {
  add(name: string, value: T, weight: number): void;
  remove(name: string): void;
  setWeight(name: string, weight: number): void;
  compute(): T;
  readonly changes: Stream.Stream<T>;
}

export declare namespace BlendTree {
  export function make<T extends Record<string, number>>(): Effect.Effect<BlendTree<T>, never, Scope.Scope>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 9. FRAME BUDGET
// ═══════════════════════════════════════════════════════════════════════════════

export type Priority = 'critical' | 'high' | 'low' | 'idle';

export interface FrameBudget {
  remaining(): number;
  canRun(priority: Priority): boolean;
  schedule<A>(priority: Priority, task: Effect.Effect<A>): Effect.Effect<A | null>;
  readonly fps: Effect.Effect<number>;
}

export declare namespace FrameBudget {
  export function make(config?: { targetFps?: number }): Effect.Effect<FrameBudget, never, Scope.Scope>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 10. DIRTY TRACKING
// ═══════════════════════════════════════════════════════════════════════════════

export interface DirtyFlags<K extends string = string> {
  mark(key: K): void;
  clear(key: K): void;
  clearAll(): void;
  isDirty(key: K): boolean;
  getDirty(): readonly K[];
  readonly mask: number;
}

export declare namespace DirtyFlags {
  export function make<K extends string>(keys: readonly K[]): DirtyFlags<K>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 11. PROTOCOL TYPES (from typesp)
// ═══════════════════════════════════════════════════════════════════════════════

export type CellKind =
  | 'boundary'
  | 'state'
  | 'output'
  | 'signal'
  | 'transition'
  | 'timeline'
  | 'compositor'
  | 'blend'
  | 'css'
  | 'glsl'
  | 'wgsl'
  | 'aria'
  | 'ai';

export interface CellMeta {
  readonly created: HLC;
  readonly updated: HLC;
  readonly version: number;
}

export interface CellEnvelope<K extends CellKind = CellKind, T = unknown> {
  readonly kind: K;
  readonly id: ContentAddress;
  readonly meta: CellMeta;
  readonly value: T;
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 12. ECS (from typesp -- composition over inheritance)
// ═══════════════════════════════════════════════════════════════════════════════

export type EntityId = string & { readonly _brand: 'EntityId' };

export interface Entity {
  readonly id: EntityId;
  readonly components: ReadonlyMap<string, unknown>;
}

export declare namespace Part {
  /** ECS component shape */
  export interface Shape<T = unknown> {
    readonly name: string;
    readonly schema: SchemaPort<T>;
  }
}

export interface System {
  readonly name: string;
  readonly query: readonly string[];
  /** Second argument is the world — use it to write computed output components back. */
  execute(entities: readonly Entity[], world?: World): Effect.Effect<void>;
}

export interface World {
  spawn(components?: Record<string, unknown>): Effect.Effect<EntityId>;
  despawn(id: EntityId): Effect.Effect<void>;
  addComponent<T>(id: EntityId, component: Part.Shape<T>, value: T): Effect.Effect<void>;
  /** Schema-free component write — used by systems to persist computed output values. */
  setComponent(id: EntityId, name: string, value: unknown): Effect.Effect<void>;
  removeComponent(id: EntityId, name: string): Effect.Effect<void>;
  query(...componentNames: string[]): Effect.Effect<readonly Entity[]>;
  addSystem(system: System): Effect.Effect<void>;
  tick(): Effect.Effect<void>;
}

export declare namespace World {
  export function make(): Effect.Effect<World, never, Scope.Scope>;
}

/**
 * Dense packed component storage for hot ECS paths.
 * Stores values in a flat array indexed by entity slot for cache efficiency.
 */
export interface DenseStore<T> {
  readonly _tag: 'DenseStore';
  readonly name: string;
  get(id: EntityId): T | undefined;
  set(id: EntityId, value: T): void;
  delete(id: EntityId): void;
  has(id: EntityId): boolean;
  entries(): ReadonlyArray<readonly [EntityId, T]>;
}

export declare namespace DenseStore {
  export function make<T>(name: string): DenseStore<T>;
}

/** ECS system that operates on dense-packed component stores */
export interface DenseSystem<Stores extends Record<string, DenseStore<unknown>>> {
  readonly name: string;
  readonly stores: Stores;
  execute(entities: ReadonlyArray<EntityId>): Effect.Effect<void>;
}

export declare function addDenseStore<T>(world: World, store: DenseStore<T>): Effect.Effect<void>;

// ═══════════════════════════════════════════════════════════════════════════════
// § 13. REACTIVE PRIMITIVES (from @kit, v4 migrated)
// ═══════════════════════════════════════════════════════════════════════════════

/** Reactive state container backed by SubscriptionRef */
export declare namespace Cell {
  export interface Shape<T> {
    readonly _tag: 'Cell';
    readonly ref: SubscriptionRef.SubscriptionRef<T>;
    readonly changes: Stream.Stream<T>;
    readonly get: Effect.Effect<T>;
    set(value: T): Effect.Effect<void>;
    update(f: (current: T) => T): Effect.Effect<void>;
  }

  export function make<T>(initial: T): Effect.Effect<Shape<T>>;
  export function fromStream<T>(initial: T, source: Stream.Stream<T>): Effect.Effect<Shape<T>, never, Scope.Scope>;
  export function all<T extends readonly unknown[]>(cells: { [K in keyof T]: Shape<T[K]> }): Effect.Effect<
    Shape<T>,
    never,
    Scope.Scope
  >;
  export function map<T, U>(cell: Shape<T>, fn: (t: T) => U): Effect.Effect<Shape<U>, never, Scope.Scope>;
}

/** Read-only derived computation */
export declare namespace Derived {
  export interface Shape<T> {
    readonly _tag: 'Derived';
    readonly changes: Stream.Stream<T>;
    readonly get: Effect.Effect<T>;
  }

  export function make<T>(
    compute: Effect.Effect<T>,
    sources?: ReadonlyArray<Stream.Stream<unknown>>,
  ): Effect.Effect<Shape<T>, never, Scope.Scope>;
  export function combine<T extends readonly unknown[], U>(
    cells: { [K in keyof T]: Cell.Shape<T[K]> },
    combiner: (...args: T) => U,
  ): Effect.Effect<Shape<U>, never, Scope.Scope>;
  export function map<A, B>(derived: Shape<A>, f: (a: A) => B): Effect.Effect<Shape<B>, never, Scope.Scope>;
  export function flatten<T>(nested: Shape<Shape<T>>): Effect.Effect<Shape<T>, never, Scope.Scope>;
}

/** Push-based event channel via PubSub */
export declare namespace Zap {
  export interface Shape<T> {
    readonly _tag: 'Zap';
    readonly stream: Stream.Stream<T>;
    emit(value: T): Effect.Effect<void>;
  }

  export function make<T>(): Effect.Effect<Shape<T>>;
  export function fromDOMEvent<K extends keyof HTMLElementEventMap>(
    element: HTMLElement,
    event: K,
  ): Effect.Effect<Shape<HTMLElementEventMap[K]>, never, Scope.Scope>;
  export function merge<T>(events: ReadonlyArray<Shape<T>>): Effect.Effect<Shape<T>, never, Scope.Scope>;
  export function map<A, B>(event: Shape<A>, f: (a: A) => B): Effect.Effect<Shape<B>, never, Scope.Scope>;
  export function filter<T>(
    event: Shape<T>,
    predicate: (value: T) => boolean,
  ): Effect.Effect<Shape<T>, never, Scope.Scope>;
  export function debounce<T>(event: Shape<T>, ms: number): Effect.Effect<Shape<T>, never, Scope.Scope>;
  export function throttle<T>(event: Shape<T>, ms: number): Effect.Effect<Shape<T>, never, Scope.Scope>;
}

/** TEA-style reducer store */
export declare namespace Store {
  export interface Shape<S, Msg> {
    readonly _tag: 'Store';
    readonly get: Effect.Effect<S>;
    readonly changes: Stream.Stream<S>;
    dispatch(msg: Msg): Effect.Effect<void>;
  }

  export interface Effectful<S, Msg, E = never, R = never> {
    readonly _tag: 'Store';
    readonly get: Effect.Effect<S>;
    readonly changes: Stream.Stream<S>;
    dispatch(msg: Msg): Effect.Effect<void, E, R>;
  }

  export function make<S, Msg>(initial: S, reducer: (state: S, msg: Msg) => S): Effect.Effect<Shape<S, Msg>>;
  export function makeWithEffect<S, Msg, E, R>(
    initial: S,
    reducer: (state: S, msg: Msg) => Effect.Effect<S, E, R>,
  ): Effect.Effect<Effectful<S, Msg, E, R>>;
}

/** Fluent stream wrapper */
export declare namespace Wire {
  export interface Shape<T, E = never> {
    readonly _tag: 'Wire';
    readonly stream: Stream.Stream<T, E>;
    map<B>(f: (a: T) => B): Shape<B, E>;
    filter(f: (a: T) => boolean): Shape<T, E>;
    take(n: number): Shape<T, E>;
    takeUntil(predicate: (a: T) => boolean): Shape<T, E>;
    debounce(ms: number): Shape<T, E>;
    throttle(ms: number): Shape<T, E>;
    scan<B>(initial: B, f: (acc: B, value: T) => B): Shape<B, E>;
    flatMap<B, E2>(f: (a: T) => Shape<B, E2>): Shape<B, E | E2>;
    merge<B, E2>(other: Shape<B, E2>): Shape<T | B, E | E2>;
    run(): Effect.Effect<void, E>;
    runCollect(): Effect.Effect<T[], E>;
  }

  export function from<T, E = never>(stream: Stream.Stream<T, E>): Shape<T, E>;
  export function fromSSE(url: string, options?: EventSourceInit): Shape<MessageEvent, Error>;
  export function fromWebSocket(url: string, protocols?: string | string[]): Shape<MessageEvent, Error>;
  export function fromAsyncIterable<T>(iterable: AsyncIterable<T>): Shape<T, Error>;
  export function zip<A, B>(a: Shape<A>, b: Shape<B>): Shape<readonly [A, B]>;
  export function merge<T, E>(streams: ReadonlyArray<Shape<T, E>>): Shape<T, E>;
  export function runCollect<T, E>(stream: Shape<T, E>): Effect.Effect<ReadonlyArray<T>, E>;
  export function runForEach<T, SE, E, R>(
    stream: Shape<T, SE>,
    fn: (t: T) => Effect.Effect<void, E, R>,
  ): Effect.Effect<void, SE | E, R>;
}

/** Effect.Effect wrapper with named factories */
export declare namespace Op {
  export interface Shape<A, E = never, R = never> {
    readonly _tag: 'Op';
    readonly effect: Effect.Effect<A, E, R>;
    run(): Effect.Effect<A, E, R | Scope.Scope>;
    map<B>(f: (a: A) => B): Shape<B, E, R>;
    flatMap<B, E2, R2>(f: (a: A) => Shape<B, E2, R2>): Shape<B, E | E2, R | R2>;
  }

  export function make<A, E = never, R = never>(effect: Effect.Effect<A, E, R>): Shape<A, E, R>;
  export function fromPromise<A>(f: () => Promise<A>): Shape<A, Error>;
  export function succeed<A>(value: A): Shape<A>;
  export function fail<E>(error: E): Shape<never, E>;
  export function all<T extends readonly Shape<unknown, unknown, unknown>[]>(
    tasks: T,
  ): Shape<
    { [K in keyof T]: T[K] extends Shape<infer A, any, any> ? A : never },
    T[number] extends Shape<any, infer E, any> ? E : never,
    T[number] extends Shape<any, any, infer R> ? R : never
  >;
  export function allSettled<T extends readonly Shape<unknown, unknown, unknown>[]>(
    tasks: T,
  ): Shape<
    { [K in keyof T]: T[K] extends Shape<infer A, any, any> ? A : never },
    never,
    T[number] extends Shape<any, any, infer R> ? R : never
  >;
  export function race<A, E, R>(tasks: ReadonlyArray<Shape<A, E, R>>): Shape<A, E, R>;
  export function retry<A, E, R>(
    task: Shape<A, E, R>,
    options: { times: number; delay?: number; factor?: number },
  ): Shape<A, E, R>;
  export function timeout<A, E, R>(task: Shape<A, E, R>, ms: number): Shape<A, E | Error, R>;
}

/** Discriminated union of all primitives */
export type Primitive<T> = Cell.Shape<T> | Derived.Shape<T> | Zap.Shape<T> | Wire.Shape<T>;

/** Type guards */
export declare function isCell<T>(p: Primitive<T>): p is Cell.Shape<T>;
export declare function isDerived<T>(p: Primitive<T>): p is Derived.Shape<T>;
export declare function isZap<T>(p: Primitive<T>): p is Zap.Shape<T>;
export declare function isWire<T>(p: Primitive<T>): p is Wire.Shape<T>;

// ═══════════════════════════════════════════════════════════════════════════════
// § 14. QUANTIZER (forward declaration -- full types in quantizer.d.ts)
// ═══════════════════════════════════════════════════════════════════════════════

export interface Quantizer<B extends Boundary.Shape = Boundary.Shape> {
  readonly boundary: B;
  readonly state: Effect.Effect<StateUnion<B>>;
  readonly changes: Stream.Stream<BoundaryCrossing<StateUnion<B> & string>>;
  evaluate(value: number): StateUnion<B>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 15. LIVE CELL (bridge: protocol envelope + reactive runtime)
// ═══════════════════════════════════════════════════════════════════════════════

export interface LiveCell<K extends CellKind, T> extends Omit<Cell.Shape<T>, '_tag'> {
  readonly _tag: 'LiveCell';
  readonly envelope: Effect.Effect<CellEnvelope<K, T>>;
  readonly crossings: Stream.Stream<BoundaryCrossing<string>>;
  readonly kind: K;
  publishCrossing(crossing: BoundaryCrossing<string>): Effect.Effect<void>;
}

export declare namespace LiveCell {
  export function make<K extends CellKind, T>(kind: K, initial: T): Effect.Effect<LiveCell<K, T>, never, Scope.Scope>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 16. CAPABILITY LATTICE (re-parameterized from @kit: pure<read<...<system -> static<styled<...<gpu)
// ═══════════════════════════════════════════════════════════════════════════════

export type CapTier = 'static' | 'styled' | 'reactive' | 'animated' | 'gpu';

export interface CapSet {
  readonly _tag: 'CapSet';
  readonly levels: readonly CapTier[];
}

export declare const Cap: {
  empty(): CapSet;
  from(levels: ReadonlyArray<CapTier>): CapSet;
  grant(caps: CapSet, level: CapTier): CapSet;
  revoke(caps: CapSet, level: CapTier): CapSet;
  has(caps: CapSet, level: CapTier): boolean;
  superset(a: CapSet, b: CapSet): boolean;
  union(a: CapSet, b: CapSet): CapSet;
  intersection(a: CapSet, b: CapSet): CapSet;
  atLeast(a: CapTier, b: CapTier): boolean;
  ordinal(level: CapTier): number;
};

// ═══════════════════════════════════════════════════════════════════════════════
// § 17. TYPED REF (content addressing)
// ═══════════════════════════════════════════════════════════════════════════════

export declare namespace TypedRef {
  export interface Shape {
    readonly schema_hash: string;
    readonly content_hash: string;
  }

  export function create(schemaHash: string, payload: unknown): Effect.Effect<Shape>;
  export function equals(a: Shape, b: Shape): boolean;
  export function canonicalize(value: unknown): Uint8Array;
  export function hash(data: string | Uint8Array): Effect.Effect<string>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 18. HLC (Hybrid Logical Clock)
// ═══════════════════════════════════════════════════════════════════════════════

export declare const HLC: {
  create(nodeId: string): HLC;
  compare(a: HLC, b: HLC): -1 | 0 | 1;
  increment(hlc: HLC, now?: number): HLC;
  merge(local: HLC, remote: HLC, now?: number): HLC;
  encode(hlc: HLC): string;
  decode(s: string): HLC;
  makeClock(nodeId: string): Effect.Effect<import('effect').Ref.Ref<HLC>>;
  tick(clock: import('effect').Ref.Ref<HLC>): Effect.Effect<HLC>;
  receive(clock: import('effect').Ref.Ref<HLC>, remote: HLC): Effect.Effect<HLC>;
};

// ═══════════════════════════════════════════════════════════════════════════════
// § 19. VECTOR CLOCK
// ═══════════════════════════════════════════════════════════════════════════════

export interface VectorClock {
  readonly _tag: 'VectorClock';
  readonly entries: ReadonlyMap<string, number>;
}

export declare const VectorClock: {
  make(): VectorClock;
  from(entries: Record<string, number>): VectorClock;
  get(vc: VectorClock, peerId: string): number;
  tick(vc: VectorClock, peerId: string): VectorClock;
  merge(a: VectorClock, b: VectorClock): VectorClock;
  happensBefore(a: VectorClock, b: VectorClock): boolean;
  concurrent(a: VectorClock, b: VectorClock): boolean;
  equals(a: VectorClock, b: VectorClock): boolean;
  compare(a: VectorClock, b: VectorClock): -1 | 0 | 1;
  toObject(vc: VectorClock): Record<string, number>;
  peers(vc: VectorClock): string[];
  size(vc: VectorClock): number;
};

// ═══════════════════════════════════════════════════════════════════════════════
// § 20. RECEIPT
// ═══════════════════════════════════════════════════════════════════════════════

export interface ReceiptSubject {
  readonly type: 'effect' | 'run' | 'artifact' | 'intent';
  readonly id: string;
}

export interface ReceiptEnvelope {
  readonly kind: string;
  readonly timestamp: HLC;
  readonly subject: ReceiptSubject;
  readonly payload: TypedRef.Shape;
  readonly hash: string;
  readonly previous: string | readonly string[];
  readonly signature?: string;
}

export type ChainValidationError =
  | { readonly type: 'not_genesis'; readonly index: 0 }
  | { readonly type: 'hash_mismatch'; readonly index: number; readonly computed: string; readonly stored: string }
  | { readonly type: 'chain_break'; readonly index: number; readonly expected: string; readonly actual: string }
  | { readonly type: 'hlc_not_increasing'; readonly index: number }
  | { readonly type: 'checkpoint_invalid'; readonly reason: string };

export interface ChainValidationOptions {
  readonly base?: string;
  readonly checkpoint?: ReceiptEnvelope;
  /**
   * Provenance verifier for the checkpoint attestation (injected capability). The
   * structural checks prove the checkpoint is well-formed but not that it attests to
   * the real dropped set; inject a verifier (e.g. a signature check) to close the
   * residual forgery vector in an adversarial setting. Absent, the structural floor
   * applies (sound for trusted self-compaction). See ADR-0026.
   */
  readonly verifyCheckpoint?: (checkpoint: ReceiptEnvelope) => Effect.Effect<boolean>;
}

export declare const Receipt: {
  readonly GENESIS: string;
  createEnvelope(
    kind: string,
    subject: ReceiptSubject,
    payload: TypedRef.Shape,
    timestamp: HLC,
    previousHash: string | readonly string[],
  ): Effect.Effect<ReceiptEnvelope>;
  buildChain(
    entries: ReadonlyArray<{ kind: string; subject: ReceiptSubject; payload: TypedRef.Shape; timestamp: HLC }>,
  ): Effect.Effect<ReceiptEnvelope[]>;
  /**
   * Ergonomic everyday chain check: resolves only to `true`; every
   * violation arrives on the `Error` channel as a human-readable message.
   * @see validateChainDetailed for typed ChainValidationError handling.
   */
  validateChain(chain: ReadonlyArray<ReceiptEnvelope>, options?: ChainValidationOptions): Effect.Effect<boolean, Error>;
  /**
   * Typed taxonomy for programmatic handling: fails with the
   * `ChainValidationError` discriminated union
   * (not_genesis | hash_mismatch | chain_break | hlc_not_increasing | checkpoint_invalid).
   * Pass `options.base`/`options.checkpoint` to validate a compacted tail.
   * @see validateChain for the simple Error-channel form.
   */
  validateChainDetailed(
    chain: ReadonlyArray<ReceiptEnvelope>,
    options?: ChainValidationOptions,
  ): Effect.Effect<true, ChainValidationError>;
  hashEnvelope(envelope: ReceiptEnvelope): Effect.Effect<string>;
  isGenesis(receipt: ReceiptEnvelope): boolean;
  head(chain: ReadonlyArray<ReceiptEnvelope>): ReceiptEnvelope | undefined;
  tail(chain: ReadonlyArray<ReceiptEnvelope>): ReceiptEnvelope | undefined;
  append(
    chain: ReadonlyArray<ReceiptEnvelope>,
    entry: { kind: string; subject: ReceiptSubject; payload: TypedRef.Shape; timestamp: HLC },
    previousHashes?: readonly string[],
  ): Effect.Effect<ReceiptEnvelope[]>;
  findByHash(chain: ReadonlyArray<ReceiptEnvelope>, hash: string): ReceiptEnvelope | undefined;
  findByKind(chain: ReadonlyArray<ReceiptEnvelope>, kind: string): ReceiptEnvelope[];
  generateMACKey(): Effect.Effect<CryptoKey, Error>;
  macEnvelope(envelope: ReceiptEnvelope, key: CryptoKey): Effect.Effect<ReceiptEnvelope, Error>;
  verifyMAC(envelope: ReceiptEnvelope, key: CryptoKey): Effect.Effect<boolean, Error>;
};

// ═══════════════════════════════════════════════════════════════════════════════
// § 21. DAG
// ═══════════════════════════════════════════════════════════════════════════════

export interface DAGNode {
  readonly envelope: ReceiptEnvelope;
  readonly parents: ReadonlyArray<string>;
  readonly children: ReadonlyArray<string>;
}

export interface ReceiptDAG {
  readonly nodes: ReadonlyMap<string, DAGNode>;
  readonly heads: ReadonlyArray<string>;
  readonly genesis: string | null;
}

export interface MergeResult {
  readonly dag: ReceiptDAG;
  readonly added: ReadonlyArray<string>;
  readonly forked: boolean;
}

export interface ForkViolation {
  readonly actor: string;
  readonly prevHash: string;
  readonly existing: string;
  readonly attempted: string;
}

export interface CheckpointResult {
  readonly dag: ReceiptDAG;
  readonly checkpoint: ReceiptEnvelope;
  readonly dropped: ReadonlyArray<string>;
}

export declare const DAG: {
  empty(): ReceiptDAG;
  ingest(dag: ReceiptDAG, envelope: ReceiptEnvelope): ReceiptDAG;
  ingestAll(dag: ReceiptDAG, envelopes: ReadonlyArray<ReceiptEnvelope>): ReceiptDAG;
  fromReceipts(envelopes: ReadonlyArray<ReceiptEnvelope>): ReceiptDAG;
  checkForkRule(dag: ReceiptDAG, envelope: ReceiptEnvelope): ForkViolation | null;
  linearize(dag: ReceiptDAG): ReadonlyArray<ReceiptEnvelope>;
  linearizeFrom(dag: ReceiptDAG, afterHash: string): ReadonlyArray<ReceiptEnvelope>;
  getHeads(dag: ReceiptDAG): ReadonlyArray<ReceiptEnvelope>;
  canonicalHead(dag: ReceiptDAG): ReceiptEnvelope | null;
  isFork(dag: ReceiptDAG): boolean;
  ancestors(dag: ReceiptDAG, hash: string): ReadonlyArray<string>;
  isAncestor(dag: ReceiptDAG, a: string, b: string): boolean;
  commonAncestor(dag: ReceiptDAG, a: string, b: string): string | null;
  size(dag: ReceiptDAG): number;
  merge(local: ReceiptDAG, remote: ReadonlyArray<ReceiptEnvelope>): MergeResult;
  /**
   * Compact the DAG below a watermark (DROP-ONLY), returning the spliced DAG and
   * a genesis-shaped checkpoint attestation out-of-band. Async — minting hashes
   * via `crypto.subtle`, off the hot path.
   */
  checkpoint(dag: ReceiptDAG, options: { readonly below: string }): Effect.Effect<CheckpointResult>;
  /** Rebuild the DAG from its survivors after dropping a checkpoint region (pure). */
  spliceCheckpoint(dag: ReceiptDAG, dropSet: ReadonlySet<string>): ReceiptDAG;
};

// ═══════════════════════════════════════════════════════════════════════════════
// § 22. PLAN
// ═══════════════════════════════════════════════════════════════════════════════

export type OpType =
  | { readonly type: 'pure'; readonly fn?: string }
  | { readonly type: 'effect'; readonly fn?: string }
  | { readonly type: 'spawn'; readonly key: string; readonly spec: Record<string, unknown> }
  | { readonly type: 'domain'; readonly domain: string; readonly op: string }
  | { readonly type: 'choice'; readonly condition: unknown }
  | { readonly type: 'noop' };

export type EdgeType = 'seq' | 'par' | 'choice_then' | 'choice_else';

export interface PlanStep {
  readonly id: string;
  readonly name: string;
  readonly opType: OpType;
  readonly metadata?: Record<string, unknown>;
}

export interface PlanEdge {
  readonly from: string;
  readonly to: string;
  readonly type: EdgeType;
}

export interface PlanIR {
  readonly name: string;
  readonly steps: readonly PlanStep[];
  readonly edges: readonly PlanEdge[];
  readonly metadata?: Record<string, unknown>;
}

export type PlanValidationError =
  | { readonly type: 'cycle'; readonly message: string; readonly stepIds?: readonly string[] }
  | { readonly type: 'missing_step'; readonly message: string; readonly stepIds?: readonly string[] };

export type PlanValidationResult =
  | { readonly ok: true; readonly plan: PlanIR }
  | { readonly ok: false; readonly errors: readonly PlanValidationError[] };

export interface PlanBuilder {
  step(name: string, opType: OpType, metadata?: Record<string, unknown>): PlanBuilder;
  seq(fromId: string, toId: string): PlanBuilder;
  par(fromId: string, toId: string): PlanBuilder;
  choice(fromId: string, thenId: string, elseId: string): PlanBuilder;
  build(): PlanIR;
}

export declare namespace Plan {
  export function make(name: string): PlanBuilder;
  export function validate(planIR: PlanIR): PlanValidationResult;
  export function topoSort(planIR: PlanIR): readonly string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 23. SCHEMA (transport-agnostic schema contract)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * The permanent schema contract: the phantom `Type`/`Encoded` pair every schema
 * value carries (`A` decodes out, `I` is the encoded form). Structural, so an
 * effect `Schema`/`Codec` value and a kernel schema both satisfy it — the spine
 * names this instead of effect's `Schema` (ADR-0010, spine-first).
 */
export type SchemaPort<A, I = A> = {
  readonly Type: A;
  readonly Encoded: I;
};

export declare namespace Codec {
  export interface Shape<A, I = A> {
    readonly schema: SchemaPort<A, I>;
    encode(value: A): Effect.Effect<I>;
    decode(input: I): Effect.Effect<A>;
  }

  export function make<A, I>(schema: SchemaPort<A, I>): Shape<A, I>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 24. FRAME SCHEDULER
// ═══════════════════════════════════════════════════════════════════════════════

export declare namespace Scheduler {
  export interface Shape {
    readonly _tag: 'FrameScheduler';
    schedule(callback: (now: number) => void): number;
    cancel(id: number): void;
  }

  export interface FixedStep extends Shape {
    step(): void;
    readonly frame: number;
  }

  export function raf(): Shape;
  export function noop(): Shape;
  export function fixedStep(fps: number): FixedStep;
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 25. VIDEO RENDERER
// ═══════════════════════════════════════════════════════════════════════════════

export interface VideoConfig {
  readonly fps: number;
  readonly width: number;
  readonly height: number;
  readonly durationMs: Millis;
}

export interface VideoFrameOutput {
  readonly frame: number;
  readonly timestamp: number;
  readonly progress: number;
  readonly state: CompositeState;
}

export interface VideoRenderer {
  readonly config: VideoConfig;
  readonly totalFrames: number;
  readonly scheduler: Scheduler.FixedStep;
  frames(): AsyncGenerator<VideoFrameOutput>;
}

export declare namespace VideoRenderer {
  export function make(config: VideoConfig, compositor: Compositor.Shape): VideoRenderer;
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 26. CAPTURE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface CaptureConfig {
  readonly width: number;
  readonly height: number;
  readonly fps: number;
}

export interface CaptureFrame {
  readonly frame: number;
  readonly timestamp: number;
  readonly bitmap: ImageBitmap | OffscreenCanvas;
}

export interface FrameCapture {
  readonly _tag: 'FrameCapture';
  init(config: CaptureConfig): Promise<void>;
  capture(frame: CaptureFrame): Promise<void>;
  finalize(): Promise<CaptureResult>;
}

export interface CaptureResult {
  readonly blob: Blob;
  readonly codec: string;
  readonly frames: number;
  readonly durationMs: Millis;
}
