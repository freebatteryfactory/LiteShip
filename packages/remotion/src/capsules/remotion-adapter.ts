/**
 * Capsule declaration treating `@czap/remotion` as the first siteAdapter
 * instance. Bridges Remotion's React composition surface to czap's
 * VideoFrameOutput stream. License obligations stay with the downstream
 * user who consumes Remotion — czap provides the adapter shell only.
 *
 * @module
 */

import { defineCapsule, S } from '@czap/core';

const VideoRendererShapeSchema = S.unknown;
const VideoFrameOutputSchema = S.struct({
  frame: S.number,
  timestamp: S.number,
  progress: S.number,
  state: S.unknown,
});

/**
 * Declared capsule for `@czap/remotion`. Registered in the module-level
 * catalog at import time; walked by the factory compiler.
 */
export const remotionAdapterCapsule = defineCapsule({
  _kind: 'siteAdapter',
  name: 'remotion.video-frame-output',
  input: VideoRendererShapeSchema,
  output: S.array(VideoFrameOutputSchema),
  capabilities: { reads: [], writes: [] },
  invariants: [
    {
      name: 'frame-count-matches-totalFrames',
      check: (_i, o) => {
        if (!Array.isArray(o)) return false;
        return o.every((f, idx) => f.frame === idx);
      },
      message:
        'Frame stream out of order: expected frames[i].frame === i for every index. Frames were likely filtered, re-sorted, or concatenated after precomputeFrames — pass the precomputeFrames array through unmodified.',
    },
  ],
  budgets: { p95Ms: 8 },
  site: ['node', 'browser'],
  attribution: {
    license: 'Remotion-Company-License',
    author: 'Remotion (@remotion-dev)',
    url: 'https://www.remotion.dev/docs/license',
  },
});
