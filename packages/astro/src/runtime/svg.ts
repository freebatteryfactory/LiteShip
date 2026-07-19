/**
 * SVG last-mile runtime — the LIVE DOM driver around the scene's pure SVG
 * egress applicator.
 *
 * `packages/scene/src/systems/svg-egress.ts` ships the two halves of the SVG
 * cast arm: {@link collectSvgAttrs} (pure: world → `Map<entityId, SvgAttrs>`)
 * and {@link applySvgAttrs} (thin: that map + an `entityId → SVGElement`
 * resolver → live `setAttribute` writes). Until this module, only offline /
 * CLI / test callers drove `applySvgAttrs`; the browser had no path that
 * resolved page SVG elements and pumped a frame's attrs onto them.
 *
 * This is that path. It mirrors the satellite runtime's signal-clock shape:
 *
 *  - Discovery — scan a root for `[data-liteship-entity]` SVG elements and build
 *    an {@link SvgElementResolver} (`entityId → SVGElement`) the egress
 *    applicator consumes verbatim.
 *  - Source — the first cut reads per-state authored attrs off the element's
 *    own `data-liteship-svg` JSON (keyed `state → { attr: value }`, the satellite
 *    `stateAttributes` shape) and resolves the active state from a serialized
 *    boundary on `data-liteship-boundary`. No scene runtime needed (that is item
 *    C); the point is the LIVE DOM applicator path exists and is wired to a
 *    directive.
 *  - Clock — {@link attachSignalObserver} (viewport / scroll / audio), the
 *    same frame/signal source the satellite directive uses. On every signal
 *    crossing the active state's attrs are composed into an
 *    {@link SvgAttrsFrame} and pushed through `applySvgAttrs`, so the live
 *    SVGElement's `transform` / `opacity` / `mix-blend-mode` / `clip-path`
 *    update in place.
 *
 * SSR-safe: every `window` / `requestAnimationFrame` touch is guarded, and
 * `initSvgDirective` returns a no-op cleanup off the DOM. The applicator core
 * itself ({@link applySvgAttrs}) never touches `window`, only the resolved
 * elements it is handed.
 *
 * @module
 */

import { Diagnostics } from '@liteship/core';
import { applySvgAttrs } from '@liteship/scene';
import type { SvgAttrs, SvgAttrsFrame, SvgElementResolver } from '@liteship/scene';
import {
  attachSignalObserver,
  evaluateBoundary,
  parseBoundary,
  readSignalValue,
  warnIfSignalUnserved,
  type RuntimeBoundary,
} from './boundary.js';
import { bootDirectiveEntry } from './directive-bound.js';

/** Attribute carrying the entity id an SVG element is bound to. */
const ENTITY_ATTRIBUTE = 'data-liteship-entity';
/** Attribute carrying the per-state authored SVG attrs JSON (`state → attrs`). */
const SVG_STATE_ATTRIBUTE = 'data-liteship-svg';

/**
 * Authored per-state SVG attrs, as serialized onto `data-liteship-svg`. Keyed by
 * state label, then by the {@link SvgAttrs} field name a renderer would emit
 * (`transform` / `opacity` / `mixBlendMode` / `clipPath`). Values are the raw
 * authored strings/numbers; only the populated fields per state are touched
 * when applied, so an element keeps any author-supplied attrs for fields a
 * state leaves absent (the same partial-write contract as `applySvgAttrs`).
 */
export type SvgStateAttrs = Readonly<Record<string, Readonly<Partial<Omit<SvgAttrs, '_tag'>>>>>;

/**
 * Resolve an entity id to the live `SVGElement` discovered for it. Returns
 * `null` for an id with no discovered element (the egress applicator skips
 * those), matching {@link SvgElementResolver}.
 */
export type SvgEntityElementResolver = SvgElementResolver;

/**
 * Parse the per-state authored SVG attrs off a `data-liteship-svg` payload.
 * Returns `null` for an absent / malformed / non-object payload so the caller
 * treats the element as carrying no authored attrs (inert), never throwing
 * mid-discovery. Only object-valued states survive, so a stray scalar can't
 * masquerade as an attrs bag.
 */
