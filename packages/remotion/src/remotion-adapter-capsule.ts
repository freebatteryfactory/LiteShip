/**
 * Capsule declaration treating `@liteship/remotion` as the first siteAdapter
 * instance. Bridges Remotion's React composition surface to liteship's
 * VideoFrameOutput stream. License obligations stay with the downstream
 * user who consumes Remotion — liteship provides the adapter shell only.
 *
 * @module
 */

import { defineCapsule, schema } from '@liteship/core';

const VideoRendererInputSchema = schema.struct({
  totalFrames: schema.number,
});
const VideoFrameOutputSchema = schema.struct({
  frame: schema.number,
  timestamp: schema.number,
  progress: schema.number,
  state: schema.unknown,
});

/**
 * Declared capsule for `@liteship/remotion`. The immutable declaration is
 * discovered by the factory compiler without import-time registration.
 */
export const remotionAdapterCapsule = defineCapsule({
  _kind: 'siteAdapter',
  name: 'remotion.video-frame-output',
  input: VideoRendererInputSchema,
  output: schema.array(VideoFrameOutputSchema),
  capabilities: { reads: [], writes: [] },
  invariants: [
    {
      name: 'frame-indices-are-contiguous',
      check: (_i, o) => {
        if (!Array.isArray(o)) return false;
        return o.every((f, idx) => f.frame === idx);
      },
      message:
        'Frame stream out of order: expected frames[i].frame === i for every index. Frames were likely filtered, re-sorted, or concatenated after precomputeFrames — pass the precomputeFrames array through unmodified.',
    },
    {
      name: 'frame-count-matches-totalFrames',
      check: (i, o) => Array.isArray(o) && o.length === i.totalFrames,
      message:
        'Frame stream length must equal renderer.totalFrames. A short or overlong stream means the adapter dropped or fabricated frames.',
    },
  ],
  budgets: { p95Ms: 8, allocClass: 'bounded' },
  site: ['node', 'browser'],
  attribution: {
    license: 'Remotion-Company-License',
    author: 'Remotion (@remotion-dev)',
    url: 'https://www.remotion.dev/docs/license',
  },
});
