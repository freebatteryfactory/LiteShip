/**
 * @liteship/web type spine -- DOM runtime (morph, slots, SSE, physical state).
 * Salvaged from @kit/web, rebranded data-kit-* -> data-liteship-*.
 */

import type { AsyncOwnedResource, Millis } from './core.js';

// ═══════════════════════════════════════════════════════════════════════════════
// § 1. CORE WEB TYPES (from @kit/web/types.ts)
// ═══════════════════════════════════════════════════════════════════════════════

/** Branded absolute path identifying a DOM morphing slot. */
export type SlotPath = `/${string}` & { readonly _brand: 'SlotPath' };
/** Hydration capability selected for one registered island. */
export type IslandMode = 'static' | 'partial' | 'rich' | 'gpu';

/** Registered DOM slot, its element, and current island mode. */
export interface SlotEntry {
  readonly path: SlotPath;
  readonly element: Element;
  readonly mode: IslandMode;
  readonly mounted: boolean;
}

/**
 * Input accepted by `SlotRegistry.register`. Registered entries are
 * normalized to a full {@link SlotEntry}: `mode` defaults to `'partial'`
 * and `mounted` defaults to `true`.
 */
export interface SlotEntryInput {
  readonly path: SlotPath;
  readonly element: Element;
  readonly mode?: IslandMode;
  readonly mounted?: boolean;
}

/** Browser state captured before DOM morphing and restored afterward. */
export interface PhysicalState {
  readonly activeElementPath: string | null;
  readonly focusState: FocusState | null;
  readonly scrollPositions: Record<string, ScrollPosition>;
  readonly selection: SelectionState | null;
  readonly ime: IMEState | null;
}

/** Focused element and text-selection offsets captured from the DOM. */
export interface FocusState {
  readonly elementId: string;
  readonly cursorPosition: number;
  readonly selectionStart: number;
  readonly selectionEnd: number;
  readonly selectionDirection: string;
}

/** Scroll coordinates retained for one document or element path. */
export interface ScrollPosition {
  readonly top: number;
  readonly left: number;
}

/** Serialized browser selection endpoints and direction. */
export interface SelectionState {
  readonly elementPath: string;
  readonly start: number;
  readonly end: number;
  readonly direction: string;
}