export function parseSvgStateAttrs(json: string | null): SvgStateAttrs | null {
  if (!json) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    Diagnostics.warnOnce({
      source: 'liteship/astro.svg',
      code: 'svg-attrs-parse-failed',
      message:
        `Failed to parse the data-liteship-svg per-state attrs as JSON (${String(err)}). ` +
        `The entity carries no authored SVG attrs. Fix: emit valid JSON for data-liteship-svg.`,
    });
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
  const out: Record<string, Partial<Omit<SvgAttrs, '_tag'>>> = {};
  for (const [state, attrs] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof attrs !== 'object' || attrs === null || Array.isArray(attrs)) continue;
    out[state] = attrs as Partial<Omit<SvgAttrs, '_tag'>>;
  }
  return out;
}

/**
 * Build an {@link SvgEntityElementResolver} over the `[data-liteship-entity]`
 * SVGElements under `root`. Non-SVG matches (a plain `<div data-liteship-entity>`)
 * are skipped — `applySvgAttrs` writes SVG presentation attributes, so only
 * real `SVGElement`s are mapped. The map is built once at discovery; the
 * returned resolver is a pure lookup the egress applicator can call each
 * frame with no further DOM queries.
 */
export function buildEntityElementResolver(root: ParentNode): SvgEntityElementResolver {
  const map = new Map<string, SVGElement>();
  const elements = root.querySelectorAll(`[${ENTITY_ATTRIBUTE}]`);
  for (const el of Array.from(elements)) {
    if (!(el instanceof SVGElement)) continue;
    const id = el.getAttribute(ENTITY_ATTRIBUTE);
    if (id) map.set(id, el);
  }
  return (entityId: string) => map.get(entityId) ?? null;
}

/**
 * Compose a single-entity {@link SvgAttrsFrame} for the authored attrs of the
 * active `state`. Returns an empty frame when the state carries no authored
 * attrs (the applicator then writes nothing), so an unknown / un-authored
 * state is a clean no-op rather than a thrown lookup.
 */
function frameForState(entityId: string, stateAttrs: SvgStateAttrs, state: string): SvgAttrsFrame {
  const authored = stateAttrs[state];
  if (!authored) return new Map<string, SvgAttrs>();
  return new Map<string, SvgAttrs>([[entityId, { _tag: 'SvgAttrs', ...authored }]]);
}

/** Discovered SVG entity ready to be driven: its element, authored attrs, and boundary. */
interface SvgEntity {
  readonly entityId: string;
  readonly stateAttrs: SvgStateAttrs;
  readonly boundary: RuntimeBoundary;
}

/**
 * Discover the drivable SVG entities under `root`: each `[data-liteship-entity]`
 * SVGElement that also carries a parseable `data-liteship-svg` per-state attrs map
 * AND a parseable `data-liteship-boundary` (the signal clock that decides which
 * state is live). Elements missing either payload are skipped — they have no
 * live source this cut, so there is nothing to drive.
 */
function discoverSvgEntities(root: ParentNode): SvgEntity[] {
  const entities: SvgEntity[] = [];
  const elements = root.querySelectorAll(`[${ENTITY_ATTRIBUTE}]`);
  for (const el of Array.from(elements)) {
    if (!(el instanceof SVGElement)) continue;
    const entityId = el.getAttribute(ENTITY_ATTRIBUTE);
    if (!entityId) continue;
    const stateAttrs = parseSvgStateAttrs(el.getAttribute(SVG_STATE_ATTRIBUTE));
    if (!stateAttrs) continue;
    const boundary = parseBoundary(el.getAttribute('data-liteship-boundary'));
    if (!boundary) continue;
    entities.push({ entityId, stateAttrs, boundary });
  }
  return entities;
}

/**
 * Wire the SVG last-mile runtime under `root` (defaults to `document`):
 * discover `[data-liteship-entity]` SVG elements, resolve each to its live
 * SVGElement, and on every signal crossing of its boundary apply the active
 * state's authored attrs through {@link applySvgAttrs} so the live SVG
 * presentation attributes update in place.
 *
 * For each discovered entity the active state is computed by evaluating the
 * boundary against {@link readSignalValue}, and only a *changed* state pushes
 * a frame — a crossing that lands on the same state is a no-op, matching the
 * satellite directive's previous-state guard.
 *
 * SSR-safe: with no `window` the runtime never queries the DOM and returns a
 * no-op cleanup. Returns a cleanup that detaches every attached signal
 * observer; calling it twice is harmless.
 */
