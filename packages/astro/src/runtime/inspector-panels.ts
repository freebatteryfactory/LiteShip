/**
 * Pure helpers for the dev inspector's "full" panels (0.2.0):
 *
 * - **Active casts** — derive which projection targets a boundary element is
 *   live on (css / glsl / wgsl / aria / svg) from its attributes + payload, and
 *   format the CURRENT emitted values carried by `liteship:uniform-update` `detail`.
 * - **Escalation** — derive the minimal required {@link CapTier} from the
 *   active targets and run the REAL `@liteship/core` `chooseTier` against the live
 *   runtime site, surfacing the chosen tier + admitted targets + reason.
 * - **DocumentGraph peek** — build a read-only, content-addressed graph summary
 *   of the boundaries actually on the page (signal + component + projection
 *   nodes), using the real `@liteship/core` node-addressing kernel.
 *
 * Every export here is a PURE function of its inputs (the live DOM read happens
 * in {@link deriveActiveTargets}, which takes the element; the rest are data →
 * string/object). That keeps them deterministic and unit-testable without a DOM.
 *
 * Honesty note: no authored `PolicyNode` and no build-time `DocumentGraph` are
 * serialized to the dev page today (see {@link readInjectedPayload}). The
 * escalation + graph panels are therefore derived from the real on-page cast
 * evidence, not from a richer authored payload — and labeled as such in the
 * overlay. The {@link readInjectedPayload} seam lets a future integration inject
 * an authored payload that the panels will prefer when present.
 *
 * @module
 */

import {
  AddressedDigest,
  Cap,
  chooseTier,
  projectionKeys,
  sealNode,
  type CapTier,
  type ComponentNode,
  type DocumentGraphNode,
  type PolicyNode,
  type ProjectionNode,
  type RuntimeSite,
  type SignalNode,
} from '@liteship/core';
import type { BoundaryStateDetail, SerializedBoundary } from './boundary.js';

/** A cast/projection target the inspector visualizes. */
export type CastTarget = 'css' | 'glsl' | 'wgsl' | 'aria' | 'svg';

/** Why a target is considered active (drives the inspector's evidence tooltip). */
export interface ActiveTarget {
  readonly target: CastTarget;
  /** Short human reason this target is live (the on-page evidence). */
  readonly evidence: string;
}

/**
 * Zero HLC stamp for inspector-minted graph nodes. `addressNode` excludes
 * `meta` from the content address (NodeBase contract), so a fixed meta keeps
 * minted ids deterministic — the inspector graph is a read-only view, never
 * persisted, so the volatile timestamps are irrelevant.
 */
const ZERO_META = {
  created: { wall_ms: 0, counter: 0, node_id: 'liteship-inspector' },
  updated: { wall_ms: 0, counter: 0, node_id: 'liteship-inspector' },
  version: 0,
} as const;

/**
 * Parse a `data-liteship-boundary` payload leniently for the inspector. Returns
 * `null` on malformed JSON (the panels degrade to "no payload" rather than
 * throwing mid-render). Mirrors the runtime's parse posture without re-running
 * the full validating `parseBoundary`.
 */
