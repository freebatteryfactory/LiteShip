/// <reference lib="esnext.disposable" />

/**
 * @liteship/core type spine -- the contract all implementations satisfy.
 *
 * Three sections:
 *   1. NEW types (brands, boundary, signals, animation, game engine patterns)
 *   2. PROTOCOL types (from typesp -- CellEnvelope, CellKind, ECS, Visual IR)
 *   3. RUNTIME types (from @kit -- Cell, Derived, Zap, Store, etc.)
 *
 * Effect-free (Wave 8): every surface this spine mirrors is LiteShip-native —
 * the reactive family (Cell/Derived/Store) over CellKernel.replay1, and Codec
 * over the sync `@liteship/error` `Result`. Nothing here imports `effect`; the
 * prose below records what each surface REPLACED, not a live dependency.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// § 0. CAPABILITY TIERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * The runtime motion tier — derived from device capability + user preference
 * (notably `prefers-reduced-motion`) and used to gate animation / output
 * targets. Canonical declaration; `_spine/detect.d.ts` and `_spine/quantizer.d.ts`
 * re-anchor from here, and `packages/core/src/evidence/ui-quality.ts` re-exports it.
 *
 * Order is from lowest capability to highest. `none` is forced by
 * `prefers-reduced-motion: reduce` regardless of GPU tier; `compute` unlocks
 * every output target including the Rust/WASM kernels.
 */
export type MotionTier = 'none' | 'transitions' | 'animations' | 'physics' | 'compute';