/** Input-method composition state retained across DOM updates. */
export interface IMEState {
  readonly elementPath: string;
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

/** Explicit owner for document-level IME listeners and physical-state capture. */
export interface PhysicalStateTracker extends AsyncOwnedResource {
  capture(root: Element): PhysicalState;
  captureIME(): IMEState | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// § 2. MORPH (idiomorph-style DOM diffing)
// ═══════════════════════════════════════════════════════════════════════════════

/** Optional identity and preservation hints applied during DOM matching. */
export interface MorphHints {
  readonly preserveIds?: readonly string[];
  readonly semanticIds?: readonly string[];
  readonly idMap?: ReadonlyMap<string, string>;
  readonly preserveFocus?: readonly string[];
  readonly preserveScroll?: readonly string[];
  readonly preserve?: readonly string[];
  readonly remap?: Record<string, string>;
}

/** Safety, matching, and preservation options for one DOM morph. */
export interface MorphConfig {
  readonly preserveFocus: boolean;
  readonly preserveScroll: boolean;
  readonly preserveSelection: boolean;
  readonly morphStyle: 'innerHTML' | 'outerHTML';
  readonly callbacks?: MorphCallbacks;
}

/** Lifecycle callbacks emitted around a DOM morph operation. */
export interface MorphCallbacks {
  beforeRemove?(node: Node): boolean;
  afterAdd?(node: Node): void;
  beforeAttributeUpdate?(element: Element, name: string, value: string | null): boolean;
}

/** Success or explicit rejection returned by a DOM morph. */
export type MorphResult =
  { readonly type: 'success' } | { readonly type: 'rejected'; readonly rejection: MorphRejection };

/** Stable reason and context for a refused DOM morph. */
export interface MorphRejection {
  /** Closed union of the rejection kinds the runtime emits. */
  readonly type: 'preserve_violation';
  readonly missingIds?: readonly string[];
  readonly slot?: SlotPath;
  readonly reason: string;
  /** Literal next step for the consumer rendering the rejection. */
  readonly hint?: string;
}

export declare const Morph: {
  morph(oldNode: Element, newHTML: string, config?: Partial<MorphConfig>, hints?: MorphHints): void;
  morphWithState(
    oldNode: Element,
    newHTML: string,
    config?: Partial<MorphConfig>,
    hints?: MorphHints,
    physicalStateTracker?: Pick<PhysicalStateTracker, 'capture'>,
  ): MorphResult;
  parseHTML(html: string): DocumentFragment;
  readonly defaultConfig: MorphConfig;
};

// ═══════════════════════════════════════════════════════════════════════════════
// § 3. SEMANTIC ID
// ═══════════════════════════════════════════════════════════════════════════════

/** Match authority used to pair old and new DOM nodes. */
export type MatchPriority = 'semantic' | 'dom-id' | 'structural' | 'none';

/** Node match together with the evidence that justified it. */
export interface MatchResult {
  readonly matches: boolean;
  readonly priority: MatchPriority;
  readonly matchedId?: string;
}

export declare const SemanticId: {
  readonly ATTR: string;
  get(element: Element): string | null;
  set(element: Element, id: string): void;
  matches(a: Element, b: Element): boolean;
  generate(element: Element, index: number): string;
  buildIndex(root: Element): Map<string, Element>;
  find(root: Element, id: string): Element | null;
  matchNodes(oldNode: Element, newNode: Element): MatchResult;
  findBestMatch(target: Element, candidates: Element[]): { element: Element; result: MatchResult } | null;
};

// ═══════════════════════════════════════════════════════════════════════════════
// § 4. MORPH HINTS
// ═══════════════════════════════════════════════════════════════════════════════

export declare const Hints: {
  empty(): MorphHints;
  preserveIds(...ids: string[]): MorphHints;
  withSemanticIds(...ids: string[]): MorphHints;
  withIdMap(map: Map<string, string>): MorphHints;
  preserveFocus(...selectors: string[]): MorphHints;
  preserveScroll(...selectors: string[]): MorphHints;
  merge(...hints: MorphHints[]): MorphHints;
  fromElement(element: Element): MorphHints;
};

// ═══════════════════════════════════════════════════════════════════════════════
// § 5. SLOT REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

/** Live registry that owns DOM slots and observes their lifecycle. */
export interface SlotRegistry {
  get(path: SlotPath): SlotEntry | undefined;
  register(entry: SlotEntryInput): void;
  unregister(path: SlotPath): void;
  has(path: SlotPath): boolean;
  entries(): ReadonlyMap<SlotPath, SlotEntry>;
  findByPrefix(prefix: SlotPath): readonly SlotEntry[];
}

export declare const SlotRegistry: {
  create(): SlotRegistry;
  scanDOM(registry: SlotRegistry, root: Element, defaultMode?: IslandMode): void;
  /**
   * Attach a MutationObserver and return its disposer (was
   * `Effect.Effect<void, never, Scope>`): register the returned function on a
   * {@link Lifetime}, or call it directly, to disconnect the observer.
   */
  observe(registry: SlotRegistry, root: Element): () => void;
  findElement(path: SlotPath): Element | null;
  getPath(element: Element): SlotPath | null;
};

// ═══════════════════════════════════════════════════════════════════════════════
// § 6. SLOT ADDRESSING
// ═══════════════════════════════════════════════════════════════════════════════

export declare const SlotAddressing: {
  parse(path: string): SlotPath;
  isValid(path: string): path is SlotPath;
  toSelector(path: SlotPath): string;
  parent(path: SlotPath): SlotPath | null;
  ancestors(path: SlotPath): readonly SlotPath[];
  isDescendant(path: SlotPath, ancestor: SlotPath): boolean;
  join(base: SlotPath, ...segments: string[]): SlotPath;
  basename(path: SlotPath): string;
};

// ═══════════════════════════════════════════════════════════════════════════════
// § 7. SSE CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

/** Observable lifecycle states of an SSE client. */
export type SSEState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error';

/** Backpressure policy applied when an SSE queue reaches capacity. */
export type OverflowPolicy = 'drop-newest' | 'drop-oldest' | 'coalesce-by-id';

/** Category of remote runtime endpoint governed by a host policy. */
export type RuntimeEndpointKind = 'stream' | 'snapshot' | 'replay' | 'llm' | 'gpu-shader' | 'wasm';

/** Origin policy applied at runtime network boundaries. */
export interface RuntimeEndpointPolicy {
  readonly mode: 'same-origin' | 'allowlist';
  readonly allowOrigins?: readonly string[];
  readonly byKind?: Partial<Record<RuntimeEndpointKind, readonly string[]>>;
}

/** Endpoint, retry, heartbeat, and queue options for an SSE client. */
export interface SSEConfig {
  readonly url: string;
  readonly artifactId?: string;
  readonly lastEventId?: string;
  /**
   * Partial overrides are merged over `defaultReconnectConfig`
   * (maxAttempts 10, initialDelay 1000ms, maxDelay 30000ms, factor 2).
   */
  readonly reconnect?: Partial<ReconnectConfig>;
  readonly heartbeatInterval?: Millis;
  /** Overflow policy applied when the receive buffer saturates (default `coalesce-by-id`). */
  readonly overflow?: OverflowPolicy;
  /**
   * Synchronous message sink. When set, each parsed message is delivered to this
   * callback inside `onmessage` (after the `parseMessage` preflight) and the async
   * `messages` Stream + overflow buffer are bypassed — a synchronous consumer
   * holds no buffer. Use for in-dispatch-turn processing (the live directives).
   */
  readonly onMessage?: (message: SSEMessage) => void;
  /** Synchronous state-transition sink — the callback form of `stateChanges`. */
  readonly onStateChange?: (state: SSEState) => void;
}

/** Bounded exponential-backoff parameters for SSE reconnection. */
export interface ReconnectConfig {
  readonly maxAttempts: number;
  readonly initialDelay: Millis;
  readonly maxDelay: Millis;
  readonly factor: number;
}

/** Queue pressure evidence exposed to an SSE producer or consumer. */
export interface BackpressureHint {
  readonly bufferSize: number;
  readonly maxBufferSize: number;
  readonly percentFull: number;
  readonly dropping: boolean;
  readonly policy: OverflowPolicy;
  readonly droppedCount: number;
  readonly coalescedCount: number;
}

/** Live resumable SSE client with explicit connection and teardown control. */
export interface SSEClient extends AsyncOwnedResource {
  /** Live message stream (was `Stream.Stream<SSEMessage>`). */
  readonly messages: AsyncIterable<SSEMessage>;
  /** Current connection state — a plain synchronous read (was `Effect.Effect<SSEState>`). */
  readonly state: SSEState;
  /** Live state-transition stream (was `Stream.Stream<SSEState>`). */
  readonly stateChanges: AsyncIterable<SSEState>;
  reconnect(): void;
  /** Current per-connection cursor — a plain synchronous read (was `Effect.Effect<string | null>`). */
  readonly lastEventId: string | null;
  /** Current backpressure hint — a plain synchronous read (was `Effect.Effect<BackpressureHint>`). */
  readonly backpressure: BackpressureHint;
}

/** Parsed data, heartbeat, or control message received over SSE. */
export type SSEMessage =
  | { readonly type: 'patch'; readonly data: unknown }
  | { readonly type: 'batch'; readonly data: unknown }
  | { readonly type: 'signal'; readonly data: unknown }
  | { readonly type: 'receipt'; readonly data: unknown }
  | { readonly type: 'heartbeat' }
  | { readonly type: 'snapshot'; readonly data: unknown };

export declare const SSE: {
  /** Open a live SSE connection synchronously; `await client.dispose()` is its one teardown protocol. */
  create(config: SSEConfig): SSEClient;
  parseMessage(event: MessageEvent): SSEMessage | null;
  calculateDelay(attempt: number, config: ReconnectConfig): number;
  buildUrl(baseUrl: string, artifactId?: string, lastEventId?: string): string;
};

// ═══════════════════════════════════════════════════════════════════════════════
// § 8. RESUMPTION
// ═══════════════════════════════════════════════════════════════════════════════

/** Bounds and storage hooks used to resume an interrupted event stream. */
export interface ResumptionConfig {
  /**
   * Maximum number of missed events recoverable via patch replay before
   * falling back to a full snapshot.
   *
   * Default: 50 — see `defaultResumptionConfig`; `Resumption.resume` accepts a `Partial`.
   */
  readonly maxGapSize: number;
  readonly snapshotUrl?: string;
  readonly replayUrl?: string;
  readonly timeout?: Millis;
  readonly endpointPolicy?: RuntimeEndpointPolicy;
}

/** Last accepted event identity and buffered recovery state. */
export interface ResumptionState {
  readonly lastEventId: string;
  readonly lastSequence: number;
  readonly artifactId: string;
  readonly timestamp: number;
}

/**
 * Input accepted by `Resumption.saveState`. The stored shape keeps
 * `timestamp` required; on input it defaults to `Date.now()` — only the
 * engine reads it.
 */
export type ResumptionStateInput = Omit<ResumptionState, 'timestamp'> & {
  readonly timestamp?: number;
};

/** Host response to a stream-resumption request. */
export type ResumeResponse =
  | { readonly type: 'replay'; readonly patches: readonly unknown[] }
  | { readonly type: 'snapshot'; readonly html: string; readonly signals: unknown; readonly lastEventId: string };

export declare const Resumption: {
  /** Persist the resume cursor synchronously (was `Effect.Effect<void>`). */
  saveState(state: ResumptionStateInput): void;
  /** Read the persisted cursor synchronously (was `Effect.Effect<ResumptionState | null>`). */
  loadState(artifactId: string): ResumptionState | null;
  /** Drop the persisted cursor synchronously (was `Effect.Effect<void>`). */
  clearState(artifactId: string): void;
  canResume(lastEventId: string, serverOldestId: string): boolean;
  /** Reconcile the replay gap — Promise-first, rejecting with a tagged `@liteship/error` (was `Effect.Effect<ResumeResponse, Error>`). */
  resume(artifactId: string, currentEventId: string, config?: Partial<ResumptionConfig>): Promise<ResumeResponse>;
  parseEventId(eventId: string): { raw: string; sequence: number; timestamp?: number; nodeId?: string };
};

// ═══════════════════════════════════════════════════════════════════════════════
// § 9. PHYSICAL STATE (capture + restore)
// ═══════════════════════════════════════════════════════════════════════════════

export declare const Physical: {
  /** Snapshot passive focus, selection, and scroll state synchronously. */
  capture(root: Element): PhysicalState;
  /** Install explicitly owned IME listeners for capture across morphs. */
  createTracker(ownerDocument: Document): PhysicalStateTracker;
  /** Reapply captured DOM state synchronously (was `Effect.Effect<void>`). */
  restore(state: PhysicalState, root: Element, remap?: Record<string, string>): void;
};

/** Allocate one explicitly owned IME-composition tracker for a browser document. */
export declare function createPhysicalStateTracker(ownerDocument: Document): PhysicalStateTracker;

// ═══════════════════════════════════════════════════════════════════════════════
// § 10. CAPTURE (WebCodecs video encoding)
// ═══════════════════════════════════════════════════════════════════════════════

import type {
  FrameCapture,
  CaptureConfig,
  CaptureFrame,
  CaptureResult,
  CompositeState,
  VideoRenderer,
} from './core.js';

/** Canvas, timing, and codec options for browser video capture. */
export interface WebCodecsCaptureOptions {
  readonly codec?: string;
  readonly bitrate?: number;
  readonly keyframeInterval?: number;
}

/** Canvas surface accepted by browser capture rendering. */
export type Canvas2DTarget = OffscreenCanvas | HTMLCanvasElement;

/** 2D context produced by a browser capture target. */
export type RenderContext2D = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

/** Host renderer invoked for each browser-capture frame. */
export type RenderFn = (ctx: RenderContext2D, state: CompositeState, canvas: Canvas2DTarget) => void;

/** Allocate a browser WebCodecs capture with one async-uniform lifecycle. */
export declare function createWebCodecsCapture(options?: WebCodecsCaptureOptions): FrameCapture;

export declare function renderToCanvas(state: CompositeState, canvas: OffscreenCanvas, renderFn?: RenderFn): void;

export declare function captureVideo(
  renderer: VideoRenderer,
  capture: FrameCapture,
  renderFn?: RenderFn,
): Promise<CaptureResult>;