export function readBoundaryPayload(boundaryJson: string | null): Partial<SerializedBoundary> | null {
  if (!boundaryJson) return null;
  try {
    const parsed = JSON.parse(boundaryJson) as Partial<SerializedBoundary>;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
}

/** Which authored cast maps a boundary payload carries (per-state target evidence). */
export function authoredTargetsFromPayload(payload: Partial<SerializedBoundary> | null): Set<CastTarget> {
  const targets = new Set<CastTarget>();
  if (!payload) return targets;
  if (payload.stateAttributes && hasEntries(payload.stateAttributes)) targets.add('aria');
  if (payload.glslStateUniforms && hasEntries(payload.glslStateUniforms)) targets.add('glsl');
  if (payload.stateWgsl && hasEntries(payload.stateWgsl)) targets.add('wgsl');
  return targets;
}

function hasEntries(record: Readonly<Record<string, unknown>>): boolean {
  for (const _ in record) return true;
  return false;
}

/**
 * Derive the active cast targets for a boundary from a snapshot of its
 * attributes + the live emitted `detail`. Pure over the snapshot so it is
 * directly unit-testable; the DOM read lives in {@link snapshotElementCasts}.
 *
 * Evidence precedence per target: an authored per-state map or a live emitted
 * value is the strongest signal; a shader-type / live custom-prop / live aria
 * attribute is corroborating. A target with neither is omitted (never faked).
 */
export function deriveActiveTargets(snapshot: ElementCastSnapshot): readonly ActiveTarget[] {
  const out: ActiveTarget[] = [];

  // CSS — any live --liteship-* custom property on the element, or an emitted css map.
  const cssProps = snapshot.cssCustomProps;
  const emittedCss = snapshot.detail ? Object.keys(snapshot.detail.css).length : 0;
  if (cssProps.length > 0 || emittedCss > 0) {
    out.push({
      target: 'css',
      evidence:
        cssProps.length > 0
          ? `${cssProps.length} live --liteship-* custom prop${cssProps.length === 1 ? '' : 's'}`
          : `${emittedCss} emitted css var${emittedCss === 1 ? '' : 's'}`,
    });
  }

  // GLSL — shader-type glsl, authored @glsl uniforms, or an emitted glsl map.
  const glslAuthored = snapshot.authoredTargets.has('glsl');
  const emittedGlsl = snapshot.detail ? Object.keys(snapshot.detail.glsl).length : 0;
  if (snapshot.shaderType === 'glsl' || glslAuthored || emittedGlsl > 0) {
    out.push({
      target: 'glsl',
      evidence:
        snapshot.shaderType === 'glsl'
          ? 'data-liteship-shader-type="glsl"'
          : glslAuthored
            ? 'authored @glsl uniforms'
            : `${emittedGlsl} emitted u_* uniform${emittedGlsl === 1 ? '' : 's'}`,
    });
  }

  // WGSL — shader-type wgsl, authored @wgsl bindings, or an emitted wgsl map.
  const wgslAuthored = snapshot.authoredTargets.has('wgsl');
  const emittedWgsl = snapshot.detail ? Object.keys(snapshot.detail.wgsl).length : 0;
  if (snapshot.shaderType === 'wgsl' || wgslAuthored || emittedWgsl > 0) {
    out.push({
      target: 'wgsl',
      evidence:
        snapshot.shaderType === 'wgsl'
          ? 'data-liteship-shader-type="wgsl"'
          : wgslAuthored
            ? 'authored @wgsl bindings'
            : `${emittedWgsl} emitted binding${emittedWgsl === 1 ? '' : 's'}`,
    });
  }

  // ARIA — authored @aria, a live aria-* / role attribute, or an emitted aria map.
  const ariaAuthored = snapshot.authoredTargets.has('aria');
  const emittedAria = snapshot.detail ? Object.keys(snapshot.detail.aria).length : 0;
  if (ariaAuthored || snapshot.ariaAttrs.length > 0 || emittedAria > 0) {
    out.push({
      target: 'aria',
      evidence: ariaAuthored
        ? 'authored @aria attributes'
        : snapshot.ariaAttrs.length > 0
          ? `${snapshot.ariaAttrs.length} live aria/role attr${snapshot.ariaAttrs.length === 1 ? '' : 's'}`
          : `${emittedAria} emitted aria attr${emittedAria === 1 ? '' : 's'}`,
    });
  }

  // SVG — the adaptive carries no SVG cast attribute today; an explicit
  // data-liteship-shader-type="svg" is the only honest on-page evidence.
  if (snapshot.shaderType === 'svg') {
    out.push({ target: 'svg', evidence: 'data-liteship-shader-type="svg"' });
  }

  return out;
}

/** A DOM-free snapshot of an element's cast-relevant state. */
export interface ElementCastSnapshot {
  readonly shaderType: string | null;
  readonly authoredTargets: Set<CastTarget>;
  /** Names of live `--liteship-*` custom properties set on the element. */
  readonly cssCustomProps: readonly string[];
  /** Names of live `aria-*` / `role` attributes on the element. */
  readonly ariaAttrs: readonly string[];
  /** Latest emitted `liteship:uniform-update` detail, if one has fired. */
  readonly detail: BoundaryStateDetail | null;
}

const ARIA_ATTR_RE = /^(aria-|role$)/;

/** Read a {@link ElementCastSnapshot} from a live element (the one DOM-touching helper). */
export function snapshotElementCasts(element: HTMLElement, detail: BoundaryStateDetail | null): ElementCastSnapshot {
  const cssCustomProps: string[] = [];
  const inlineStyle = element.getAttribute('style') ?? '';
  for (const declaration of inlineStyle.split(';')) {
    const name = declaration.split(':')[0]?.trim();
    if (name && name.startsWith('--liteship-')) cssCustomProps.push(name);
  }
  const ariaAttrs = element.getAttributeNames().filter((name) => ARIA_ATTR_RE.test(name));
  return {
    shaderType: element.getAttribute('data-liteship-shader-type'),
    authoredTargets: authoredTargetsFromPayload(readBoundaryPayload(element.getAttribute('data-liteship-boundary'))),
    cssCustomProps,
    ariaAttrs,
    detail,
  };
}

/**
 * Format one cast-value row `key = value` for the active-casts panel. Numbers
 * are rounded to 3 decimals (uniforms are floats); vec values format component
 * lists; strings pass through.
 */
export function formatCastValueRow(key: string, value: string | number | readonly number[]): string {
  if (typeof value === 'number') {
    const rounded = Math.round(value * 1000) / 1000;
    return `${key} = ${rounded}`;
  }
  if (Array.isArray(value)) {
    return `${key} = [${value.map((part) => Math.round(part * 1000) / 1000).join(', ')}]`;
  }
  return `${key} = ${value}`;
}

/** Collect the emitted value rows for a target from a `liteship:uniform-update` detail. */
export function castValueRows(target: CastTarget, detail: BoundaryStateDetail | null): readonly string[] {
  if (!detail) return [];
  const map: Record<string, string | number | readonly number[]> =
    target === 'css'
      ? detail.css
      : target === 'glsl'
        ? detail.glsl
        : target === 'wgsl'
          ? detail.wgsl
          : target === 'aria'
            ? detail.aria
            : {};
  return Object.entries(map)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => formatCastValueRow(key, value));
}

