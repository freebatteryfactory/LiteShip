/**
 * SVGSystem — composes a typed `_svgAttrs` output struct for each video
 * entity, gathering the values prior systems already computed this tick.
 * It is the SVG-carrier egress: a future `ExportNode{carrier:'svg'}`
 * points its `sourceRefs` at the `_svgAttrs` produced here.
 *
 * Critically, SVGSystem does NOT recompute opacity or blend. It READS the
 * `_opacity` written by {@link VideoSystem} and the `_blend` written by
 * {@link TransitionSystem} (both persisted via `world.setComponent`, so
 * visible to later systems through the per-system `world.query` in
 * `tick()`), then composes them into a single attribute struct:
 *
 *   { _tag: 'SvgAttrs', transform?, opacity?, mixBlendMode?, clipPath? }
 *
 * Because it consumes the outputs of VideoSystem/TransitionSystem, it MUST
 * be registered LAST in the canonical order — a reorder would silently
 * read stale (previous-tick) values. The system is pure and SSR-safe: it
 * never touches the DOM.
 *
 * @module
 */

import type { System, World } from '@czap/core';

/**
 * Composed SVG attribute struct written to the `_svgAttrs` output
 * component. All visual fields are optional — only the ones a downstream
 * renderer needs to emit are populated. `_tag` is the discriminator
 * (scene `_tag` convention) so consumers can pattern-match the struct.
 */
export interface SvgAttrs {
  readonly _tag: 'SvgAttrs';
  readonly transform?: string;
  readonly opacity?: number;
  readonly mixBlendMode?: string;
  readonly clipPath?: string;
}

/**
 * Map a normalized blend factor [0,1] (as written by TransitionSystem)
 * to a CSS `mix-blend-mode` keyword. A mid-or-higher blend means a
 * transition is actively compositing, so we request `screen`; otherwise
 * the default `normal` compositing applies.
 */
function mixBlendModeFor(blend: number): string {
  return blend >= 0.5 ? 'screen' : 'normal';
}

/**
 * Build an SVGSystem keyed to a specific frame index.
 *
 * The `frameIndex` parameter keeps signature parity with the other
 * frame-indexed system factories (the runtime wraps them uniformly), but
 * SVGSystem deliberately does NOT use it for computation: it composes
 * purely from `_opacity`/`_blend` that frame-indexed *earlier* systems
 * already wrote this tick. Recomputing from `frameIndex` here would
 * duplicate — and risk diverging from — those upstream outputs.
 */
export function SVGSystem(frameIndex: number): System {
  void frameIndex;
  return {
    name: 'SVGSystem',
    query: ['VideoSource', 'FrameRange'],
    execute: (entities, world?: World.Shape) => {
      for (const e of entities) {
        // READ the outputs prior systems already populated this tick —
        // do NOT recompute them. VideoSystem persisted `_opacity`;
        // TransitionSystem persisted `_blend` (absent on entities that
        // carry no transition).
        const opacity = e.components.get('_opacity') as number | undefined;
        const blend = e.components.get('_blend') as number | undefined;

        const attrs: SvgAttrs = {
          _tag: 'SvgAttrs',
          ...(opacity !== undefined ? { opacity } : {}),
          ...(blend !== undefined ? { mixBlendMode: mixBlendModeFor(blend) } : {}),
        };

        // Dual-write: direct property for in-tick readers, plus the
        // persisted output component for downstream queries.
        (e as unknown as { _svgAttrs: SvgAttrs })._svgAttrs = attrs;
        if (world !== undefined) {
          world.setComponent(e.id, '_svgAttrs', attrs);
        }
      }
    },
  };
}
