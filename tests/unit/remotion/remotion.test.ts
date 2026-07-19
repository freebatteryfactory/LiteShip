// @vitest-environment jsdom
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { Compositor, Diagnostics, VideoRenderer } from '@liteship/core';
import type { CompositeState, VideoFrameOutput } from '@liteship/core';
import { Internals } from 'remotion';
import {
  Provider,
  cssVarsFromState,
  precomputeFrames,
  remotionAdapterCapsule,
  rendererFromRemotionConfig,
  stateAtFrame,
  useCompositeState,
  useLiteshipState,
} from '@liteship/remotion';

function withRemotionFrame(frame: number, child: React.ReactElement): React.ReactElement {
  (window as Window & { remotion_initialFrame?: number }).remotion_initialFrame = frame;
  return React.createElement(
    Internals.CanUseRemotionHooks.Provider,
    { value: true },
    React.createElement(Internals.TimelineContext.Provider, { value: { frame: {} } }, child),
  );
}

function makeFrames(count: number): VideoFrameOutput[] {
  return Array.from({ length: count }, (_, i) => ({
    frame: i,
    timestamp: (i * 1000) / 30,
    progress: count > 1 ? i / (count - 1) : 1,
    state: {
      discrete: { index: String(i) },
      blend: {},
      outputs: {
        css: { '--liteship-index': i },
        glsl: { u_index: i },
        aria: { 'data-liteship-index': String(i) },
      },
    },
  }));
}

describe('@liteship/remotion cssVarsFromState', () => {
  test('converts css outputs to string values', () => {
    const state: CompositeState = {
      discrete: {},
      blend: {},
      outputs: {
        css: { '--liteship-size': 16, '--liteship-theme': 'dark' },
        glsl: {},
        aria: {},
      },
    };

    expect(cssVarsFromState(state)).toEqual({
      '--liteship-size': '16',
      '--liteship-theme': 'dark',
    });
  });
});

describe('@liteship/remotion stateAtFrame', () => {
  test('clamps frame lookups to the available range', () => {
    const frames = makeFrames(3);
    expect(stateAtFrame(frames, -1).discrete['index']).toBe('0');
    expect(stateAtFrame(frames, 1).discrete['index']).toBe('1');
    expect(stateAtFrame(frames, 99).discrete['index']).toBe('2');
  });

  test('returns the empty state for empty frame arrays', () => {
    expect(stateAtFrame([], 5)).toEqual({
      discrete: {},
      blend: {},
      outputs: { css: {}, glsl: {}, wgsl: {}, aria: {} },
    });
  });
});

describe('@liteship/remotion hooks', () => {
  test('useCompositeState reads the mocked current frame', () => {
    const frames = makeFrames(4);
    let observed: CompositeState | null = null;

    function Probe(): React.JSX.Element {
      observed = useCompositeState(frames);
      return React.createElement('div');
    }

    renderToStaticMarkup(withRemotionFrame(2, React.createElement(Probe)));
    expect(observed?.discrete['index']).toBe('2');
  });

  test('useLiteshipState reads frames from Provider context', () => {
    const frames = makeFrames(3);
    let observed: CompositeState | null = null;

    function Probe(): React.JSX.Element {
      observed = useLiteshipState();
      return React.createElement('div');
    }

    renderToStaticMarkup(withRemotionFrame(1, React.createElement(Provider, { frames, children: React.createElement(Probe) })));
    expect(observed?.discrete['index']).toBe('1');
  });

  test('useLiteshipState falls back to the empty state when no frames exist', () => {
    let observed: CompositeState | null = null;

    function Probe(): React.JSX.Element {
      observed = useLiteshipState();
      return React.createElement('div');
    }

    renderToStaticMarkup(withRemotionFrame(0, React.createElement(Provider, { frames: [], children: React.createElement(Probe) })));
    expect(observed).toEqual({
      discrete: {},
      blend: {},
      outputs: { css: {}, glsl: {}, wgsl: {}, aria: {} },
    });
  });
});

describe('@liteship/remotion precomputeFrames', () => {
  test('collects frames from a renderer', async () => {
    const compositor = Compositor.create().compositor;
    const renderer = VideoRenderer.make({ fps: 10, width: 640, height: 480, durationMs: 500 }, compositor);

    const frames = await precomputeFrames(renderer);
    expect(frames).toHaveLength(5);
    expect(frames[0]?.frame).toBe(0);
    expect(frames[4]?.frame).toBe(4);
  });

  test('returns an empty array for zero-duration renders', async () => {
    const compositor = Compositor.create().compositor;
    const renderer = VideoRenderer.make({ fps: 30, width: 640, height: 480, durationMs: 0 }, compositor);

    await expect(precomputeFrames(renderer)).resolves.toEqual([]);
  });
});