// ---------------------------------------------------------------------------
// Escalation
// ---------------------------------------------------------------------------

/**
 * The minimal {@link CapTier} that admits every one of `targets`. Mirrors the
 * escalation chooser's `TIER_TARGET_SETS` admissibility scale (projected from the
 * shared `quality-tiers.ts` datum in `@liteship/core`): aria→static, css→styled,
 * glsl→animated, wgsl→gpu.
 * `svg` has no tier in the chooser's table; it is treated as `styled` (a CSS-
 * class peer) for the purpose of the required floor.
 */
export function requiredTierForTargets(targets: readonly CastTarget[]): CapTier {
  let tier: CapTier = 'static';
  const raise = (next: CapTier): void => {
    if (Cap.ordinal(next) > Cap.ordinal(tier)) tier = next;
  };
  for (const target of targets) {
    if (target === 'aria') raise('static');
    else if (target === 'css' || target === 'svg') raise('styled');
    else if (target === 'glsl') raise('animated');
    else if (target === 'wgsl') raise('gpu');
  }
  return tier;
}

/** The escalation verdict for one boundary, ready to render. */
export interface EscalationView {
  /** The minimal tier required by the active targets (the derived `requires`). */
  readonly requiredTier: CapTier;
  /** The chosen tier, or `null` when the policy is unsatisfiable on the site. */
  readonly chosenTier: CapTier | null;
  /** The targets the chosen tier admits (sorted), or `[]` on error. */
  readonly admittedTargets: readonly string[];
  /** A one-line reason: the chooser's verdict or its error. */
  readonly reason: string;
}

