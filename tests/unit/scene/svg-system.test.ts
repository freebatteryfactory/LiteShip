/**
 * SVGSystem — P3 (ECS→SVG) suite.
 *
 * SVGSystem is the 7th canonical system. It composes a typed `_svgAttrs`
 * struct from outputs *prior* systems already wrote this tick — it never
 * recomputes opacity or blend. These tests pin three properties:
 *
 *  1. Composition: post-tick `_svgAttrs` mirrors the `_opacity`
 *     (VideoSystem) and `_blend` (TransitionSystem) values, never
 *     recomputing them.
 *  2. Ordering: SVGSystem is registered LAST/7th in SceneRuntime — a
 *     reorder would make it read stale (previous-tick) outputs.
 *  3. Purity: it never touches the DOM (SSR-safe).
 */

import { describe, it, expect, vi } from 'vitest';
import { Effect } from 'effect';
import { World } from '@czap/core';
import {
  SVGSystem,
  VideoSystem,
  TransitionSystem,
  Track,
  compileScene,
  SceneRuntime,
} from '@czap/scene';
import type { SceneContract } from '@czap/scene';

interface SvgAttrsRead {
  readonly _tag: 'SvgAttrs';
  readonly opacity?: number;
  readonly mixBlendMode?: string;
  readonly transform?: string;
  readonly clipPath?: string;
}

describe('SVGSystem', () => {
  it('composes _svgAttrs from the _opacity VideoSystem already wrote (no recompute)', async () => {
    const program = Effect.gen(function* () {
      const world = yield* World.make();
      yield* world.spawn({ VideoSource: {}, FrameRange: { from: 0, to: 60 }, TrackLayer: 0 });
      // VideoSystem first (writes _opacity), then SVGSystem (reads it).
      yield* world.addSystem(VideoSystem(30));
      yield* world.addSystem(SVGSystem(30));
      yield* world.tick();

      const entities = yield* world.query('VideoSource');
      const ent = entities[0]!;
      const opacity = ent.components.get('_opacity');
      const attrs = ent.components.get('_svgAttrs') as SvgAttrsRead | undefined;

      expect(opacity).toBe(1);
      expect(attrs).toBeDefined();
      expect(attrs!._tag).toBe('SvgAttrs');
      // Read-through, not recomputed: opacity equals what VideoSystem wrote.
      expect(attrs!.opacity).toBe(opacity);
    });
    await Effect.runPromise(Effect.scoped(program));
  });

  it('out-of-range opacity (0) flows into _svgAttrs unchanged', async () => {
    const program = Effect.gen(function* () {
      const world = yield* World.make();
      yield* world.spawn({ VideoSource: {}, FrameRange: { from: 0, to: 60 }, TrackLayer: 0 });
      yield* world.addSystem(VideoSystem(120));
      yield* world.addSystem(SVGSystem(120));
      yield* world.tick();

      const entities = yield* world.query('VideoSource');
      const attrs = entities[0]!.components.get('_svgAttrs') as SvgAttrsRead;
      expect(attrs.opacity).toBe(0);
    });
    await Effect.runPromise(Effect.scoped(program));
  });

  it('derives mixBlendMode from a _blend TransitionSystem wrote', async () => {
    // Compose blend on a VideoSource entity that ALSO carries a transition,
    // so a single SVGSystem pass reads both _opacity and _blend. blend>=0.5
    // → 'screen', else 'normal'.
    const blendModeAt = async (frameIndex: number): Promise<string | undefined> => {
      const program = Effect.gen(function* () {
        const world = yield* World.make();
        yield* world.spawn({
          VideoSource: {},
          FrameRange: { from: 0, to: 100 },
          TransitionKind: 'crossfade',
          Between: ['a', 'b'],
          TrackLayer: 0,
        });
        yield* world.addSystem(VideoSystem(frameIndex));
        yield* world.addSystem(TransitionSystem(frameIndex));
        yield* world.addSystem(SVGSystem(frameIndex));
        yield* world.tick();
        const entities = yield* world.query('VideoSource');
        const attrs = entities[0]!.components.get('_svgAttrs') as SvgAttrsRead;
        return attrs.mixBlendMode;
      });
      return Effect.runPromise(Effect.scoped(program));
    };
    // frame 20 → blend 0.2 → normal; frame 80 → blend 0.8 → screen.
    expect(await blendModeAt(20)).toBe('normal');
    expect(await blendModeAt(80)).toBe('screen');
  });

  it('omits mixBlendMode when no transition (_blend) is present', async () => {
    const program = Effect.gen(function* () {
      const world = yield* World.make();
      yield* world.spawn({ VideoSource: {}, FrameRange: { from: 0, to: 60 }, TrackLayer: 0 });
      yield* world.addSystem(VideoSystem(30));
      yield* world.addSystem(SVGSystem(30));
      yield* world.tick();
      const entities = yield* world.query('VideoSource');
      const attrs = entities[0]!.components.get('_svgAttrs') as SvgAttrsRead;
      expect(attrs.mixBlendMode).toBeUndefined();
      expect(attrs.opacity).toBe(1);
    });
    await Effect.runPromise(Effect.scoped(program));
  });

  it('is registered as the 7th and LAST canonical system (ordering invariant)', async () => {
    const scene: SceneContract = {
      name: 'svg-order-fixture',
      duration: 1000,
      fps: 60,
      bpm: 120,
      tracks: [Track.video('hero', { from: 0, to: 60, source: { _t: 'quantizer' } })],
      invariants: [],
      budgets: { p95FrameMs: 16 },
      site: ['node'],
    };
    const compiled = compileScene(scene);
    const handle = await SceneRuntime.build(compiled);
    try {
      // The pinned canonical count is 7.
      expect(SceneRuntime.systemCount).toBe(7);
      expect(handle.systemsRegistered).toBe(7);

      // Ticking through the live runtime (which registers all 7 systems in
      // topological order) must populate _svgAttrs — proof SVGSystem runs
      // AFTER VideoSystem within the same tick.
      await handle.tick((30 / 60) * 1000);
      const videos = await Effect.runPromise(handle.world.query('VideoSource'));
      const attrs = videos[0]!.components.get('_svgAttrs') as SvgAttrsRead;
      expect(attrs).toBeDefined();
      expect(attrs._tag).toBe('SvgAttrs');
      expect(attrs.opacity).toBe(videos[0]!.components.get('_opacity'));
    } finally {
      await handle.release();
    }
  });

  it('never touches the DOM — pure / SSR-safe', async () => {
    // No document/window in this test env; assert SVGSystem does not reach
    // for them even if a stub were present.
    const docSpy = vi.fn();
    const g = globalThis as unknown as Record<string, unknown>;
    const hadDocument = 'document' in g;
    const originalDocument = g.document;
    g.document = new Proxy(
      {},
      {
        get() {
          docSpy();
          return undefined;
        },
      },
    );
    try {
      const program = Effect.gen(function* () {
        const world = yield* World.make();
        yield* world.spawn({ VideoSource: {}, FrameRange: { from: 0, to: 60 }, TrackLayer: 0 });
        yield* world.addSystem(VideoSystem(30));
        yield* world.addSystem(SVGSystem(30));
        yield* world.tick();
        const entities = yield* world.query('VideoSource');
        expect(entities[0]!.components.get('_svgAttrs')).toBeDefined();
      });
      await Effect.runPromise(Effect.scoped(program));
      expect(docSpy).not.toHaveBeenCalled();
    } finally {
      if (hadDocument) g.document = originalDocument;
      else delete g.document;
    }
  });
});