describe('@liteship/remotion rendererFromRemotionConfig', () => {
  test('derives VideoConfig from Remotion timing so frame counts cannot drift', async () => {
    const compositor = Compositor.create().compositor;
    const renderer = rendererFromRemotionConfig(
      { fps: 30, width: 640, height: 480, durationInFrames: 90 },
      compositor,
    );

    expect(renderer.config).toMatchObject({ fps: 30, width: 640, height: 480, durationMs: 3000 });
    expect(renderer.totalFrames).toBe(90);

    const frames = await precomputeFrames(renderer);
    expect(frames).toHaveLength(90);
    expect(frames[89]?.frame).toBe(89);
  });

  test('frame counts round-trip exactly at non-representable rates (Codex P2, PR #34)', () => {
    // (frames / fps) * 1000 is not exactly representable for these pairs —
    // an unguarded ceil round trip adds a phantom frame (1000 @ 30 -> 1001).
    const compositor = Compositor.create().compositor;
    for (const [durationInFrames, fps] of [
      [1000, 30],
      [900, 29.97],
      [600, 59.94],
    ] as const) {
      const renderer = rendererFromRemotionConfig({ fps, width: 16, height: 16, durationInFrames }, compositor);
      expect(renderer.totalFrames).toBe(durationInFrames);
    }
  });

  test('accepts the full useVideoConfig shape (extra fields ignored)', () => {
    const compositor = Compositor.create().compositor;
    const remotionConfig = { fps: 24, width: 1920, height: 1080, durationInFrames: 48, id: 'main' };
    const renderer = rendererFromRemotionConfig(remotionConfig, compositor);

    expect(renderer.totalFrames).toBe(48);
    expect(renderer.config.durationMs).toBe(2000);
  });
});

describe('@liteship/remotion degraded-path diagnostics', () => {
  let buffer: ReturnType<typeof Diagnostics.createBufferSink>;

  beforeEach(() => {
    Diagnostics.reset();
    buffer = Diagnostics.createBufferSink();
    Diagnostics.setSink(buffer.sink);
  });

  afterEach(() => {
    Diagnostics.reset();
  });

  test('stateAtFrame warns once when no frames were precomputed', () => {
    stateAtFrame([], 5);
    stateAtFrame([], 6);

    const events = buffer.events.filter((e) => e.code === 'no-frames');
    expect(events).toHaveLength(1);
    expect(events[0]?.source).toBe('liteship/remotion');
    expect(events[0]?.message).toContain('precomputeFrames');
    expect(events[0]?.message).toContain('calculateMetadata');
  });

  test('stateAtFrame warns once on overflow, diagnosing fps/durationMs drift', () => {
    const frames = makeFrames(3);

    expect(stateAtFrame(frames, 240).discrete['index']).toBe('2');
    stateAtFrame(frames, 241);

    const events = buffer.events.filter((e) => e.code === 'frame-overflow');
    expect(events).toHaveLength(1);
    expect(events[0]?.message).toContain('3 precomputed frames');
    expect(events[0]?.message).toContain('durationInFrames');
    expect(events[0]?.message).toContain('rendererFromRemotionConfig');
    expect(events[0]?.detail).toMatchObject({ frameIndex: 240, frameCount: 3 });
  });

  test('stateAtFrame clamps negative indices silently (designed total-function path)', () => {
    const frames = makeFrames(3);

    expect(stateAtFrame(frames, -1).discrete['index']).toBe('0');

    expect(buffer.events).toHaveLength(0);
  });

  test('useLiteshipState warns once naming the missing Provider', () => {
    let observed: CompositeState | null = null;

    function Probe(): React.JSX.Element {
      observed = useLiteshipState();
      return React.createElement('div');
    }

    renderToStaticMarkup(withRemotionFrame(0, React.createElement(Probe)));

    expect(observed).toEqual({
      discrete: {},
      blend: {},
      outputs: { css: {}, glsl: {}, wgsl: {}, aria: {} },
    });
    const events = buffer.events.filter((e) => e.code === 'no-provider-frames');
    expect(events).toHaveLength(1);
    expect(events[0]?.source).toBe('liteship/remotion');
    expect(events[0]?.message).toContain('<Provider frames={frames}>');
    expect(events[0]?.message).toContain('precomputeFrames');
  });

  test('remotionAdapterCapsule invariant message names the contract, the likely cause, and the fix', () => {
    const inv = remotionAdapterCapsule.invariants.find((i) => i.name === 'frame-count-matches-totalFrames');

    expect(inv?.message).toBe(
      'Frame stream out of order: expected frames[i].frame === i for every index. Frames were likely filtered, re-sorted, or concatenated after precomputeFrames — pass the precomputeFrames array through unmodified.',
    );
  });
});
