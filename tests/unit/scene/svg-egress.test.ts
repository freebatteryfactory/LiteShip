// @vitest-environment jsdom
/**
 * SVG egress — reader that closes the `_svgAttrs` dual-write.
 *
 * SVGSystem composes & persists `_svgAttrs` per video entity each tick, but
 * nothing outside `scene/systems` consumed it — a written value with no
 * reader. These tests pin the egress that makes the SVG cast a real
 * artifact:
 *
 *  1. Pure core (`collectSvgAttrs`): after a frame, the persisted
 *     `_svgAttrs` actually reach an entity-keyed `Map` — and the values
 *     mirror what SVGSystem wrote (no recompute, read-through).
 *  2. Runtime wiring: `handle.svgAttrs()` surfaces the frame post-tick and a
 *     supplied `svgSink` receives it — reachable by an external caller.
 *  3. DOM applicator (`applySvgAttrs`): the collected attrs land on live
 *     `<rect>`/`<g>` SVG elements via a caller-owned entity→element
 *     resolver.
 *
 * jsdom env is required only by the applicator test; the others are
 * DOM-free but run fine under it.
 */

import { describe, it, expect, vi } from 'vitest';
import { World } from '@liteship/core';
import {
  SVGSystem,
  VideoSystem,
  TransitionSystem,
  Track,
  compileScene,
  SceneRuntime,
  collectSvgAttrs,
  applySvgAttrs,
} from '@liteship/scene';
import type { SceneContract, SvgAttrs, SvgAttrsFrame } from '@liteship/scene';

describe('collectSvgAttrs (pure egress core)', () => {
  it('collects persisted _svgAttrs into an entity-keyed frame after a tick', () => {
    const { world } = World.make();
    const id = world.spawn({ VideoSource: {}, FrameRange: { from: 0, to: 60 }, TrackLayer: 0 });
    world.addSystem(VideoSystem(30));
    world.addSystem(SVGSystem(30));
    world.tick();

    const collected = collectSvgAttrs(world);

    // Read-through: frame value equals what SVGSystem persisted.
    const entities = world.query('VideoSource');
    const persisted = entities[0]!.components.get('_svgAttrs') as SvgAttrs;

    expect(collected.size).toBe(1);
    const attrs = collected.get(id)!;
    expect(attrs._tag).toBe('SvgAttrs');
    expect(attrs.opacity).toBe(1);
    expect(attrs.opacity).toBe(persisted.opacity);
    expect(collected.size).toBe(1);
  });

  it('is empty before any tick has composed _svgAttrs', () => {
    const { world } = World.make();
    world.spawn({ VideoSource: {}, FrameRange: { from: 0, to: 60 }, TrackLayer: 0 });
    world.addSystem(VideoSystem(30));
    world.addSystem(SVGSystem(30));
    // No tick yet → no persisted _svgAttrs.
    const collected = collectSvgAttrs(world);
    expect(collected.size).toBe(0);
  });

  it('carries mixBlendMode through from a _blend TransitionSystem wrote', () => {
    const { world } = World.make();
    const id = world.spawn({
      VideoSource: {},
      FrameRange: { from: 0, to: 100 },
      TransitionKind: 'crossfade',
      Between: ['a', 'b'],
      TrackLayer: 0,
    });
    world.addSystem(VideoSystem(80));
    world.addSystem(TransitionSystem(80));
    world.addSystem(SVGSystem(80));
    world.tick();
    const frame = collectSvgAttrs(world);
    const collected = frame.get(id)!;
    // frame 80 → blend 0.8 → 'screen'.
    expect(collected.mixBlendMode).toBe('screen');
  });
});

describe('SceneRuntime SVG-egress wiring', () => {
  function fixture(): SceneContract {
    return {
      name: 'svg-egress-fixture',
      duration: 1000,
      fps: 60,
      bpm: 120,
      tracks: [Track.video('hero', { from: 0, to: 60, source: { _t: 'quantizer' } })],
      invariants: [],
      budgets: { p95FrameMs: 16 },
      site: ['node'],
    };
  }

  it('does not change the canonical system count (egress is a sink, not a system)', () => {
    expect(SceneRuntime.systemCount).toBe(7);
  });

  it('surfaces the SVG frame via handle.svgAttrs() post-tick', async () => {
    const handle = await SceneRuntime.build(compileScene(fixture()));
    try {
      expect(handle.svgAttrs().size).toBe(0); // empty before first tick
      await handle.tick((30 / 60) * 1000);
      const frame = handle.svgAttrs();
      expect(frame.size).toBe(1);
      const [, attrs] = [...frame][0]!;
      expect(attrs._tag).toBe('SvgAttrs');
      expect(attrs.opacity).toBe(1);
    } finally {
      await handle.release();
    }
  });

  it('invokes a supplied svgSink once per tick with the egress frame', async () => {
    const frames: SvgAttrsFrame[] = [];
    const handle = await SceneRuntime.build(compileScene(fixture()), {
      svgSink: (f) => frames.push(f),
    });
    try {
      await handle.tick((30 / 60) * 1000);
      await handle.tick((30 / 60) * 1000);
      expect(frames).toHaveLength(2);
      for (const f of frames) {
        expect(f.size).toBe(1);
        const [, attrs] = [...f][0]!;
        expect(attrs._tag).toBe('SvgAttrs');
      }
    } finally {
      await handle.release();
    }
  });
});

describe('applySvgAttrs (DOM applicator)', () => {
  it('writes collected attrs onto live SVG elements via a resolver', () => {
    const svgNs = 'http://www.w3.org/2000/svg';
    const root = document.createElementNS(svgNs, 'svg');
    const rect = document.createElementNS(svgNs, 'rect') as SVGElement;
    root.appendChild(rect);

    const frame: SvgAttrsFrame = new Map([
      [
        'entity-1',
        {
          _tag: 'SvgAttrs',
          transform: 'translate(10,20)',
          opacity: 0.5,
          mixBlendMode: 'screen',
          clipPath: 'url(#c)',
        } satisfies SvgAttrs,
      ],
    ]);

    const applied = applySvgAttrs(frame, (id) => (id === 'entity-1' ? rect : null));

    expect(applied).toBe(1);
    expect(rect.getAttribute('transform')).toBe('translate(10,20)');
    expect(rect.getAttribute('opacity')).toBe('0.5');
    expect(rect.style.mixBlendMode).toBe('screen');
    expect(rect.getAttribute('clip-path')).toBe('url(#c)');
  });

  it('skips entities the resolver cannot map and leaves absent fields untouched', () => {
    const svgNs = 'http://www.w3.org/2000/svg';
    const g = document.createElementNS(svgNs, 'g') as SVGElement;
    g.setAttribute('transform', 'rotate(0)'); // author-supplied; must survive

    const frame: SvgAttrsFrame = new Map([
      ['present', { _tag: 'SvgAttrs', opacity: 0.25 } satisfies SvgAttrs],
      ['missing', { _tag: 'SvgAttrs', opacity: 0.9 } satisfies SvgAttrs],
    ]);

    const resolve = vi.fn((id: string) => (id === 'present' ? g : undefined));
    const applied = applySvgAttrs(frame, resolve);

    expect(applied).toBe(1); // only 'present' resolved
    expect(g.getAttribute('opacity')).toBe('0.25');
    // SVGSystem left transform absent → author value untouched.
    expect(g.getAttribute('transform')).toBe('rotate(0)');
  });
});
