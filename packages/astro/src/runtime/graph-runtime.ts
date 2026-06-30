/**
 * Runtime DocumentGraph LOADER — lower a serialized graph onto the EXISTING live
 * cast pipeline, with a delta re-cast seam.
 *
 * This is a runtime PRIMITIVE (a loader), NOT an editor. The producer that
 * SERIALIZES a {@link DocumentGraph} is downstream / out of scope; this module
 * only consumes one and drives the boundary runtime that
 * `client:satellite` already uses.
 *
 * THE FLOW ({@link loadGraphRuntime}):
 *   parse JSON (if a string)
 *     → `validateGraph` (structural integrity) + per-node `isWellFormedNode`
 *       (the SHARED trust gate, same one the AI seam reads — untrusted JSON)
 *     → `sealGraph` (RE-ADDRESS; never trust the supplied id/digest)
 *     → `lowerGraph` (graph → ordered {@link LoweredBinding}s)
 *     → per binding: resolve the element, SEED the initial state
 *       (`readSignalValue` → `evaluateBoundary` → `applyBoundaryState`), then
 *       `attachSignalObserver(input, recompute)`.
 *   Returns `null` on a malformed / invalid graph (the `parseBoundary` posture:
 *   degrade cleanly, never throw mid-hydration).
 *
 * THE DELTA SEAM ({@link castGraphDelta}): `GraphPatch.diff(prev, next)` →
 * re-lower ONLY the entities the patch touched (detach their old observers,
 * re-seed, re-attach); untouched entities keep their live observers. `recast` is
 * the handle method that wraps `GraphPatch.apply` + this delta. The delta helper
 * is EXPORTED so the AI seam (a separate item) can reuse the exact re-cast path
 * a validated `GraphPatch` should drive — one delta engine, two callers.
 *
 * SSR-safe: observer attachment is guarded (`boundary.ts`'s `attachSignalObserver`
 * returns `null` off-DOM), and the loader resolves elements through a host
 * callback, so importing this module on the server is inert.
 *
 * @module
 */

import {
  Diagnostics,
  GraphPatch,
  sealGraph,
  sealNode,
  validateGraph,
  isWellFormedNode,
  type ContentAddress,
  type DocumentGraph,
  type DocumentGraphNode,
  type DocumentGraphEdge,
} from '@czap/core';
import {
  applyBoundaryState,
  evaluateBoundary,
  readSignalValue,
  attachSignalObserver,
  warnIfSignalUnserved,
} from './boundary.js';
import { lowerGraph, type LoweredBinding } from './graph-lower.js';