export function attachSvgRuntime(
  root: ParentNode = typeof document !== 'undefined' ? document : (undefined as never),
): () => void {
  if (typeof window === 'undefined' || !root) {
    return () => {};
  }

  const resolver = buildEntityElementResolver(root);
  const entities = discoverSvgEntities(root);
  const cleanups: Array<() => void> = [];

  for (const entity of entities) {
    // Seed the previous-state from the element's SSR'd state when present so
    // the first crossing only fires on a genuine change, not a redundant
    // re-application of the initial server state.
    const el = resolver(entity.entityId);
    let previousState = (el instanceof SVGElement ? el.getAttribute('data-liteship-state') : null) ?? '';

    const update = (): void => {
      const value = readSignalValue(entity.boundary.input);
      if (value === undefined) return;
      const state = evaluateBoundary(entity.boundary, value, previousState || undefined);
      if (state === previousState) return;
      previousState = state;
      // Reflect the live state onto the element (parity with the satellite
      // directive's data-liteship-state write) before applying its authored attrs.
      const target = resolver(entity.entityId);
      if (target instanceof SVGElement && target.getAttribute('data-liteship-state') !== state) {
        target.setAttribute('data-liteship-state', state);
      }
      applySvgAttrs(frameForState(entity.entityId, entity.stateAttrs, state), resolver);
    };

    // Apply once at boot so an authored initial state reaches the DOM even
    // before the first signal crossing.
    warnIfSignalUnserved(entity.boundary.input, { source: 'liteship/astro.svg', what: 'boundary signal' });
    const initialValue = readSignalValue(entity.boundary.input);
    if (initialValue !== undefined) {
      const initialState = evaluateBoundary(entity.boundary, initialValue, previousState || undefined);
      previousState = initialState;
      const target = resolver(entity.entityId);
      if (target instanceof SVGElement && target.getAttribute('data-liteship-state') !== initialState) {
        target.setAttribute('data-liteship-state', initialState);
      }
      applySvgAttrs(frameForState(entity.entityId, entity.stateAttrs, initialState), resolver);
    }

    const detach = attachSignalObserver(entity.boundary.input, update);
    if (detach) cleanups.push(detach);
  }

  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    for (const detach of cleanups) detach();
    cleanups.length = 0;
  };
}

/**
 * Entry point used by the `client:svg` directive. Wires {@link attachSvgRuntime}
 * over the document and honors `liteship:reinit` (re-read) / `liteship:teardown` (final
 * tear-down) so a View-Transition re-render or teardown re-reads / detaches
 * without remounting. SSR-safe.
 *
 * @param load - Dynamic-import factory the directive passes in (parity with the
 *   other directive entries; the SVG runtime does its work synchronously).
 * @param element - The discovered directive element (used only to scope reinit /
 *   dispose listeners). Discovery itself scans the whole document so a single
 *   directive marker can drive every `[data-liteship-entity]` SVG on the page.
 */
export function initSvgDirective(load: () => Promise<unknown>, element: HTMLElement): void {
  if (typeof window === 'undefined') {
    return;
  }

  let cleanup: (() => void) | null = attachSvgRuntime(document);

  const dispose = (): void => {
    cleanup?.();
    cleanup = null;
  };

  element.addEventListener('liteship:reinit', () => {
    dispose();
    cleanup = attachSvgRuntime(document);
  });
  element.addEventListener('liteship:teardown', () => {
    dispose();
  });

  load();
}

/** Astro client directive entry that marks the host before starting the SVG runtime. */
export const svgDirective = (load: () => Promise<unknown>, opts: Record<string, unknown>, el: HTMLElement): void => {
  bootDirectiveEntry('svg', load, opts, el, (runtimeLoad, _runtimeOpts, runtimeEl) => {
    initSvgDirective(runtimeLoad, runtimeEl);
  });
};
