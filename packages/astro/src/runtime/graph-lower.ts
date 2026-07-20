/**
 * Lower a serialized {@link DocumentGraph} onto the live cast pipeline.
 *
 * This is the FORWARD inverse of the inspector's `buildGraphPeek`
 * (`inspector-panels.ts`): where the peek READS the on-page boundaries and
 * mints signal→component→projection nodes for display, this module READS an
 * authored graph and reconstitutes each boundary as a {@link RuntimeBoundary}
 * the EXISTING `boundary.ts` runtime can evaluate and apply — no new evaluation
 * machinery, just a re-projection of the IR onto the seam the satellite
 * directive already drives.
 *
 * Pure and SSR-safe: `lowerGraph` reads only the graph value (no DOM, no
 * observers), so it runs identically on the server and the client. The DOM
 * side-effects (resolve element, seed state, attach observers) live in
 * `graph-runtime.ts`, which consumes the {@link LoweredBinding}s this produces.
 *
 * THE MAPPING (per the keystone IR):
 *   - a {@link ComponentNode} (name + thresholds + states) is a boundary;
 *   - its SIGNAL comes from the incoming edge from a {@link SignalNode}
 *     (`Boundary.make(signal.input, zip(thresholds, states))`);
 *   - its CHANNELS are the {@link ProjectionNode}s it feeds (component→projection
 *     edges) whose `target` is one of css / aria / glsl / wgsl;
 *   - its per-state BINDINGS come from the {@link PoseNode}s of the entity that
 *     owns the component, split by key vocabulary into the boundary's
 *     `stateAttributes` / `glslStateUniforms` / `stateWgsl`.
 *
 * A component with no resolvable signal or no thresholds/states is SKIPPED (the
 * result simply carries fewer bindings); lowering never throws on a partial or
 * in-progress graph.
 *
 * @module
 */

import {
  Boundary,
  BoundaryAttribute,
  linearizeGraph,
  type ComponentNode,
  type ContentAddress,
  type DocumentGraph,
  type DocumentGraphNode,
  type EntityNode,
  type PoseNode,
  type ProjectionNode,
  type SignalNode,
} from '@liteship/core';
import type { RuntimeBoundary } from './boundary.js';

/** The cast targets a lowered boundary drives on the live runtime (the IR's projection vocabulary, minus the offline ones). */
export type LoweredTarget = 'css' | 'aria' | 'glsl' | 'wgsl';

/**
 * One boundary lowered out of the graph, ready for the runtime to seed +
 * observe. `entityId` is the address of the {@link EntityNode} that owns the
 * boundary's component — the key a host's {@link EntityElementResolver} maps to
 * the live DOM element. `targets` records which cast channels the authored
 * projections lit up (drives nothing in `boundary.ts`, which applies all
 * present channels, but is surfaced so a host/test can assert the cast surface).
 */
export interface LoweredBinding {
  readonly entityId: ContentAddress;
  readonly boundary: RuntimeBoundary;
  readonly targets: readonly LoweredTarget[];
  /**
   * Authored per-state CSS custom properties (`--liteship-*` keys), keyed by state.
   * The CSS analog of the boundary's `glslStateUniforms`/`stateWgsl`: `RuntimeBoundary`
   * has no per-state CSS slot (CSS rides `applyBoundaryState`'s `state.css`, not a
   * boundary field), so the runtime threads this into the apply call directly.
   * Absent when no pose carries a `--liteship-*` binding.
   */
  readonly stateCss?: Readonly<Record<string, Readonly<Record<string, string | number>>>>;
}

/** The projection targets that have a LIVE runtime channel (offline targets — ai/config/svg — are not lowered). */
const LIVE_TARGETS: ReadonlySet<string> = new Set<LoweredTarget>(['css', 'aria', 'glsl', 'wgsl']);

/** Classify a pose-binding key by the projection vocabulary so it routes to the right per-state channel. */
function isGlslUniformKey(key: string): boolean {
  return key.startsWith('u_');
}