/** Default custom-event name the seeded/recomputed state dispatches on (mirrors the satellite directive). */
const DEFAULT_EVENT_NAME = 'czap:graph-state';
const EDGE_TYPES = new Set(['seq', 'par', 'choice_then', 'choice_else']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function isDocumentGraphEdge(value: unknown): value is DocumentGraphEdge {
  return (
    isRecord(value) &&
    typeof value.from === 'string' &&
    typeof value.to === 'string' &&
    typeof value.type === 'string' &&
    EDGE_TYPES.has(value.type)
  );
}

/**
 * Host callback mapping an entity's content address to its live DOM element. The
 * loader owns NO element-discovery policy (an entity → element mapping is a host
 * concern: a `data-czap-entity` attribute, a registry, a ref map…), so the host
 * injects this. Returning `null`/`undefined` SKIPS that binding (no element yet).
 */
export type EntityElementResolver = (entityId: ContentAddress) => HTMLElement | null | undefined;

/** A single bound entity: its element, its lowered boundary, and the live observer cleanup (if any). */
interface ActiveBinding {
  readonly binding: LoweredBinding;
  readonly element: HTMLElement;
  /** Last applied discrete state — feeds hysteresis on recompute. */
  state: string;
  /** Observer cleanup, or null when the signal has no live observer (frozen). */
  cleanup: (() => void) | null;
}

/**
 * The OPAQUE live-cast state a graph runtime keeps: entity address → its active
 * binding (element + observer). Exported as an opaque handle so the AI seam can
 * own its own state across {@link castGraphDelta} calls and {@link releaseCastState}
 * teardown WITHOUT learning the internal {@link ActiveBinding} shape.
 */
export interface GraphCastState {
  /**
   * @internal — the entity → active-bindings registry. Treat as opaque.
   *
   * Keyed by entityId, valued by an ARRAY: one {@link EntityNode} with multiple
   * {@link ComponentNode}s lowers to MULTIPLE bindings that all share the same
   * entityId, so a single-binding-per-entity map would overwrite (and leak) all
   * but the last. Every entity's bindings live in its array, and seed / recast /
   * release iterate the whole array.
   */
  readonly active: Map<ContentAddress, ActiveBinding[]>;
}

/** Create a fresh, empty {@link GraphCastState} for a delta-driven re-cast caller (e.g. the AI seam). */
export function createCastState(): GraphCastState {
  return { active: new Map<ContentAddress, ActiveBinding[]>() };
}

/** Detach every observer held by a {@link GraphCastState}. Idempotent. */
export function releaseCastState(state: GraphCastState): void {
  for (const entries of state.active.values()) for (const entry of entries) entry.cleanup?.();
  state.active.clear();
}

/**
 * Handle over a loaded graph runtime. `graph` is the CURRENT (sealed) graph;
 * `recast` advances it by a patch through the delta seam; `release` detaches
 * every live observer.
 */
export interface GraphRuntimeHandle {
  /** The current sealed graph the runtime reflects. */
  readonly graph: DocumentGraph;
  /**
   * Advance the runtime by a {@link GraphPatch}: apply it (re-addressing through
   * the one kernel), re-cast ONLY the entities the delta touched, and return the
   * new graph. Untouched entities keep their live observers.
   */
  recast(patch: GraphPatch): DocumentGraph;
  /** Detach every live observer. Idempotent. */
  release(): void;
}

/** Apply a discrete state to a binding's element, threading the lowered per-state CSS into `state.css`. */
function applyBindingState(active: ActiveBinding, state: string, eventName: string): void {
  const css = active.binding.stateCss?.[state];
  applyBoundaryState(
    active.element,
    active.binding.boundary,
    { discrete: { [active.binding.boundary.name]: state }, ...(css ? { css } : {}) },
    eventName,
  );
}

function applyEntityState(
  state: GraphCastState,
  entityId: ContentAddress,
  nextState: string,
  eventName: string,
): boolean {
  const entries = state.active.get(entityId);
  if (!entries) return false;
  let applied = false;
  for (const active of entries) {
    if (!(active.binding.boundary.boundary.states as readonly string[]).includes(nextState)) continue;
    active.state = nextState;
    applyBindingState(active, nextState, eventName);
    applied = true;
  }
  return applied;
}

/** Seed (or re-seed) a binding's initial state from the live signal value and apply it to the element. */
function seedBinding(active: ActiveBinding, eventName: string): void {
  warnIfSignalUnserved(active.binding.boundary.input, { source: 'czap/astro.graph', what: 'boundary signal' });
  const value = readSignalValue(active.binding.boundary.input);
  if (value === undefined) return;
  const state = evaluateBoundary(active.binding.boundary, value);
  active.state = state;
  applyBindingState(active, state, eventName);
}

/** Attach the signal observer for a binding, recomputing + applying state on every change. */
function observeBinding(active: ActiveBinding, eventName: string): void {
  active.cleanup = attachSignalObserver(active.binding.boundary.input, () => {
    const value = readSignalValue(active.binding.boundary.input);
    if (value === undefined) return;
    const next = evaluateBoundary(active.binding.boundary, value, active.state || undefined);
    if (next === active.state) return;
    active.state = next;
    applyBindingState(active, next, eventName);
  });
}

/** Resolve, seed, and observe one lowered binding; returns the ActiveBinding or null if the element is missing. */
function castBinding(binding: LoweredBinding, resolve: EntityElementResolver, eventName: string): ActiveBinding | null {
  const element = resolve(binding.entityId);
  if (!element) return null;
  const initialState = element.getAttribute('data-czap-state') ?? '';
  const active: ActiveBinding = { binding, element, state: initialState, cleanup: null };
  seedBinding(active, eventName);
  observeBinding(active, eventName);
  return active;
}

/**
 * THE SHARED DELTA SEAM. Given two graphs, re-cast ONLY the entities whose
 * bindings differ between them: detach the changed entities' old observers, then
 * resolve + seed + re-attach fresh observers for their new bindings; untouched
 * entities keep their live observers entirely.
 *
 * It mutates `active` in place (the entityId → ActiveBinding map the runtime
 * keeps) and is driven off `GraphPatch.diff(prev, next)` ONLY to learn WHICH
 * entities the patch touched — the actual re-lowering reads the lowered bindings
 * of both graphs, so a changed pose/projection on an entity re-casts that
 * entity even when the diff names a different (pose/projection) node id.
 *
 * EXPORTED so the AI seam (a separate item) can reuse the exact same delta
 * engine to re-cast after a validated `GraphPatch` applies — one re-cast path,
 * two callers (the runtime's `recast` and the AI apply step).
 */
export function castGraphDelta(
  prev: DocumentGraph,
  next: DocumentGraph,
  state: GraphCastState,
  resolve: EntityElementResolver,
  eventName: string = DEFAULT_EVENT_NAME,
): void {
  const active = state.active;
  // One entity can own MULTIPLE bindings (multiple components → multiple
  // boundaries), so group the lowered bindings by entity and compare the whole
  // GROUP per entity, not a single binding.
  const prevBindings = groupByEntity(lowerGraph(prev));
  const nextBindings = groupByEntity(lowerGraph(next));

  // An entity is "touched" when its lowered binding SET changed: a binding added,
  // removed, or its boundary/targets differ. Compare by the lowered boundary
  // value so a pose or projection edit (which changes the boundary the entity
  // casts) re-casts the OWNING entity even though the diff'd node id is the
  // pose/projection, not the entity. Untouched entities are left alone — all of
  // their observers stay live.
  const entityIds = new Set<ContentAddress>([...prevBindings.keys(), ...nextBindings.keys()]);
  for (const entityId of entityIds) {
    const before = prevBindings.get(entityId);
    const after = nextBindings.get(entityId);
    const changed = !before || !after || !bindingGroupsEqual(before, after);
    if (!changed) continue;

    // Detach ALL of the entity's old observers (if any) before re-casting.
    const existing = active.get(entityId);
    if (existing) {
      for (const entry of existing) entry.cleanup?.();
      active.delete(entityId);
    }

    // Re-cast from the NEW bindings (absent → the entity was removed; leave detached).
    if (after) {
      const recast: ActiveBinding[] = [];
      for (const binding of after) {
        const cast = castBinding(binding, resolve, eventName);
        if (cast) recast.push(cast);
      }
      if (recast.length > 0) active.set(entityId, recast);
    }
  }
}

/** Group lowered bindings by their owning entity id (one entity can own several). */
function groupByEntity(bindings: readonly LoweredBinding[]): Map<ContentAddress, LoweredBinding[]> {
  const grouped = new Map<ContentAddress, LoweredBinding[]>();
  for (const binding of bindings) {
    (grouped.get(binding.entityId) ?? grouped.set(binding.entityId, []).get(binding.entityId)!).push(binding);
  }
  return grouped;
}

/** Structural equality over an entity's WHOLE binding group — drives whether the entity re-casts on a delta. */
function bindingGroupsEqual(a: readonly LoweredBinding[], b: readonly LoweredBinding[]): boolean {
  if (a.length !== b.length) return false;
  // lowerGraph emits bindings in a stable order (topological over content
  // addresses), so a positional compare is faithful for the same entity.
  for (let i = 0; i < a.length; i++) {
    if (!bindingsEqual(a[i] as LoweredBinding, b[i] as LoweredBinding)) return false;
  }
  return true;
}

/** Structural equality over the lowered shape an entity casts — drives which entities re-cast on a delta. */
function bindingsEqual(a: LoweredBinding, b: LoweredBinding): boolean {
  // The boundary's identity is its serialized shape + the per-state channel maps;
  // JSON over the comparable parts is a faithful, allocation-cheap structural key
  // (the Boundary.Shape is a plain value; the channel maps are plain records).
  const key = (binding: LoweredBinding): string =>
    JSON.stringify({
      input: binding.boundary.input,
      name: binding.boundary.name,
      boundary: binding.boundary.boundary,
      stateAttributes: binding.boundary.stateAttributes ?? null,
      glslStateUniforms: binding.boundary.glslStateUniforms ?? null,
      stateWgsl: binding.boundary.stateWgsl ?? null,
      stateCss: binding.stateCss ?? null,
      targets: [...binding.targets].sort(),
    });
  return key(a) === key(b);
}

function refNamesForgedSuppliedId(ref: ContentAddress, remap: ReadonlyMap<ContentAddress, ContentAddress>): boolean {
  const canonical = remap.get(ref);
  return canonical !== undefined && canonical !== ref;
}

function refsNameForgedSuppliedId(
  refs: readonly ContentAddress[],
  remap: ReadonlyMap<ContentAddress, ContentAddress>,
): boolean {
  return refs.some((ref) => refNamesForgedSuppliedId(ref, remap));
}

function nodeReferencesForgedSuppliedId(
  node: DocumentGraphNode,
  remap: ReadonlyMap<ContentAddress, ContentAddress>,
): boolean {
  switch (node.family) {
    case 'entity':
      return refsNameForgedSuppliedId(node.components, remap);
    case 'component':
      return node.boundaryRef !== undefined && refNamesForgedSuppliedId(node.boundaryRef, remap);
    case 'pose':
      return refNamesForgedSuppliedId(node.entityRef, remap);
    case 'transition':
      return refNamesForgedSuppliedId(node.fromPose, remap) || refNamesForgedSuppliedId(node.toPose, remap);
    case 'projection':
      return refNamesForgedSuppliedId(node.sourceRef, remap);
    case 'policy':
      return refsNameForgedSuppliedId(node.appliesTo, remap);
    case 'export':
      return refsNameForgedSuppliedId(node.sourceRefs, remap);
    case 'signal':
      return false;
  }
}

/**
 * Parse + validate an untrusted serialized graph into a SEALED {@link DocumentGraph},
 * or `null` if it is malformed / structurally invalid / carries a non-conformant
 * node. Re-addresses through `sealGraph` so the runtime never trusts a supplied
 * `id`/`digest`.
 */
function parseAndSealGraph(serialized: string | DocumentGraph): DocumentGraph | null {
  let raw: unknown;
  if (typeof serialized === 'string') {
    try {
      raw = JSON.parse(serialized);
    } catch (err) {
      Diagnostics.warnOnce({
        source: 'czap/astro.graph',
        code: 'graph-parse-failed',
        message:
          `Failed to parse the serialized DocumentGraph as JSON (${String(err)}). ` +
          `The graph runtime stays inert. Fix: pass a valid serialized DocumentGraph.`,
      });
      return null;
    }
  } else {
    raw = serialized;
  }

  const candidate = raw as { nodes?: unknown; edges?: unknown } | null;
  if (
    candidate === null ||
    typeof candidate !== 'object' ||
    !Array.isArray(candidate.nodes) ||
    !Array.isArray(candidate.edges)
  ) {
    return null;
  }

  // EVERY node must conform to the shared trust gate before we address or lower it.
  for (const node of candidate.nodes) {
    if (!isWellFormedNode(node)) return null;
  }
  const suppliedEdges: DocumentGraphEdge[] = [];
  for (const edge of candidate.edges) {
    if (!isDocumentGraphEdge(edge)) return null;
    suppliedEdges.push(edge);
  }

  const structural = validateGraph({
    nodes: candidate.nodes as DocumentGraph['nodes'],
    edges: suppliedEdges,
  });
  if (!structural.ok) return null;

  // RE-SEAL EACH NODE: `sealGraph` only re-addresses the TOP-LEVEL graph id from
  // the SUPPLIED node ids — it does NOT re-address individual nodes, so a payload
  // with a FORGED node id (id not matching the node's payload bytes) would pass
  // shape (`isWellFormedNode`) + topology (`validateGraph`) checks unchallenged.
  // Reseal every node from its own payload bytes, build oldId→newId, and remap
  // every edge through it so the graph the runtime trusts is canonically
  // addressed end-to-end. An edge whose endpoint names no node is REJECTED.
  const suppliedNodes = candidate.nodes as readonly DocumentGraphNode[];
  const resealed: DocumentGraphNode[] = [];
  const remap = new Map<ContentAddress, ContentAddress>();
  try {
    for (const node of suppliedNodes) {
      const sealedNode = sealNode(node);
      remap.set(node.id, sealedNode.id);
      resealed.push(sealedNode);
    }
  } catch (err) {
    Diagnostics.warnOnce({
      source: 'czap/astro.graph',
      code: 'graph-reseal-failed',
      message:
        `Failed to re-seal a DocumentGraph node (${String(err)}). The graph runtime stays inert. ` +
        `Fix: ensure each node payload is well-formed before serializing.`,
    });
    return null;
  }

  for (const node of suppliedNodes) {
    if (nodeReferencesForgedSuppliedId(node, remap)) return null;
  }

  const remappedEdges: DocumentGraphEdge[] = [];
  for (const edge of suppliedEdges) {
    const from = remap.get(edge.from);
    const to = remap.get(edge.to);
    // A dangling edge after reseal means a forged endpoint id that maps to no
    // node — reject the graph rather than silently drop the edge.
    if (from === undefined || to === undefined) return null;
    remappedEdges.push({ ...edge, from, to });
  }

  const resealedGraph = {
    _tag: 'DocumentGraph',
    _version: 1,
    meta: (candidate as { meta?: DocumentGraph['meta'] }).meta ?? ZERO_META,
    nodes: resealed,
    edges: remappedEdges,
  } satisfies Omit<DocumentGraph, 'id' | 'digest'>;
  const resealedStructural = validateGraph(resealedGraph);
  if (!resealedStructural.ok) return null;

  // RE-ADDRESS the graph: discard any supplied id/digest, mint from the (now
  // canonically-addressed) node ids + remapped edges.
  try {
    return sealGraph(resealedGraph);
  } catch (err) {
    Diagnostics.warnOnce({
      source: 'czap/astro.graph',
      code: 'graph-seal-failed',
      message:
        `Failed to seal the DocumentGraph (${String(err)}). The graph runtime stays inert. ` +
        `Fix: ensure the graph's nodes/edges are well-formed before serializing.`,
    });
    return null;
  }
}

/**
 * Zero HLC stamp for a loaded graph whose payload omitted `meta`. `sealGraph`
 * excludes `meta` from the address (it covers only the sorted node ids + edges),
 * so a fixed meta does not affect identity — it only satisfies the envelope.
 */
const ZERO_META = {
  created: { wall_ms: 0, counter: 0, node_id: 'czap-graph-runtime' },
  updated: { wall_ms: 0, counter: 0, node_id: 'czap-graph-runtime' },
  version: 0,
} as const;

/**
 * The internals a handle keeps behind its public surface: the live
 * {@link GraphCastState}, the host element resolver, the dispatch event name, and a
 * single `advance` hook that swaps the current graph to `next` AFTER re-casting the
 * delta against the SAME cast state. Reachable only via {@link graphRuntimeInternals}
 * (keyed by a module-private symbol), so a SEPARATE in-package seam (the AI apply
 * step, item D) can drive the EXACT same delta engine `recast` uses — advancing the
 * graph the handle reports — WITHOUT widening the public `GraphRuntimeHandle` type
 * and WITHOUT routing through `recast`'s raw `GraphPatch.apply` (the AI path must run
 * its own validate→applyValidatedPatch first; this only re-casts + advances).
 */
export interface GraphRuntimeInternals {
  readonly state: GraphCastState;
  readonly resolve: EntityElementResolver;
  readonly eventName: string;
  /** Apply one discrete state through the active lowered binding(s) for an entity. */
  applyState(entityId: ContentAddress, nextState: string): boolean;
  /** Re-cast the delta from the current graph to `next`, then make `next` current. */
  advance(next: DocumentGraph): void;
}

/** Module-private key under which a handle stashes its {@link GraphRuntimeInternals}. */
const RUNTIME_INTERNALS = Symbol('czap.graphRuntimeInternals');

/** A handle carrying its private internals (the shape `loadGraphRuntime` actually returns). */
interface InternalGraphRuntimeHandle extends GraphRuntimeHandle {
  readonly [RUNTIME_INTERNALS]: GraphRuntimeInternals;
}

/**
 * Read a handle's private {@link GraphRuntimeInternals}, or `null` for a foreign
 * object that is not a {@link loadGraphRuntime} handle. The symbol key is
 * module-private, so this accessor is the ONLY way an in-package seam reaches the
 * live cast state + graph-advance hook (it never leaves `@czap/astro`).
 */
export function graphRuntimeInternals(handle: GraphRuntimeHandle): GraphRuntimeInternals | null {
  return (handle as Partial<InternalGraphRuntimeHandle>)[RUNTIME_INTERNALS] ?? null;
}

/**
 * Load a serialized {@link DocumentGraph} onto the live cast pipeline. Returns a
 * {@link GraphRuntimeHandle} that reflects the (re-addressed) graph, advances by
 * `recast`, and tears down with `release`; or `null` for a malformed / invalid
 * graph (the `parseBoundary` degrade-cleanly posture).
 */
export function loadGraphRuntime(
  serialized: string | DocumentGraph,
  resolve: EntityElementResolver,
  opts?: { readonly eventName?: string },
): GraphRuntimeHandle | null {
  const sealed = parseAndSealGraph(serialized);
  if (!sealed) return null;

  const eventName = opts?.eventName ?? DEFAULT_EVENT_NAME;
  const state = createCastState();

  for (const binding of lowerGraph(sealed)) {
    const cast = castBinding(binding, resolve, eventName);
    // Append, never overwrite: one entity can own several bindings (several
    // components → several boundaries), each with its own live observer.
    if (cast)
      (state.active.get(binding.entityId) ?? state.active.set(binding.entityId, []).get(binding.entityId)!).push(cast);
  }

  let current = sealed;

  const internals: GraphRuntimeInternals = {
    state,
    resolve,
    eventName,
    applyState(entityId: ContentAddress, nextState: string): boolean {
      return applyEntityState(state, entityId, nextState, eventName);
    },
    advance(next: DocumentGraph): void {
      castGraphDelta(current, next, state, resolve, eventName);
      current = next;
    },
  };

  const handle: InternalGraphRuntimeHandle = {
    get graph(): DocumentGraph {
      return current;
    },
    recast(patch: GraphPatch): DocumentGraph {
      const next = GraphPatch.apply(current, patch);
      castGraphDelta(current, next, state, resolve, eventName);
      current = next;
      return current;
    },
    release(): void {
      releaseCastState(state);
    },
    [RUNTIME_INTERNALS]: internals,
  };
  return handle;
}
