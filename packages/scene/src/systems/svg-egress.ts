/**
 * SVG egress — the **reader** that closes the `_svgAttrs` dual-write.
 *
 * {@link SVGSystem} (the 7th, last-registered ECS system) composes a typed
 * `_svgAttrs` struct per video entity each tick and persists it via
 * `world.setComponent`. That value is dead until something OUTSIDE
 * `scene/systems` consumes it. This module is that consumer: a render sink
 * that, after each `tick()`, queries the world for the persisted
 * `_svgAttrs` components and emits them to a caller-supplied sink.
 *
 * Mirroring {@link PassThroughMixer}'s compute/sink split, the egress has a
 * pure core and a thin DOM applicator:
 *
 *  - {@link collectSvgAttrs} — pure: query → extract → return an
 *    `Map<entityId, SvgAttrs>`. SSR-safe; never touches the DOM. This is
 *    what the runtime's `svgSink` receives each frame.
 *  - {@link applySvgAttrs} — thin DOM applicator: given that map plus an
 *    `entityId → SVGElement` resolver, writes `transform` / `opacity` /
 *    `mix-blend-mode` / `clip-path` onto the live elements. The only piece
 *    that assumes a DOM, so headless callers can ignore it entirely.
 *
 * @module
 */

import type { World } from '@liteship/core';
import type { SvgAttrs } from './svg.js';

/**
 * The serialized SVG egress frame: a snapshot mapping each video entity's
 * id to the `_svgAttrs` composed for it this tick. Entities that carry no
 * `_svgAttrs` (e.g. non-video tracks) are omitted. This is the
 * DOM-agnostic artifact — feed it to {@link applySvgAttrs} for a live SVG
 * tree, or serialize/snapshot it directly in a headless render.
 */
export type SvgAttrsFrame = ReadonlyMap<string, SvgAttrs>;

/**
 * Pure egress core — query the world for persisted `_svgAttrs` components
 * and collect them into an entity-keyed map. Reads only the persisted ECS
 * component (the durable half of SVGSystem's dual-write), so it observes
 * exactly what later ticks / external readers would see. Never touches the
 * DOM.
 *
 * Queries `VideoSource` (SVGSystem's own query domain) plus `_svgAttrs`, so
 * the result is keyed identically to the entities SVGSystem walked and only
 * contains entities the system has actually composed attrs for.
 */
export function collectSvgAttrs(world: World.Shape): SvgAttrsFrame {
  const frame = new Map<string, SvgAttrs>();
  const entities = world.query('VideoSource', '_svgAttrs');
  for (const e of entities) {
    const attrs = e.components.get('_svgAttrs') as SvgAttrs | undefined;
    if (attrs !== undefined) frame.set(e.id, attrs);
  }
  return frame;
}

/**
 * Resolve an entity id to the live `SVGElement` it drives. Callers own the
 * entity→element mapping (the scene engine never allocates DOM), so the
 * applicator stays free of any element-discovery policy. Return `null` /
 * `undefined` to skip an entity that has no element this frame.
 */
export type SvgElementResolver = (entityId: string) => SVGElement | null | undefined;

/**
 * Thin DOM applicator — write a collected {@link SvgAttrsFrame} onto live
 * SVG elements. For each entity present in the frame it resolves the target
 * element and applies the populated attributes:
 *
 *  - `transform`     → `setAttribute('transform', …)`
 *  - `opacity`       → `setAttribute('opacity', String(…))`
 *  - `mixBlendMode`  → `style.mixBlendMode = …`
 *  - `clipPath`      → `setAttribute('clip-path', …)`
 *
 * Only populated fields are touched, so an element keeps any
 * author-supplied values for attributes SVGSystem left absent. Returns the
 * number of elements actually written (resolved + present), letting callers
 * assert the egress reached the DOM.
 */
export function applySvgAttrs(frame: SvgAttrsFrame, resolve: SvgElementResolver): number {
  let applied = 0;
  for (const [entityId, attrs] of frame) {
    const el = resolve(entityId);
    if (el === null || el === undefined) continue;
    if (attrs.transform !== undefined) el.setAttribute('transform', attrs.transform);
    if (attrs.opacity !== undefined) el.setAttribute('opacity', String(attrs.opacity));
    if (attrs.mixBlendMode !== undefined) el.style.mixBlendMode = attrs.mixBlendMode;
    if (attrs.clipPath !== undefined) el.setAttribute('clip-path', attrs.clipPath);
    applied++;
  }
  return applied;
}