/** Capability slice required to resolve responsive-media intent. */
export interface ResponsiveMediaCapabilities {
  readonly devicePixelRatio: number;
  readonly saveData: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 1. BRANDS
// ═══════════════════════════════════════════════════════════════════════════════

/** Nominal marker for typed signal-input strings. */
declare const SignalInputBrand: unique symbol;
/** Nominal marker for validated boundary thresholds. */
declare const ThresholdValueBrand: unique symbol;
/** Nominal marker for authored state names. */
declare const StateNameBrand: unique symbol;
/** Nominal marker for compact local content labels. */
declare const ContentAddressBrand: unique symbol;
/** Nominal marker for cryptographic integrity witnesses. */
declare const IntegrityDigestBrand: unique symbol;
/** Nominal marker for hybrid logical clock values. */
declare const HLCBrand: unique symbol;
/** Nominal marker for millisecond durations. */
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
 * APEX of THREE intentional homes (ADR-0013) — do NOT merge them. This spine
 * type is the strictest: a symbol-brand, so a raw `fnv1a:...` string cannot be
 * typed as ContentAddress without a validating constructor. `@liteship/core` and
 * `@liteship/genui` re-anchor this brand (`type ContentAddress = _ContentAddress`)
 * with validating constructors; `@liteship/canonical` is intentionally zero-dep
 * (only `@liteship/error`) and uses a `` `fnv1a:${string}` `` template-literal brand
 * instead. Merging the homes would either break canonical's zero-dep property or
 * weaken this symbol-brand to a template literal. The three are parity-guarded at
 * runtime by tests/unit/core/schema/brand-validators.test.ts ("ContentAddress three-home
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

/** Apply one private nominal marker at a validated construction boundary. */
export declare function brand<T, B extends symbol>(value: T): T & { readonly [K in B]: true };

// ═══════════════════════════════════════════════════════════════════════════════
// § 2. TYPE-LEVEL UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/** Flatten branded intersections for clean IDE hints */
export type Prettify<T> = { [K in keyof T]: T[K] } & {};

/** Extract literal union of state names from a Boundary */
export type StateUnion<B extends Boundary> = B['states'][number];

/** Generate valid output shapes per state */
export type OutputsFor<B extends Boundary, T> = {
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
// § 2A. LIFETIME + CELL KERNEL (disposal + reactive substrate)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Lifetime — the disposal primitive that replaces `Scope`/`ManagedRuntime` at the
 * shed seams. Owns a LIFO finalizer stack disposed exactly once; `signal` projects
 * cancellation, and `dispose()` settles once every async finalizer settles.
 */
export interface Lifetime {
  readonly _tag: 'Lifetime';
  /** True once `dispose()` has been initiated (flips synchronously). */
  readonly disposed: boolean;
  /** An `AbortSignal` that aborts synchronously when `dispose()` begins. */
  readonly signal: AbortSignal;
  /** Register a finalizer (LIFO); returns an unregister handle. Runs now if already disposed. */
  readonly add: (finalizer: () => void | Promise<void>) => () => void;
  /** Run every finalizer once in LIFO order; the returned promise settles once async finalizers settle. */
  readonly dispose: () => Promise<void>;
}

export declare namespace Lifetime {
  /** A registered teardown function; the sync arm runs synchronously inside `dispose()`. */
  export type Finalizer = () => void | Promise<void>;
  /** Build a fresh, undisposed Lifetime. */
  export function make(): Lifetime;
}

/** Standalone verb-grammar constructor for a {@link Lifetime} (ADR-0046/0051). */
export declare function createLifetime(): Lifetime;

/**
 * A resource that owns its teardown through LiteShip's one public lifecycle.
 * Synchronous finalizers run before `dispose()` returns; the promise joins async
 * finalizers and carries aggregate failure. `[Symbol.asyncDispose]` makes the
 * value usable with `await using`.
 */
export interface AsyncOwnedResource {
  readonly lifetime: Lifetime;
  dispose(): Promise<void>;
  [Symbol.asyncDispose](): Promise<void>;
}

/**
 * Wire a {@link Lifetime}'s single lifecycle directly onto `target`, collapsing
 * the former `{ value, lifetime }` pair-return into ONE owned resource. Adds
 * `dispose()` + `[Symbol.asyncDispose]()` (both delegate to `lifetime.dispose()`)
 * and keeps the handle reachable as `target.lifetime`.
 */
export declare function attachLifetime<T extends object>(target: T, lifetime: Lifetime): T & AsyncOwnedResource;

/**
 * CellKernel — the shared replay-current / fan-out reactive substrate extracted
 * from the compositor's notification seam. `replay1` replays the current value on
 * subscribe (Compositor.changes / Cell); `fanout` is the strictly-simpler no-replay
 * channel (Zap / crossings / BlendTree.changes).
 */
export declare namespace CellKernel {
  /** A teardown handle returned by `subscribe`. Idempotent — a repeat call is a no-op. */
  export type Disposer = () => void;
  /** A subscription sink: a `next` value listener plus an optional close `complete` callback. */
  export interface Sink<T> {
    readonly next: (value: T) => void;
    readonly complete?: () => void;
  }
  /** What `subscribe` accepts — a full {@link Sink} or a bare value listener. */
  export type Subscriber<T> = Sink<T> | ((value: T) => void);
  /** Live replay-1 kernel: a current-value slot with synchronous replay-on-subscribe. */
  export interface Replay<T> {
    readonly _tag: 'CellReplay';
    read(): T;
    publish(value: T): void;
    subscribe(subscriber: Subscriber<T>): Disposer;
    close(): void;
    readonly closed: boolean;
    readonly size: number;
  }
  /** Live no-replay fan-out kernel: fire-and-forget publish, no current-value slot. */
  export interface Fanout<T> {
    readonly _tag: 'CellFanout';
    publish(value: T): void;
    subscribe(subscriber: Subscriber<T>): Disposer;
    close(): void;
    readonly closed: boolean;
    readonly size: number;
  }
  /** Build a replay-1 kernel seeded with `initial`. */
  export function replay1<T>(initial: T): Replay<T>;
  /** Build a no-replay fan-out kernel. */
  export function fanout<T>(): Fanout<T>;
}

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

/** Immutable threshold partition that maps one numeric input to named states. */
export interface Boundary<
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

/** Define a content-addressed {@link Boundary} from an ascending threshold table. */
export declare function defineBoundary<I extends string, const S extends readonly [string, ...string[]]>(config: {
  readonly input: I;
  readonly at: { readonly [K in keyof S]: readonly [number, S[K]] };
  readonly hysteresis?: number;
  readonly spec?: BoundarySpec;
}): Boundary<I, S>;

export declare namespace Boundary {
  export function evaluate<B extends Boundary>(boundary: B, value: number): StateUnion<B>;

  export function evaluateWithHysteresis<B extends Boundary>(
    boundary: B,
    value: number,
    previousState: StateUnion<B>,
  ): StateUnion<B>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 4. SIGNALS
// ═══════════════════════════════════════════════════════════════════════════════

/** Built-in and host-defined source families understood by reactive signals. */
export type SignalSourceType = 'viewport' | 'time' | 'pointer' | 'scroll' | 'media' | 'custom' | 'audio';

/**
 * Discriminant payloads default to the common case when omitted:
 * viewport `axis: 'width'`, time `mode: 'elapsed'`, pointer `axis: 'x'`,
 * scroll `axis: 'y'`, audio `mode: 'sample'`. `createSignal` normalizes the
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

/** Reactive signal over CellKernel.replay1 (Effect-free, Wave 6) */
export interface Signal<T> {
  readonly source: SignalSource;
  read(): T;
  subscribe(subscriber: CellKernel.Subscriber<T>): CellKernel.Disposer;
  readonly lifetime: Lifetime;
}

/** Signal whose host can seek, pause, and resume the underlying source. */
export interface ControllableSignal<T> extends Signal<T> {
  seek(to: T): void;
  pause(): void;
  resume(): void;
}

export declare namespace Signal {
  /** Structural shape of a seekable, pausable signal (forwarded by video/remotion). */
  export type Controllable<T> = ControllableSignal<T>;
  /** Structural shape of an audio-sourced signal backed by a sample bridge. */
  export type Audio = Signal<number> & AsyncOwnedResource & { poll(): number };
  /** Seekable/pausable time signal (verb grammar — a specialized constructor kept on the namespace). */
  export function controllable(): ControllableSignal<number> & AsyncOwnedResource;
  /** Audio sample/normalized signal; the bridge remains owned by its host. */
  export function audio(
    bridge: { readonly sampleRate: number; getCurrentSample(): number },
    mode?: 'sample' | 'normalized',
    totalDurationSec?: number,
  ): Audio;
}

/**
 * Standalone verb-grammar constructor for a browser-environment {@link Signal}
 * (ADR-0046/0051 — `create` allocates a runtime resource). The signal IS its own
 * disposable ({@link AsyncOwnedResource}); the owning `lifetime` stays reachable.
 */
export declare function createSignal(source: SignalSource): Signal<number> & AsyncOwnedResource;

/**
 * The sanctioned bidirectional bridge between {@link SignalSource} (the typed
 * union) and {@link SignalInput} (the branded dot-string). `inputToSource`
 * returns `undefined` for strings outside the vocabulary — it is lenient by
 * design (the brand is unvalidated free-form). They round-trip on every
 * recognized source after normalization.
 */
export function sourceToInput(source: SignalSource): SignalInput;
/** Decode a known signal input into its structured source. */
export function inputToSource(input: string): SignalSource | undefined;
/** Classify a known signal input without constructing its full source. */
export function inputSourceType(input: string): SignalSourceType | undefined;

// ═══════════════════════════════════════════════════════════════════════════════
// § 5. ANIMATION
// ═══════════════════════════════════════════════════════════════════════════════

/** Easing functions and spring configuration used by motion programs. */
export declare namespace Easing {
  /** Pure easing function: t ∈ [0,1] -> value ∈ [0,1] */
  export type Fn = (t: number) => number;

  export interface Config {
    /** Default: 170. */
    readonly stiffness?: number;
    /** Default: 26. */
    readonly damping?: number;
    /** Default: 1. */
    readonly mass?: number;
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
    easingToLinearCSS(fn: Fn, sampleCount?: number): string;
    springToLinearCSS(config: Config, sampleCount?: number): string;
    springNaturalDuration(config: Config, epsilon?: number): number;
  }
}

export declare const Easing: Easing.Fns;

/** Frame sampling and interpolation helpers for time-based animation. */
export declare namespace Animation {
  export interface Frame {
    readonly progress: number;
    readonly eased: number;
    readonly elapsed: Millis;
    readonly timestamp: number;
  }

  export function run(config: {
    duration: Millis;
    easing?: Easing.Fn;
    scheduler?: Scheduler;
    signal?: AbortSignal;
  }): AsyncGenerator<Frame, void, void>;

  export function interpolate<T extends Record<string, number>>(
    from: T,
    to: T,
    eased: number,
    defaults?: Partial<Record<string, number>>,
  ): T;
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 6. TIMELINE
// ═══════════════════════════════════════════════════════════════════════════════

/** Quantizer over time on CellKernel.replay1 ({distinct} state channel, Effect-free, Wave 6) */
export interface Timeline<B extends Boundary = Boundary> extends AsyncOwnedResource {
  readonly boundary: B;
  state(): StateUnion<B>;
  progress(): number;
  elapsed(): Millis;
  subscribe(subscriber: CellKernel.Subscriber<StateUnion<B>>): CellKernel.Disposer;
  play(): void;
  pause(): void;
  reverse(): void;
  seek(ms: Millis): void;
  scrub(progress: number): void;
  readonly lifetime: Lifetime;
}

/** Create a scheduler-driven {@link Timeline} over a {@link Boundary}. */
export declare function createTimeline<B extends Boundary>(
  boundary: B,
  config?: { duration?: Millis; loop?: boolean; scheduler?: Scheduler },
): Timeline<B>;

// ═══════════════════════════════════════════════════════════════════════════════
// § 7. COMPOSITOR
// ═══════════════════════════════════════════════════════════════════════════════

/** Named compositor state with deterministic numeric properties. */
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

/** Quantizer shape accepted by the live compositor. */
type CompositorQuantizer<B extends Boundary = Boundary> =
  (Quantizer<B> & { readonly stateSync: () => StateUnion<B> }) | ReactiveQuantizer<B>;

/** Live compositor that evaluates and blends registered states. */
export interface Compositor {
  add<B extends Boundary>(name: string, quantizer: CompositorQuantizer<B>): void;
  remove(name: string): void;
  compute(): CompositeState;
  setBlendWeights(name: string, weights: Record<string, number>): void;
  evaluateSpeculative(name: string, value: number, velocity?: number): void;
  scheduleBatch(): void;
  /**
   * Replay-1 subscription surface of the compositor's extracted {@link CellKernel}:
   * `subscribe` replays the current live state on attach and returns a disposer;
   * `read` returns the current state. `publish`/`close` are intentionally excluded —
   * the compositor is the sole writer and its {@link Lifetime} closes the kernel.
   */
  readonly changes: Pick<CellKernel.Replay<CompositeState>, 'subscribe' | 'read' | 'closed' | 'size'>;
  readonly runtime: RuntimeCoordinator;
}

export declare namespace Compositor {
  /** Build a compositor that owns its own teardown via `dispose()`. */
  export function create(): Compositor & AsyncOwnedResource;
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 8. BLEND TREES
// ═══════════════════════════════════════════════════════════════════════════════

/** One weighted input node in a blend tree. */
export interface BlendNode<T> {
  readonly value: T;
  readonly weight: number;
}

/** Mutable weighted blend graph over homogeneous numeric records. */
export interface BlendTree<T extends Record<string, number>> {
  add(name: string, value: T, weight: number): void;
  remove(name: string): void;
  setWeight(name: string, weight: number): void;
  compute(): T;
  /** No-replay subscribe surface of the tree's {@link CellKernel} fan-out channel. */
  readonly changes: Pick<CellKernel.Fanout<T>, 'subscribe' | 'closed' | 'size'>;
}

/**
 * Build a blend tree that owns its own teardown via `dispose()` — the standalone
 * verb-grammar constructor (ADR-0046/0051).
 */
export declare function createBlendTree<T extends Record<string, number>>(): BlendTree<T> & AsyncOwnedResource;

// ═══════════════════════════════════════════════════════════════════════════════
// § 9. FRAME BUDGET
// ═══════════════════════════════════════════════════════════════════════════════

/** Scheduling priority used by frame-budget admission. */
export type Priority = 'critical' | 'high' | 'low' | 'idle';

/** Frame-time admission controller for prioritized work. */
export interface FrameBudget {
  remaining(): number;
  canRun(priority: Priority): boolean;
  scheduleSync<A>(priority: Priority, task: () => A): A | null;
  readonly fpsSync: number;
  readonly lifetime: Lifetime;
}

/**
 * Build a rAF frame-budget tracker — the standalone verb-grammar constructor
 * (ADR-0046/0051). The budget IS its own disposable ({@link AsyncOwnedResource}).
 */
export declare function createFrameBudget(config?: { targetFps?: number }): FrameBudget & AsyncOwnedResource;

// ═══════════════════════════════════════════════════════════════════════════════
// § 10. DIRTY TRACKING
// ═══════════════════════════════════════════════════════════════════════════════

/** Constant-time dirty-bit tracker over a closed key set. */
export interface DirtyFlags<K extends string = string> {
  mark(key: K): void;
  clear(key: K): void;
  clearAll(): void;
  isDirty(key: K): boolean;
  getDirty(): readonly K[];
  readonly mask: number;
}

/** Build a bitmask dirty tracker — the standalone verb-grammar constructor (ADR-0046/0051). */
export declare function createDirtyFlags<K extends string>(keys: readonly K[]): DirtyFlags<K>;

// ═══════════════════════════════════════════════════════════════════════════════
// § 11. PROTOCOL TYPES (from typesp)
// ═══════════════════════════════════════════════════════════════════════════════

/** Closed family of live-cell transport and projection roles. */
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

/** Optional sequencing metadata attached to a cell emission. */
export interface CellMeta {
  readonly created: HLC;
  readonly updated: HLC;
  readonly version: number;
}

/** Typed live-cell payload with its kind and transport metadata. */
export interface CellEnvelope<K extends CellKind = CellKind, T = unknown> {
  readonly kind: K;
  readonly id: ContentAddress;
  readonly meta: CellMeta;
  readonly value: T;
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 12. ECS (from typesp -- composition over inheritance)
// ═══════════════════════════════════════════════════════════════════════════════

/** Branded identifier minted for an ECS entity. */
export type EntityId = string & { readonly _brand: 'EntityId' };

/** Primitive literal carried by a literal schema node. */
type LiteralValue = string | number | boolean | null;
/** Constructor shape retained by a bytes schema node. */
type BytesCtor = abstract new (...args: never[]) => object;
/** Annotation map shared by the kernel schema AST. */
type SchemaAnnotations = Readonly<Record<symbol, unknown>>;
/** Common metadata on every kernel schema node. */
interface SchemaNodeMeta {
  readonly annotations?: SchemaAnnotations;
}
/** String schema AST node. */
interface StringSchemaNode extends SchemaNodeMeta {
  readonly kind: 'string';
}
/** Number schema AST node. */
interface NumberSchemaNode extends SchemaNodeMeta {
  readonly kind: 'number';
}
/** Boolean schema AST node. */
interface BooleanSchemaNode extends SchemaNodeMeta {
  readonly kind: 'boolean';
}
/** Literal schema AST node. */
interface LiteralSchemaNode extends SchemaNodeMeta {
  readonly kind: 'literal';
  readonly value: LiteralValue;
}
/** Union schema AST node. */
interface UnionSchemaNode extends SchemaNodeMeta {
  readonly kind: 'union';
  readonly members: readonly SchemaNode[];
}
/** One named field in a struct schema node. */
interface StructSchemaField {
  readonly key: string;
  readonly node: SchemaNode;
  readonly optional: boolean;
}
/** Struct schema AST node. */
interface StructSchemaNode extends SchemaNodeMeta {
  readonly kind: 'struct';
  readonly fields: readonly StructSchemaField[];
}
/** Array schema AST node. */
interface ArraySchemaNode extends SchemaNodeMeta {
  readonly kind: 'array';
  readonly element: SchemaNode;
}
/** Tuple schema AST node. */
interface TupleSchemaNode extends SchemaNodeMeta {
  readonly kind: 'tuple';
  readonly elements: readonly SchemaNode[];
}
/** Record schema AST node. */
interface RecordSchemaNode extends SchemaNodeMeta {
  readonly kind: 'record';
  readonly value: SchemaNode;
}
/** Unknown schema AST node. */
interface UnknownSchemaNode extends SchemaNodeMeta {
  readonly kind: 'unknown';
}
/** Any schema AST node. */
interface AnySchemaNode extends SchemaNodeMeta {
  readonly kind: 'any';
}
/** Bytes schema AST node. */
interface BytesSchemaNode extends SchemaNodeMeta {
  readonly kind: 'bytes';
  readonly ctor: BytesCtor;
  readonly name: string;
}
/** Branded schema AST node. */
interface BrandSchemaNode extends SchemaNodeMeta {
  readonly kind: 'brand';
  readonly base: SchemaNode;
  readonly name: string;
  readonly refine: (value: unknown) => unknown;
}
/** Named hole schema AST node. */
interface HoleSchemaNode extends SchemaNodeMeta {
  readonly kind: 'hole';
  readonly name: string;
}
/** Closed kernel schema AST union mirrored for Part identity. */
type SchemaNode =
  | StringSchemaNode
  | NumberSchemaNode
  | BooleanSchemaNode
  | LiteralSchemaNode
  | UnionSchemaNode
  | StructSchemaNode
  | ArraySchemaNode
  | TupleSchemaNode
  | RecordSchemaNode
  | UnknownSchemaNode
  | AnySchemaNode
  | BytesSchemaNode
  | BrandSchemaNode
  | HoleSchemaNode;
/** Minimal structural schema contract bound to one Part. */
interface KernelSchema<out A, out I = A> {
  readonly ast: SchemaNode;
  readonly Type: A;
  readonly Encoded: I;
}

/** How a Part retains values after successful schema admission. */
export type PartRetentionPolicy = 'snapshot' | 'reference';

/** Module-private witness preserving a Part's admitted value type in exact relation probes. */
declare const SpinePartWitness: unique symbol;
/** Module-private witness distinguishing schema-admitted values from unchecked inputs. */
declare const SpineAdmissionWitness: unique symbol;
/** Module-private witness preserving ordinary System identity in exact relation probes. */
declare const SpineSystemWitness: unique symbol;
/** Module-private witness preserving DenseSystem identity in exact relation probes. */
declare const SpineDenseSystemWitness: unique symbol;

/** One minted, schema-backed ECS component declaration. */
export interface Part<T = unknown, Name extends string = string, Encoded = unknown> {
  readonly name: Name;
  readonly schema: KernelSchema<T, Encoded>;
  readonly retention: PartRetentionPolicy;
  readonly [SpinePartWitness]: T;
}

/** Erased Part used by heterogeneous world operations. */
type AnyPart = Part<unknown, string, unknown>;
/** Runtime value carried by one Part. */
export type PartValue<P extends AnyPart> = P extends Part<infer T, string, unknown> ? T : never;
/** Value admitted by the exact Part schema and witness. */
export interface AdmittedPartValue<P extends AnyPart = AnyPart> {
  readonly part: P;
  readonly value: PartValue<P>;
  readonly [SpineAdmissionWitness]: true;
}
/** Tuple of Parts used to declare system authority. */
type PartTuple = readonly AnyPart[];
/** Part member selected from one authority tuple. */
type TuplePart<P extends PartTuple> = P[number];
/** Part readable through either a system query or read declaration. */
type ReadablePart<Q extends PartTuple, R extends PartTuple> = TuplePart<Q> | TuplePart<R>;

/** Immutable snapshot view of one entity. */
export interface Entity<P extends AnyPart = AnyPart> {
  readonly id: EntityId;
  get<Q extends P>(part: Q): PartValue<Q>;
}

/** Minimal entity handle supplied to a declared system. */
export interface SystemEntity {
  readonly id: EntityId;
}

/** Trusted read/write context supplied to one declared system. */
export interface SystemContext<
  Q extends PartTuple = PartTuple,
  R extends PartTuple = PartTuple,
  W extends PartTuple = PartTuple,
> {
  read<P extends TuplePart<Q>>(entity: SystemEntity, part: P): PartValue<P>;
  optional<P extends ReadablePart<Q, R>>(entity: SystemEntity, part: P): PartValue<P> | undefined;
  query<const P extends readonly ReadablePart<Q, R>[]>(...parts: P): readonly Entity<TuplePart<P>>[];
  write<P extends TuplePart<W>>(entity: SystemEntity, part: P, value: PartValue<P>): void;
}

/** Typed ECS system with explicit query/read/write authority. */
export interface System<
  Q extends PartTuple = PartTuple,
  R extends PartTuple = PartTuple,
  W extends PartTuple = PartTuple,
> {
  readonly name: string;
  readonly query: Q;
  readonly reads: R;
  readonly writes: W;
  execute(entities: readonly SystemEntity[], context: SystemContext<Q, R, W>): void;
  readonly [SpineSystemWitness]: true;
}

/** Live ECS world that owns entities, dense stores, and scheduled systems. */
export interface World {
  spawn(...values: readonly AdmittedPartValue[]): EntityId;
  despawn(id: EntityId): void;
  set<P extends AnyPart>(id: EntityId, value: AdmittedPartValue<P>): void;
  remove(id: EntityId, part: AnyPart): void;
  query<const P extends PartTuple>(...parts: P): readonly Entity<TuplePart<P>>[];
  addSystem(system: System | DenseSystem): void;
  addDenseStore<P extends Part<number>>(owned: OwnedDenseStore<P>): void;
  tick(): void;
}

/**
 * Build an ECS world that owns its own teardown via `dispose()` — the standalone
 * verb-grammar constructor (ADR-0046/0051). The world registers zero finalizers
 * (plain in-memory Maps), so `dispose()` is a formal, exactly-once release handle
 * threaded by consumers, not a carrier of real finalizers.
 */
export declare function createWorld(): World & AsyncOwnedResource;

/**
 * Dense packed component storage for hot ECS paths.
 * Stores values in a flat array indexed by entity slot for cache efficiency.
 */
/** Dense, fixed-capacity numeric ECS component storage. */
export interface DenseStore<P extends Part<number> = Part<number>> {
  readonly part: P;
  readonly name: P['name'];
  readonly capacity: number;
  readonly _dense: true;
  readonly entityToIndex: ReadonlyMap<EntityId, number>;
  readonly indexToEntity: readonly EntityId[];
  readonly count: number;
  get(entityId: EntityId): number | undefined;
  has(entityId: EntityId): boolean;
  view(): ReadonlyDenseValues;
  entities(): readonly EntityId[];
}

/** Read-only packed numeric values exposed by a dense store. */
export interface ReadonlyDenseValues extends Iterable<number> {
  readonly length: number;
  at(index: number): number | undefined;
}

/** Trusted writer paired with one dense numeric store. */
export interface DenseStoreWriter<P extends Part<number> = Part<number>> {
  readonly part: P;
  set(entityId: EntityId, value: number): void;
  delete(entityId: EntityId): boolean;
  reset(): void;
  view(): Float64Array;
}

/** Read and write halves returned for one allocated dense store. */
export interface OwnedDenseStore<P extends Part<number> = Part<number>> {
  readonly store: DenseStore<P>;
  readonly writer: DenseStoreWriter<P>;
}

/** Allocate a Part-bound dense numeric ECS component store. */
export declare function createDenseStore<P extends Part<number>>(part: P, capacity: number): OwnedDenseStore<P>;

/** Part-authorized dense stores supplied to one dense system. */
export interface DenseSystemContext<R extends readonly Part<number>[], W extends readonly Part<number>[]> {
  read<P extends TuplePart<R>>(part: P): DenseStore<P>;
  write<P extends TuplePart<W>>(part: P): DenseStoreWriter<P>;
}

/** ECS system that operates on dense-packed component stores. */
export interface DenseSystem<
  R extends readonly Part<number>[] = readonly Part<number>[],
  W extends readonly Part<number>[] = readonly Part<number>[],
> {
  readonly name: string;
  readonly reads: R;
  readonly writes: W;
  readonly _denseSystem: true;
  execute(context: DenseSystemContext<R, W>): void;
  readonly [SpineDenseSystemWitness]: true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 13. REACTIVE PRIMITIVES (from @kit, v4 migrated)
// ═══════════════════════════════════════════════════════════════════════════════

/** Reactive state container over CellKernel.replay1 (Effect-free, Wave 6) */
export interface Cell<T> {
  readonly _tag: 'Cell';
  read(): T;
  set(value: T): void;
  update(f: (current: T) => T): void;
  subscribe(subscriber: CellKernel.Subscriber<T>): CellKernel.Disposer;
  readonly lifetime: Lifetime;
}

/** Create a mutable reactive {@link Cell} with an initial value. The cell owns its own teardown via `dispose()`. */
export declare function createCell<T>(initial: T): Cell<T> & AsyncOwnedResource;

/** Read-only derived computation over CellKernel.replay1 (Effect-free, Wave 6) */
export interface Derived<T> {
  readonly _tag: 'Derived';
  read(): T;
  subscribe(subscriber: CellKernel.Subscriber<T>): CellKernel.Disposer;
  readonly lifetime: Lifetime;
}

/** Compute a {@link Derived} value from a factory and the sources that recompute it. Owns its own teardown via `dispose()`. */
export declare function computed<T>(
  compute: () => T,
  sources?: ReadonlyArray<Derived.Trigger>,
): Derived<T> & AsyncOwnedResource;

export declare namespace Derived {
  /** The readable + subscribable source `combine` recomputes from. */
  export type Source<T> = Pick<CellKernel.Replay<T>, 'read' | 'subscribe'>;
  /** A recompute trigger for `computed` — the subscribe half of a source. */
  export type Trigger = Pick<CellKernel.Replay<unknown>, 'subscribe'>;

  export function combine<T extends readonly unknown[], U>(
    sources: { readonly [K in keyof T]: Source<T[K]> },
    combiner: (...args: T) => U,
  ): Derived<U> & AsyncOwnedResource;
}

/**
 * A monotonic-ish millisecond time source — the injectable shape runtime time is
 * read through (mirrors `@liteship/core`'s `clock.ts` export). `now()` returns
 * milliseconds, a relative duration source (deltas), never a stable identity
 * input to a hashed artifact. Threaded through {@link Zap.throttle} so the
 * throttle window is measured deterministically under an injected clock, defaulting
 * to the runtime's `systemClock` (the monotonic `performance.now` boundary).
 */
export interface Clock {
  /** Current time in milliseconds. */
  readonly now: () => number;
}

/** Push-based event channel over a no-replay {@link CellKernel} fan-out */
export interface Zap<T> {
  readonly _tag: 'Zap';
  /** The no-replay subscribe surface — `subscribe(sink)` returns a disposer. */
  readonly stream: Pick<CellKernel.Fanout<T>, 'subscribe' | 'closed' | 'size'>;
  /** Fan `value` out to every current subscriber, synchronously. Inert after close. */
  emit(value: T): void;
}

export declare namespace Zap {
  // Every `Zap.*` factory returns the channel augmented with its own `dispose()`
  // ({@link AsyncOwnedResource}) — the zap IS the disposable, no pair to destructure.
  export function make<T>(): Zap<T> & AsyncOwnedResource;
  export function fromDOMEvent<K extends keyof HTMLElementEventMap>(
    element: HTMLElement,
    event: K,
  ): Zap<HTMLElementEventMap[K]> & AsyncOwnedResource;
  export function merge<T>(events: ReadonlyArray<Zap<T>>): Zap<T> & AsyncOwnedResource;
  export function map<A, B>(event: Zap<A>, f: (a: A) => B): Zap<B> & AsyncOwnedResource;
  export function filter<T>(event: Zap<T>, predicate: (value: T) => boolean): Zap<T> & AsyncOwnedResource;
  export function debounce<T>(event: Zap<T>, ms: Millis): Zap<T> & AsyncOwnedResource;
  export function throttle<T>(event: Zap<T>, ms: Millis, clock?: Clock): Zap<T> & AsyncOwnedResource;
}

/** TEA-style reducer store over CellKernel.replay1 (Effect-free, Wave 6) */
export interface Store<S, Msg> {
  readonly _tag: 'Store';
  read(): S;
  subscribe(subscriber: CellKernel.Subscriber<S>): CellKernel.Disposer;
  dispatch(msg: Msg): void;
  readonly lifetime: Lifetime;
}

/** Create a TEA-style reducer {@link Store} from an initial state and a pure reducer. Owns its own teardown via `dispose()`. */
export declare function createStore<S, Msg>(
  initial: S,
  reducer: (state: S, msg: Msg) => S,
): Store<S, Msg> & AsyncOwnedResource;

/** Discriminated union of all primitives */
export type Primitive<T> = Cell<T> | Derived<T> | Zap<T>;

/** Test whether a primitive is a mutable cell. */
export declare function isCell<T>(p: Primitive<T>): p is Cell<T>;
/** Test whether a primitive is a computed derived value. */
export declare function isDerived<T>(p: Primitive<T>): p is Derived<T>;
/** Test whether a primitive is an event stream. */
export declare function isZap<T>(p: Primitive<T>): p is Zap<T>;

// ═══════════════════════════════════════════════════════════════════════════════
// § 14. QUANTIZER (forward declaration -- full types in quantizer.d.ts)
// ═══════════════════════════════════════════════════════════════════════════════

/** Immutable output mapping for every state of a boundary. */
export interface Quantizer<B extends Boundary = Boundary> {
  readonly _tag: 'Quantizer';
  readonly boundary: B;
  /** Synchronous state accessor for hot paths (avoids reactive read overhead). */
  readonly stateSync?: () => StateUnion<B>;
  evaluate(value: number): StateUnion<B>;
}

/**
 * Replay-1 current-state read side (was `Effect.Effect<StateUnion<B>>`): `read()`
 * returns the current discrete state; a subscriber is replayed the current value
 * on attach.
 */
export type QuantizerState<B extends Boundary = Boundary> = Pick<
  CellKernel.Replay<StateUnion<B>>,
  'read' | 'subscribe' | 'closed' | 'size'
>;

/**
 * No-replay crossing subscription side (was
 * `Stream.Stream<BoundaryCrossing<StateUnion<B> & string>>`): a late subscriber
 * never sees a prior crossing.
 */
export type QuantizerCrossings<B extends Boundary = Boundary> = Pick<
  CellKernel.Fanout<BoundaryCrossing<StateUnion<B> & string>>,
  'subscribe' | 'closed' | 'size'
>;

/**
 * Reactive quantizer — the {@link Quantizer} base plus its reactive substrate on
 * the extracted {@link CellKernel}. This is the shape `@liteship/quantizer`'s live
 * evaluator produces; a purely-synchronous quantizer omits this extension.
 */
export interface ReactiveQuantizer<B extends Boundary = Boundary> extends Quantizer<B> {
  readonly state: QuantizerState<B>;
  readonly changes: QuantizerCrossings<B>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 15. LIVE CELL (bridge: protocol envelope + reactive runtime)
// ═══════════════════════════════════════════════════════════════════════════════
//
// Effect-free (Wave 6, migrated ATOMICALLY with Cell — scar S2.3/S2.4 closed).
// The value channel is a plain Cell ({all} + 'deferred'); the crossings channel is
// a no-replay CellKernel.fanout; `envelope()` is a synchronous snapshot; the HLC
// is the pure ops read against the injected wall clock. `set`/`update` record the
// mutation (version + HLC + fnv1a id + boundary state) BEFORE the value fans out,
// so there is no observable interleave window.

/** Reactive cell specialized to a declared transport or projection kind. */
export interface LiveCell<K extends CellKind, T> extends Omit<Cell<T>, '_tag'> {
  readonly _tag: 'LiveCell';
  envelope(): CellEnvelope<K, T>;
  readonly crossings: Pick<CellKernel.Fanout<BoundaryCrossing<string>>, 'subscribe'>;
  readonly kind: K;
  publishCrossing(crossing: BoundaryCrossing<string>): void;
}

/**
 * Standalone verb-grammar constructors for a {@link LiveCell} (ADR-0046/0051). Each
 * live cell IS its own disposable ({@link AsyncOwnedResource}).
 */
export declare function createLiveCell<K extends CellKind, T>(kind: K, initial: T): LiveCell<K, T> & AsyncOwnedResource;
/** Allocate a live numeric cell wired to one boundary definition. */
export declare function createLiveCellBoundary<I extends string, S extends readonly [string, ...string[]]>(
  boundary: Boundary<I, S>,
  initial: number,
): LiveCell<'boundary', number> & AsyncOwnedResource;

/** Named phases of the shared runtime coordinator's frame plan. */
export type RuntimePhase = 'compute-discrete' | 'compute-blend' | 'emit-css' | 'emit-glsl' | 'emit-wgsl' | 'emit-aria';

/** Construction options for the shared runtime coordinator. */
export interface RuntimeCoordinatorConfig {
  readonly capacity?: number;
  readonly name?: string;
}

/** Internal dense numeric-store projection carried by the coordinator. */
interface RuntimeCoordinatorDenseStore {
  readonly name: string;
  readonly capacity: number;
  readonly _dense: true;
  readonly entityToIndex: Map<EntityId, number>;
  readonly indexToEntity: EntityId[];
  readonly data: Float64Array;
  count: number;
  get(entityId: EntityId): number | undefined;
  set(entityId: EntityId, value: number): void;
  has(entityId: EntityId): boolean;
  delete(entityId: EntityId): boolean;
  reset(): void;
  view(): Float64Array;
  entities(): readonly EntityId[];
}

/** Live coordinator surface shared by the core runtime and worker host. */
export interface RuntimeCoordinator {
  readonly plan: PlanIR;
  readonly phases: readonly RuntimePhase[];
  readonly stores: {
    readonly stateIndex: DenseStore;
    readonly dirtyEpoch: DenseStore;
  };
  reset(registrations?: readonly { readonly name: string; readonly states: readonly string[] }[]): void;
  registerQuantizer(name: string, states: readonly string[]): EntityId;
  removeQuantizer(name: string): void;
  hasQuantizer(name: string): boolean;
  setState(name: string, state: string): void;
  applyState(name: string, state: string): number;
  getStateIndex(name: string): number;
  markDirty(name: string): void;
  getDirtyEpoch(name: string): number;
  registeredNames(): readonly string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 16. CAPABILITY LATTICE (re-parameterized from @kit: pure<read<...<system -> static<styled<...<gpu)
// ═══════════════════════════════════════════════════════════════════════════════

/** Ordered rendering-capability tier from static markup through GPU execution. */
export type CapTier = 'static' | 'styled' | 'reactive' | 'animated' | 'gpu';

/** Boolean capability set paired with a rendering tier decision. */
export interface CapSet {
  readonly _tag: 'CapSet';
  readonly levels: readonly CapTier[];
}

/** Pure operations over rendering capability sets and tier order. */
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

/** Content-addressed reference to a payload validated against a schema hash. */
export interface TypedRef {
  readonly schema_hash: string;
  readonly content_hash: string;
}

export declare namespace TypedRef {
  export function create(schemaHash: string, payload: unknown): Promise<TypedRef>;
  export function equals(a: TypedRef, b: TypedRef): boolean;
  export function canonicalize(value: unknown): Uint8Array;
  export function hash(data: string | Uint8Array): Promise<string>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 18. HLC (Hybrid Logical Clock)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * A managed HLC clock handle — a plain (Effect-free) mutable holder over the pure
 * increment/merge ops, reading wall time through an injected {@link Clock} (Wave 6).
 * `tick`/`receive` advance the closure-held timestamp and return it; `current`
 * reads without advancing.
 */
export interface HLCClock {
  tick(): HLC;
  receive(remote: HLC): HLC;
  current(): HLC;
}

export declare const HLC: {
  create(nodeId: string): HLC;
  compare(a: HLC, b: HLC): -1 | 0 | 1;
  increment(hlc: HLC, now?: number): HLC;
  merge(local: HLC, remote: HLC, now?: number): HLC;
  encode(hlc: HLC): string;
  decode(s: string): HLC;
  makeClock(nodeId: string, clock?: Clock): HLCClock;
};

// ═══════════════════════════════════════════════════════════════════════════════
// § 19. VECTOR CLOCK
// ═══════════════════════════════════════════════════════════════════════════════

/** Immutable peer-counter map used for causal ordering. */
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

/** Stable identity of the artifact or definition described by a receipt. */
export interface ReceiptSubject {
  readonly type: 'effect' | 'run' | 'artifact' | 'intent';
  readonly id: string;
}

/** Hash-linked receipt carrying deterministic evidence payload and causality. */
export interface ReceiptEnvelope {
  readonly kind: string;
  readonly timestamp: HLC;
  readonly subject: ReceiptSubject;
  readonly payload: TypedRef;
  readonly hash: string;
  readonly previous: string | readonly string[];
  readonly signature?: string;
}

/** Closed reasons a receipt chain can fail structural or cryptographic validation. */
export type ChainValidationError =
  | { readonly type: 'not_genesis'; readonly index: 0 }
  | { readonly type: 'hash_mismatch'; readonly index: number; readonly computed: string; readonly stored: string }
  | { readonly type: 'chain_break'; readonly index: number; readonly expected: string; readonly actual: string }
  | { readonly type: 'hlc_not_increasing'; readonly index: number }
  | { readonly type: 'checkpoint_invalid'; readonly reason: string };

/** Optional trust material and bounds used while validating a receipt chain. */
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
  readonly verifyCheckpoint?: (checkpoint: ReceiptEnvelope) => Promise<boolean>;
}

/** Construct, validate, authenticate, and query receipt chains. */
export declare const Receipt: {
  readonly GENESIS: string;
  createEnvelope(
    kind: string,
    subject: ReceiptSubject,
    payload: TypedRef,
    timestamp: HLC,
    previousHash: string | readonly string[],
  ): Promise<ReceiptEnvelope>;
  buildChain(
    entries: ReadonlyArray<{ kind: string; subject: ReceiptSubject; payload: TypedRef; timestamp: HLC }>,
  ): Promise<ReceiptEnvelope[]>;
  /**
   * Ergonomic everyday chain check: resolves only to `true`; every
   * violation arrives on the `Error` channel as a human-readable message.
   * @see validateChainDetailed for typed ChainValidationError handling.
   */
  validateChain(chain: ReadonlyArray<ReceiptEnvelope>, options?: ChainValidationOptions): Promise<boolean>;
  /**
   * Typed taxonomy for programmatic handling: fails with the
   * `ChainValidationError` discriminated union
   * (not_genesis | hash_mismatch | chain_break | hlc_not_increasing | checkpoint_invalid).
   * Pass `options.base`/`options.checkpoint` to validate a compacted tail.
   * @see validateChain for the simple Error-channel form.
   */
  validateChainDetailed(chain: ReadonlyArray<ReceiptEnvelope>, options?: ChainValidationOptions): Promise<true>;
  hashEnvelope(envelope: ReceiptEnvelope): Promise<string>;
  isGenesis(receipt: ReceiptEnvelope): boolean;
  head(chain: ReadonlyArray<ReceiptEnvelope>): ReceiptEnvelope | undefined;
  tail(chain: ReadonlyArray<ReceiptEnvelope>): ReceiptEnvelope | undefined;
  append(
    chain: ReadonlyArray<ReceiptEnvelope>,
    entry: { kind: string; subject: ReceiptSubject; payload: TypedRef; timestamp: HLC },
    previousHashes?: readonly string[],
  ): Promise<ReceiptEnvelope[]>;
  findByHash(chain: ReadonlyArray<ReceiptEnvelope>, hash: string): ReceiptEnvelope | undefined;
  findByKind(chain: ReadonlyArray<ReceiptEnvelope>, kind: string): ReceiptEnvelope[];
  generateMACKey(): Promise<CryptoKey>;
  macEnvelope(envelope: ReceiptEnvelope, key: CryptoKey): Promise<ReceiptEnvelope>;
  verifyMAC(envelope: ReceiptEnvelope, key: CryptoKey): Promise<boolean>;
};

// ═══════════════════════════════════════════════════════════════════════════════
// § 21. DAG
// ═══════════════════════════════════════════════════════════════════════════════

/** One receipt and its parent hashes in a receipt DAG. */
export interface DAGNode {
  readonly envelope: ReceiptEnvelope;
  readonly parents: ReadonlyArray<string>;
  readonly children: ReadonlyArray<string>;
}

/** Indexed receipt graph with head tracking and canonical ordering. */
export interface ReceiptDAG {
  readonly nodes: ReadonlyMap<string, DAGNode>;
  readonly heads: ReadonlyArray<string>;
  readonly genesis: string | null;
}

/** Result of merging receipt DAGs, including conflicts and resulting heads. */
export interface MergeResult {
  readonly dag: ReceiptDAG;
  readonly added: ReadonlyArray<string>;
  readonly forked: boolean;
}

/** Evidence that a receipt graph violates its declared fork policy. */
export interface ForkViolation {
  readonly actor: string;
  readonly prevHash: string;
  readonly existing: string;
  readonly attempted: string;
}

/** Result of anchoring or validating a checkpoint in a receipt graph. */
export interface CheckpointResult {
  readonly dag: ReceiptDAG;
  readonly checkpoint: ReceiptEnvelope;
  readonly dropped: ReadonlyArray<string>;
}

/** Build and query the receipt directed acyclic graph. */
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
  checkpoint(dag: ReceiptDAG, options: { readonly below: string }): Promise<CheckpointResult>;
  /** Rebuild the DAG from its survivors after dropping a checkpoint region (pure). */
  spliceCheckpoint(dag: ReceiptDAG, dropSet: ReadonlySet<string>): ReceiptDAG;
};

// ═══════════════════════════════════════════════════════════════════════════════
// § 22. PLAN
// ═══════════════════════════════════════════════════════════════════════════════

/** Operation kinds represented by a plan step. */
export type OpType =
  | { readonly type: 'pure'; readonly fn?: string }
  | { readonly type: 'effect'; readonly fn?: string }
  | { readonly type: 'spawn'; readonly key: string; readonly spec: Record<string, unknown> }
  | { readonly type: 'domain'; readonly domain: string; readonly op: string }
  | { readonly type: 'choice'; readonly condition: unknown }
  | { readonly type: 'noop' };

/** Control-flow relation between two plan steps. */
export type EdgeType = 'seq' | 'par' | 'choice_then' | 'choice_else';

// ════════════════════════════════════════════════════════════════════════════════
// § 22a. MOTION RUNTIME PROJECTION
// ════════════════════════════════════════════════════════════════════════════════

/** Partial transform components composed into a rendered transform value. */
export interface TransformPart {
  readonly fn: string;
  readonly args: readonly TypedValue[];
}

/** Color spaces supported by typed runtime motion values. */
export type ColorSpace = 'srgb' | 'oklch';

/** Runtime value whose unit or color space is explicit in the type. */
export type TypedValue =
  | { readonly k: 'number'; readonly v: number }
  | { readonly k: 'opacity'; readonly v: number }
  | { readonly k: 'length'; readonly v: number; readonly unit: 'px' | 'rem' | '%' | 'vw' | 'vh' }
  | { readonly k: 'angle'; readonly v: number; readonly unit: 'deg' | 'rad' | 'turn' }
  | { readonly k: 'color'; readonly space: ColorSpace; readonly components: readonly number[] }
  | { readonly k: 'transform'; readonly parts: readonly TransformPart[] };

/** Serializable easing descriptor consumed by runtime write plans. */
export interface RuntimeEasing {
  readonly kind: 'linear' | 'ease' | 'spring' | 'points' | 'bounce' | 'elastic' | 'back' | 'cubicBezier';
  readonly spring?: {
    readonly stiffness?: number;
    readonly damping?: number;
    readonly mass?: number;
  };
  readonly points?: readonly number[];
}

/** One property transition from a typed source value to a typed target value. */
export interface RuntimeWriteProperty {
  readonly cssVar: string;
  readonly from: TypedValue;
  readonly to: TypedValue;
}

/** Timed write window containing the properties active over one interval. */
export interface RuntimeWriteWindow {
  readonly windowStart: number;
  readonly windowEnd: number;
  readonly properties: readonly RuntimeWriteProperty[];
  readonly easing: RuntimeEasing;
}

/** Deterministic sequence of runtime property-write windows. */
export interface RuntimeWritePlan {
  readonly properties: readonly RuntimeWriteProperty[];
  readonly durationMs: number;
  readonly routing: EdgeType;
  readonly fromState: StateName;
  readonly toState: StateName;
  readonly easing: RuntimeEasing;
  readonly windows?: readonly RuntimeWriteWindow[];
}

/** Uniform values bound while executing a plan program. */
export interface ProgramUniforms {
  readonly css: Record<string, string>;
  readonly wgsl: Record<string, number>;
}

/** One named operation and dependencies in a plan IR. */
export interface PlanStep {
  readonly id: string;
  readonly name: string;
  readonly opType: OpType;
  readonly metadata?: Record<string, unknown>;
}

/** Typed directed edge between two plan steps. */
export interface PlanEdge {
  readonly from: string;
  readonly to: string;
  readonly type: EdgeType;
}

/** Immutable directed execution plan consumed by runtime coordinators. */
export interface PlanIR {
  readonly name: string;
  readonly steps: readonly PlanStep[];
  readonly edges: readonly PlanEdge[];
  readonly metadata?: Record<string, unknown>;
}

/** Closed structural errors produced by plan validation. */
export type PlanValidationError =
  | { readonly type: 'cycle'; readonly message: string; readonly stepIds?: readonly string[] }
  | { readonly type: 'missing_step'; readonly message: string; readonly stepIds?: readonly string[] };

/** Success or bounded failure result from plan validation. */
export type PlanValidationResult =
  | { readonly ok: true; readonly plan: PlanIR }
  | { readonly ok: false; readonly errors: readonly PlanValidationError[] };

/** Topological plan order or the cycle that prevents one. */
export type TopoSortResult =
  | { readonly sorted: readonly string[]; readonly cycle?: undefined }
  | { readonly sorted: readonly string[]; readonly cycle: readonly string[] };

/** Fluent builder that emits an immutable plan IR. */
export interface PlanBuilder {
  step(name: string, opType: OpType, metadata?: Record<string, unknown>): PlanBuilder;
  seq(fromId: string, toId: string): PlanBuilder;
  par(fromId: string, toId: string): PlanBuilder;
  choice(fromId: string, thenId: string, elseId: string): PlanBuilder;
  build(): PlanIR;
}

/** Constructors, validation, and topological ordering for plan IR. */
export declare namespace Plan {
  export function make(name: string): PlanBuilder;
  export function validate(planIR: PlanIR): PlanValidationResult;
  export function topoSort(planIR: PlanIR): TopoSortResult;
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

/** Bidirectional schema-backed codec between input and decoded values. */
export interface Codec<A, I = A> {
  readonly schema: SchemaPort<A, I>;
  /** Validate a domain value into its wire form. Sync `Result` — never an Effect (Wave 8). */
  encode(value: A): Codec.Result<I, Codec.ParseError>;
  /** Validate untrusted input into the typed value. Sync `Result` — never an Effect (Wave 8). */
  decode(input: unknown): Codec.Result<A, Codec.ParseError>;
}

export declare namespace Codec {
  /**
   * The sync tagged result a codec method returns — structurally `@liteship/error`'s
   * `Result<A, E>` (a success arm carrying `A`, or a failure arm carrying `E`,
   * discriminated by the boolean `ok`). Named structurally here rather than
   * imported so the spine stays install-only with zero `@liteship` runtime deps
   * (ADR-0010); parity with the runtime `Result` is pinned bidirectionally in
   * tests/unit/spine-conformance.test.ts.
   */
  export type Result<A, E> = { readonly ok: true; readonly value: A } | { readonly ok: false; readonly error: E };

  /**
   * The encode/decode failure — structurally `@liteship/error`'s `ParseError`
   * variant (a `TaggedError<'ParseError'>` carrying `source`/`detail` and the
   * optional machine fields `code`/`offset`). Parity pinned in the same test.
   */
  export interface ParseError {
    readonly _tag: 'ParseError';
    readonly message: string;
    readonly source: string;
    readonly detail: string;
    readonly code?: string;
    readonly offset?: number;
  }

  /** Wrap an identity kernel schema (`SchemaPort<A, A>`) in the {@link Codec} facade. */
  export function make<A>(schema: SchemaPort<A, A>): Codec<A, A>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 24. FRAME SCHEDULER
// ═══════════════════════════════════════════════════════════════════════════════

/** Host-neutral frame scheduler used by animation and quantization runtimes. */
export interface Scheduler {
  readonly _tag: 'FrameScheduler';
  schedule(callback: (now: number) => void): number;
  cancel(id: number): void;
}

export declare namespace Scheduler {
  export interface FixedStep extends Scheduler {
    step(): void;
    readonly frame: number;
  }

  export function raf(): Scheduler;
  export function noop(): Scheduler;
  export function fixedStep(fps: number): FixedStep;
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 25. VIDEO RENDERER
// ═══════════════════════════════════════════════════════════════════════════════

/** Dimensions, frame rate, and duration of a video render schedule. */
export interface VideoConfig {
  readonly fps: number;
  readonly width: number;
  readonly height: number;
  readonly durationMs: Millis;
}

/** One scheduled video frame and the compositor state that produced it. */
export interface VideoFrameOutput {
  readonly frame: number;
  readonly timestamp: number;
  readonly progress: number;
  readonly state: CompositeState;
}

/** One deterministic coordinate in an offline frame schedule. */
export interface ScheduledFrame {
  readonly frame: number;
  readonly timestamp: number;
  readonly progress: number;
}

/** Host-neutral frame timing shared by every renderer adapter. */
export interface FrameSchedule extends Iterable<ScheduledFrame> {
  readonly fps: number;
  readonly durationMs: Millis;
  readonly totalFrames: number;
  at(frame: number): ScheduledFrame;
}

/** Canonical frame scheduler over a compositor and video configuration. */
export interface VideoRenderer {
  readonly config: VideoConfig;
  readonly schedule: FrameSchedule;
  readonly totalFrames: number;
  readonly scheduler: Scheduler.FixedStep;
  frames(): AsyncGenerator<VideoFrameOutput>;
}

/** Create the shared deterministic frame schedule for one duration and fps. */
export declare function createFrameSchedule(config: Pick<VideoConfig, 'fps' | 'durationMs'>): FrameSchedule;

/** Create a deterministic video renderer. */
export declare function createVideoRenderer(
  config: VideoConfig,
  compositor: Compositor,
  signal?: Signal.Controllable<number>,
): VideoRenderer;

// ═══════════════════════════════════════════════════════════════════════════════
// § 26. CAPTURE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Browser capture dimensions, frame rate, duration, and codec preferences. */
export interface CaptureConfig {
  readonly width: number;
  readonly height: number;
  readonly fps: number;
}

/** One timestamped RGBA frame emitted by a capture source. */
export interface CaptureFrame {
  readonly frame: number;
  readonly timestamp: number;
  readonly bitmap: ImageBitmap | OffscreenCanvas;
}

/** Live browser capture handle with one async-uniform encoder lifecycle. */
export interface FrameCapture extends AsyncOwnedResource {
  readonly _tag: 'FrameCapture';
  init(config: CaptureConfig): Promise<void>;
  capture(frame: CaptureFrame): Promise<void>;
  finalize(): Promise<CaptureResult>;
}

/** Completed capture bytes and their media metadata. */
export interface CaptureResult {
  readonly blob: Blob;
  readonly codec: string;
  readonly frames: number;
  readonly durationMs: Millis;
}