/**
 * Run the REAL `@liteship/core` escalation chooser for a boundary, deriving a
 * `PolicyNode` from the active cast targets. The derived policy grants every
 * tier and admits the given site, so the chosen tier equals `requires`
 * downgraded only by the (here-absent) budgets — i.e. it surfaces the genuine
 * minimal-tier + admitted-targets the chooser computes for this evidence.
 *
 * @param targets - the boundary's active cast targets (from {@link deriveActiveTargets})
 * @param site - the live runtime site (`'browser'` in the dev overlay)
 */
export function escalationViewForTargets(targets: readonly CastTarget[], site: RuntimeSite): EscalationView {
  const requiredTier = requiredTierForTargets(targets);
  const policy = sealNode<PolicyNode>({
    _tag: 'DocGraphPolicyNode',
    _version: 1,
    family: 'policy',
    id: 'fnv1a:0' as PolicyNode['id'],
    meta: ZERO_META,
    appliesTo: [],
    requires: requiredTier,
    grants: Cap.from(['static', 'styled', 'reactive', 'animated', 'gpu']),
    sites: ['node', 'browser', 'worker', 'edge'],
  });
  const result = chooseTier(policy, site);
  if ('error' in result) {
    return { requiredTier, chosenTier: null, admittedTargets: [], reason: result.error };
  }
  const admitted = [...result.admittedTargets].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return {
    requiredTier,
    chosenTier: result.tier,
    admittedTargets: admitted,
    reason: `site '${site}' admits tier '${result.tier}' (derived requires='${requiredTier}'; grants=all, no budget floor)`,
  };
}

// ---------------------------------------------------------------------------
// DocumentGraph peek
// ---------------------------------------------------------------------------

/** A read-only graph node row for the peek panel. */
export interface GraphNodeRow {
  readonly family: DocumentGraphNode['family'];
  /** Short content address (`fnv1a:abcd…`), truncated for display. */
  readonly shortId: string;
  /** Full content address (for the title/copy). */
  readonly id: string;
  /** A one-line human label for the node. */
  readonly label: string;
}

/** A read-only graph edge row for the peek panel. */
export interface GraphEdgeRow {
  readonly type: string;
  readonly fromShort: string;
  readonly toShort: string;
}

/** A read-only, content-addressed graph summary for one page. */
export interface GraphPeek {
  readonly nodes: readonly GraphNodeRow[];
  readonly edges: readonly GraphEdgeRow[];
}

/** Truncate a `fnv1a:`-prefixed content address for compact display. */
export function shortContentAddress(id: string): string {
  const colon = id.indexOf(':');
  if (colon < 0) return id.length > 12 ? `${id.slice(0, 12)}…` : id;
  const prefix = id.slice(0, colon + 1);
  const body = id.slice(colon + 1);
  return body.length > 8 ? `${prefix}${body.slice(0, 8)}…` : `${prefix}${body}`;
}

/** Format a graph node into a one-line peek label (pure; used by the panel + tests). */
export function formatGraphNodeRow(node: DocumentGraphNode): GraphNodeRow {
  const id = String(node.id);
  let label: string;
  switch (node.family) {
    case 'signal':
      label = `signal ${node.input}${node.range ? ` [${node.range[0]}, ${node.range[1]}]` : ''}`;
      break;
    case 'component':
      label = `component ${node.name}${node.states ? ` {${node.states.join(', ')}}` : ''}`;
      break;
    case 'projection':
      label = `projection → ${node.target}`;
      break;
    default:
      label = node.family;
  }
  return { family: node.family, id, shortId: shortContentAddress(id), label };
}

/**
 * Build a read-only DocumentGraph peek from the boundaries on a page. For each
 * boundary we mint (via the real `@liteship/core` `sealNode` content-addressing):
 *
 * - one `signal` node for its `input`,
 * - one `component` node carrying its name + thresholds + states,
 * - one `projection` node per active cast target,
 *
 * plus `data` edges signal→component and component→projection. Structurally
 * equal boundaries dedup by content address (the keystone-IR identity law),
 * exactly as the build-time graph would. This is page-derived, not the authored
 * build graph — the overlay labels it so.
 */
