/**
 * Remotion Root -- registers the LiteshipDemo composition.
 *
 * Precomputes all frames at composition-load time via calculateMetadata,
 * then wraps LiteshipDemo in the liteship Provider so useLiteshipState() works.
 *
 * @module
 */

import { Composition } from 'remotion';
import { Provider } from '@liteship/remotion';
import type { VideoFrameOutput } from '@liteship/core';
import { LiteshipDemo } from './LiteshipDemo';
import { buildFrames, FPS, DURATION_MS, WIDTH, HEIGHT } from './setup';

// A type alias (not an interface): Remotion's `Composition` component prop wants
// props assignable to `Record<string, unknown>`, and only aliases get the implicit
// index signature that satisfies it.
type LiteshipDemoProps = {
  readonly frames: ReadonlyArray<VideoFrameOutput>;
};

function LiteshipDemoWithProvider({ frames }: LiteshipDemoProps) {
  return (
    <Provider frames={frames}>
      <LiteshipDemo />
    </Provider>
  );
}

export function RemotionRoot() {
  return (
    <Composition
      id="LiteshipDemo"
      component={LiteshipDemoWithProvider}
      durationInFrames={Math.ceil((DURATION_MS / 1000) * FPS)}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={{ frames: [] as ReadonlyArray<VideoFrameOutput> }}
      calculateMetadata={async () => {
        const frames = await buildFrames();
        return {
          props: { frames },
          durationInFrames: frames.length || Math.ceil((DURATION_MS / 1000) * FPS),
          fps: FPS,
          width: WIDTH,
          height: HEIGHT,
        };
      }}
    />
  );
}