/**
 * Split an entity's pose bindings (keyed by state) into the three per-state
 * channel maps the {@link RuntimeBoundary} carries. A pose's bindings are a flat
 * `Record<key, value>`; the key vocabulary decides the channel:
 *
 *   - `--liteship-*` (CSS custom property)          → `stateCss`
 *   - `role` / `aria-*` (string values)         → `stateAttributes`
 *   - `u_*` (number values)                     → `glslStateUniforms`
 *   - every other number value                  → `stateWgsl` (bare field names)
 *
 * `applyBoundaryState` then composes the live state's slice of each map onto the
 * element on every crossing — exactly the path the build-manifest-joined
 * satellite uses, so a graph-lowered boundary and an authored one apply
 * identically.
 */
function poseBindingsToChannels(poses: readonly PoseNode[]): {
  stateCss: Record<string, Record<string, string | number>>;
  stateAttributes: Record<string, Record<string, string>>;
  glslStateUniforms: Record<string, Record<string, number>>;
  stateWgsl: Record<string, Record<string, number>>;
} {
  const stateCss: Record<string, Record<string, string | number>> = {};
  const stateAttributes: Record<string, Record<string, string>> = {};
  const glslStateUniforms: Record<string, Record<string, number>> = {};
  const stateWgsl: Record<string, Record<string, number>> = {};

  for (const pose of poses) {
    const state = pose.state;
    for (const [key, value] of Object.entries(pose.bindings)) {
      if (key.startsWith('--')) {
        (stateCss[state] ??= {})[key] = value;
      } else if (BoundaryAttribute.isAllowedKey(key)) {
        (stateAttributes[state] ??= {})[key] = String(value);
      } else if (typeof value === 'number' && isGlslUniformKey(key)) {
        (glslStateUniforms[state] ??= {})[key] = value;
      } else if (typeof value === 'number') {
        (stateWgsl[state] ??= {})[key] = value;
      }
    }
  }

  return { stateCss, stateAttributes, glslStateUniforms, stateWgsl };
}

/**
 * Lower a {@link DocumentGraph} to the ordered set of {@link LoweredBinding}s the
 * runtime seeds and observes. Iteration is driven off `linearizeGraph(graph).sorted`
 * so binding order is STABLE across machines (the topological order over content
 * addresses; falls back to authoring order for nodes the sort could not place —
 * a cyclic/partial graph still lowers what it can rather than throwing).
 *
 * For each {@link ComponentNode}: find the owning entity, its feeding signal, its
 * projection targets, and the owning entity's poses, then mint one
 * {@link RuntimeBoundary}. Components with no resolvable signal or no
 * thresholds/states are skipped.
 */