export function buildGraphPeek(
  boundaries: readonly { readonly payload: Partial<SerializedBoundary>; readonly targets: readonly CastTarget[] }[],
): GraphPeek {
  const nodeById = new Map<string, GraphNodeRow>();
  const edgeKeys = new Set<string>();
  const edges: GraphEdgeRow[] = [];

  for (const { payload, targets } of boundaries) {
    if (typeof payload.input !== 'string') continue;

    const signal = sealNode<SignalNode>({
      _tag: 'DocGraphSignalNode',
      _version: 1,
      family: 'signal',
      id: 'fnv1a:0' as SignalNode['id'],
      meta: ZERO_META,
      input: payload.input as SignalNode['input'],
    });
    const component = sealNode<ComponentNode>({
      _tag: 'DocGraphComponentNode',
      _version: 1,
      family: 'component',
      id: 'fnv1a:0' as ComponentNode['id'],
      meta: ZERO_META,
      name: payload.id ?? 'boundary',
      ...(payload.thresholds ? { thresholds: payload.thresholds as unknown as ComponentNode['thresholds'] } : {}),
      ...(payload.states ? { states: payload.states as unknown as ComponentNode['states'] } : {}),
    });

    registerNode(nodeById, signal);
    registerNode(nodeById, component);
    addEdge(edges, edgeKeys, signal.id, component.id, 'data');

    const componentName = payload.id ?? 'boundary';
    const keys = projectionKeys(componentName);
    for (const target of targets) {
      if (target === 'svg') continue; // not a ProjectionNode target the IR encodes
      const projection = sealNode<ProjectionNode>({
        _tag: 'DocGraphProjectionNode',
        _version: 1,
        family: 'projection',
        id: 'fnv1a:0' as ProjectionNode['id'],
        meta: ZERO_META,
        target,
        sourceRef: component.id,
        keys,
        // A stable, real digest over the projection's identity bytes. The peek
        // is read-only and never persisted, so the digest's only job is to make
        // structurally-equal projections dedup — `AddressedDigest.of` over the
        // (component-id, target) bytes gives that for free.
        resultDigest: AddressedDigest.of(new TextEncoder().encode(`${String(component.id)}:${target}`)),
      });
      registerNode(nodeById, projection);
      addEdge(edges, edgeKeys, component.id, projection.id, 'data');
    }
  }

  return { nodes: [...nodeById.values()], edges };
}

function registerNode(map: Map<string, GraphNodeRow>, node: DocumentGraphNode): void {
  const row = formatGraphNodeRow(node);
  if (!map.has(row.id)) map.set(row.id, row);
}

function addEdge(
  edges: GraphEdgeRow[],
  seen: Set<string>,
  from: DocumentGraphNode['id'],
  to: DocumentGraphNode['id'],
  type: string,
): void {
  const key = `${String(from)}→${String(to)}→${type}`;
  if (seen.has(key)) return;
  seen.add(key);
  edges.push({ type, fromShort: shortContentAddress(String(from)), toShort: shortContentAddress(String(to)) });
}

// ---------------------------------------------------------------------------
// Optional dev-injection seam
// ---------------------------------------------------------------------------

/**
 * The optional dev-only payload an integration MAY inject onto the page as
 * `window.__LITESHIP_INSPECTOR__`. Today nothing populates it (no authored
 * `PolicyNode` / build-time `DocumentGraph` is serialized per page), so the
 * panels fall back to the page-derived views above. This is the seam a future
 * integration plugs an authored escalation + graph payload into; the panels
 * read it preferentially when present.
 */
export interface InjectedInspectorPayload {
  readonly escalation?: Readonly<Record<string, EscalationView>>;
  readonly graph?: GraphPeek;
}

/** Read the injected dev payload if an integration provided one; else `null`. */
export function readInjectedPayload(
  win: { readonly __LITESHIP_INSPECTOR__?: InjectedInspectorPayload } = typeof window !== 'undefined'
    ? (window as unknown as { __LITESHIP_INSPECTOR__?: InjectedInspectorPayload })
    : {},
): InjectedInspectorPayload | null {
  const payload = win.__LITESHIP_INSPECTOR__;
  return payload && typeof payload === 'object' ? payload : null;
}
