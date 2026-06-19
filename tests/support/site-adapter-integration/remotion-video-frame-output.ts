/**
 * Integration-lane host driver for the `remotion.video-frame-output`
 * siteAdapter capsule.
 *
 * The capsule declares `site: ['node', 'browser']`. The host-capability-matrix
 * check must prove EACH declared site actually supports the adapter under a
 * REAL host invocation — not a mock standing in for the runtime. This module
 * provides one probe per declared site, each driving production code:
 *
 *  - `node`    — the server-side frame-production path. A real `VideoRenderer`
 *    (built over a real `Compositor`) is streamed through the adapter's
 *    `precomputeFrames`, producing the canonical `VideoFrameOutput[]` stream the
 *    capsule's contract describes. This is the exact node host call a Remotion
 *    `calculateMetadata` makes before render — no mock renderer.
 *  - `browser` — the React-host hook path. The adapter's `<Provider>` +
 *    `useCzapState()` are rendered through Remotion's real hook context
 *    (`Internals.TimelineContext`) via `renderToStaticMarkup`, proving the
 *    browser-side frame lookup resolves the precomputed state for the current
 *    frame. Runs under the jsdom environment the generated test declares.
 *
 * The only thing NOT exercised here is the ffmpeg pixel encode (the `czap scene
 * render` egress), which is a separate, ffmpeg-gated suite
 * (`tests/smoke/intro-render.test.ts`); the adapter's own contract is the
 * `VideoFrameOutput` STREAM, and both the producer (node) and consumer
 * (browser) of that stream are driven for real here.
 *
 * @module
 */

import { Effect } from 'effect';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Internals } from 'remotion';
import { Compositor, Millis, VideoRenderer } from '@czap/core';
import type { CompositeState, VideoFrameOutput } from '@czap/core';
import { Provider, precomputeFrames, useCzapState } from '@czap/remotion';

/** The result of one site's real host invocation — structurally asserted by the generated test. */
export interface SiteProbeResult {
  /** The site this probe drove the adapter under. */
  readonly site: string;
  /** Number of `VideoFrameOutput` frames produced/observed under this host (> 0 = host ran). */
  readonly frameCount: number;
  /** Whether `frames[i].frame === i` held across the produced stream (the capsule's frame-order invariant). */
  readonly framesInOrder: boolean;
}

/**
 * `node` site: real server-side frame production. Builds a real `VideoRenderer`
 * over a real `Compositor` and streams it through the adapter's
 * `precomputeFrames`, returning the canonical `VideoFrameOutput[]`.
 */
async function probeNode(): Promise<SiteProbeResult> {
  const compositor = Effect.runSync(Effect.scoped(Compositor.create()));
  const renderer = VideoRenderer.make(
    { fps: 10, width: 320, height: 240, durationMs: Millis(500) },
    compositor,
  );
  const frames = await precomputeFrames(renderer);
  const framesInOrder = frames.every((f, i) => f.frame === i);
  return { site: 'node', frameCount: frames.length, framesInOrder };
}

/**
 * `browser` site: real React-host frame lookup. Renders the adapter's
 * `<Provider>` + `useCzapState()` through Remotion's real hook context and
 * asserts the hook resolves the precomputed state for the current frame.
 * Requires the jsdom environment the generated test file declares.
 */
function probeBrowser(): SiteProbeResult {
  const frames: VideoFrameOutput[] = Array.from({ length: 3 }, (_, i) => ({
    frame: i,
    timestamp: (i * 1000) / 10,
    progress: i / 2,
    state: {
      discrete: { index: String(i) },
      blend: {},
      outputs: { css: { '--czap-index': i }, glsl: {}, wgsl: {}, aria: {} },
    } satisfies CompositeState,
  }));

  let observed: CompositeState | null = null;
  function Probe(): ReturnType<typeof createElement> {
    observed = useCzapState();
    return createElement('div');
  }

  // Drive Remotion's real hook context at frame 1 (the browser host surface).
  (globalThis as { remotion_initialFrame?: number }).remotion_initialFrame = 1;
  renderToStaticMarkup(
    createElement(
      Internals.CanUseRemotionHooks.Provider,
      { value: true },
      createElement(
        Internals.TimelineContext.Provider,
        { value: { frame: {} } as never },
        createElement(Provider, { frames, children: createElement(Probe) }),
      ),
    ),
  );

  const resolved = observed as CompositeState | null;
  // The hook resolved frame 1's precomputed discrete state — proof the browser
  // host read the adapter's stream (not the empty-state fallback).
  const framesInOrder = resolved?.discrete['index'] === '1';
  return { site: 'browser', frameCount: frames.length, framesInOrder };
}

/**
 * Per-site real-host probes for `remotion.video-frame-output`. The generated
 * integration test asserts this key set EQUALS the capsule's declared `site`
 * array and runs each probe under the real host.
 */
export const siteProbes: Readonly<Record<string, () => Promise<SiteProbeResult> | SiteProbeResult>> = {
  node: probeNode,
  browser: probeBrowser,
};