export function lowerGraph(graph: DocumentGraph): readonly LoweredBinding[] {
  const byId = new Map<ContentAddress, DocumentGraphNode>(graph.nodes.map((node) => [node.id, node]));

  // Edge adjacency in both directions — the loader follows edges by the FAMILY
  // of their endpoints, not by edge `type` (the IR's structural `EdgeType` does
  // not include a 'data' member, and the loader must not depend on a type the
  // schema cannot carry). Incoming/outgoing-by-family is the robust read.
  const incoming = new Map<ContentAddress, ContentAddress[]>();
  const outgoing = new Map<ContentAddress, ContentAddress[]>();
  for (const edge of graph.edges) {
    (outgoing.get(edge.from) ?? outgoing.set(edge.from, []).get(edge.from)!).push(edge.to);
    (incoming.get(edge.to) ?? incoming.set(edge.to, []).get(edge.to)!).push(edge.from);
  }

  const nodesOfFamily = <F extends DocumentGraphNode['family']>(
    ids: readonly ContentAddress[] | undefined,
    family: F,
  ): Extract<DocumentGraphNode, { family: F }>[] => {
    const out: Extract<DocumentGraphNode, { family: F }>[] = [];
    for (const id of ids ?? []) {
      const node = byId.get(id);
      if (node && node.family === family) out.push(node as Extract<DocumentGraphNode, { family: F }>);
    }
    return out;
  };

  // Component → owning entity. An EntityNode lists its component refs, so invert
  // that map once rather than re-scanning per component.
  const entityOfComponent = new Map<ContentAddress, EntityNode>();
  for (const node of graph.nodes) {
    if (node.family === 'entity') {
      for (const componentId of node.components) entityOfComponent.set(componentId, node);
    }
  }

  // Entity → its poses (poses reference the entity via `entityRef`).
  const posesOfEntity = new Map<ContentAddress, PoseNode[]>();
  for (const node of graph.nodes) {
    if (node.family === 'pose') {
      (posesOfEntity.get(node.entityRef) ?? posesOfEntity.set(node.entityRef, []).get(node.entityRef)!).push(node);
    }
  }

  const { sorted } = linearizeGraph(graph);
  // Stable, total order over EVERY node (topological where possible, authoring
  // order for the rest) so the binding list is deterministic for any graph.
  const order: ContentAddress[] = [];
  const seen = new Set<ContentAddress>();
  for (const id of sorted) {
    if (byId.has(id) && !seen.has(id)) {
      seen.add(id);
      order.push(id);
    }
  }
  for (const node of graph.nodes) {
    if (!seen.has(node.id)) {
      seen.add(node.id);
      order.push(node.id);
    }
  }

  const bindings: LoweredBinding[] = [];
  for (const id of order) {
    const node = byId.get(id);
    if (!node || node.family !== 'component') continue;
    const component: ComponentNode = node;

    const entity = entityOfComponent.get(component.id);
    if (!entity) continue; // a component nobody owns has no element to bind — skip.

    // Signal: the SignalNode on an incoming edge to this component.
    const signal: SignalNode | undefined = nodesOfFamily(incoming.get(component.id), 'signal')[0];
    if (!signal) continue;

    const thresholds = component.thresholds;
    const states = component.states;
    if (!thresholds || !states || thresholds.length === 0 || states.length === 0) continue;
    if (thresholds.length !== states.length) continue; // a boundary's at[] zips threshold↔state 1:1.

    // Projection channels: ProjectionNodes this component feeds, restricted to
    // the live cast targets.
    const projections: ProjectionNode[] = nodesOfFamily(outgoing.get(component.id), 'projection');
    const targets: LoweredTarget[] = [];
    const seenTarget = new Set<string>();
    for (const projection of projections) {
      if (LIVE_TARGETS.has(projection.target) && !seenTarget.has(projection.target)) {
        seenTarget.add(projection.target);
        targets.push(projection.target as LoweredTarget);
      }
    }
    if (targets.length === 0) continue; // no live channel to cast onto — skip.

    // Build the Boundary by zipping thresholds↔states (the parseBoundary recipe).
    const first = [thresholds[0] as number, String(states[0])] as const;
    const rest = states.slice(1).map((state, i) => [thresholds[i + 1] as number, String(state)] as const);
    const at = [first, ...rest] as const;
    // `Boundary.make` THROWS on non-strictly-ascending thresholds / duplicate
    // state names — both pass the node schema + graph validation, so an UNTRUSTED
    // graph can reach here with either. Lowering must stay TOTAL (the loader's
    // contract is to return cleanly, never throw mid-hydration), so a component
    // that can't form a boundary is SKIPPED — the result simply carries fewer
    // bindings, exactly like a component with no signal or no thresholds.
    let shape: Boundary;
    try {
      shape = Boundary.make({ input: signal.input, at });
    } catch {
      continue;
    }

    // Per-state channels from the owning entity's poses.
    const { stateCss, stateAttributes, glslStateUniforms, stateWgsl } = poseBindingsToChannels(
      posesOfEntity.get(entity.id) ?? [],
    );

    const boundary: RuntimeBoundary = {
      name: component.name,
      input: signal.input,
      boundary: shape,
      ...(Object.keys(stateAttributes).length > 0 ? { stateAttributes } : {}),
      ...(Object.keys(glslStateUniforms).length > 0 ? { glslStateUniforms } : {}),
      ...(Object.keys(stateWgsl).length > 0 ? { stateWgsl } : {}),
    };

    bindings.push({
      entityId: entity.id,
      boundary,
      targets,
      ...(Object.keys(stateCss).length > 0 ? { stateCss } : {}),
    });
  }

  return bindings;
}
