/**
 * `@liteship/core/media` — the media + compositor vocabulary: the video renderer,
 * the AV bridge/renderer, responsive-media resolution, the compositor + its state
 * pool, generative UI frames, the token buffer, and the frame budget. Curated
 * named re-exports only — no behavior lives here.
 * @module
 */

export {
  ResponsiveMedia,
  selectCandidates,
  resolveResponsiveMedia,
  buildResponsiveSrcset,
  buildResponsiveImageSet,
  projectResponsiveMediaPicture,
} from './responsive-media.js';

export type {
  ResponsiveMediaIntent,
  ResponsiveMediaIntentInput,
  ResponsiveMediaVariant,
  ResponsiveMediaCapabilities,
  ResponsiveMediaResolutionReason,
  ResolvedResponsiveMedia,
  ResponsiveMediaCandidateSet,
  ResponsiveMediaPictureProjection,
} from './responsive-media.js';

export { Compositor } from './compositor.js';

export type { CompositeState, CompositorConfig } from './compositor.js';

export { CompositorStatePool } from './compositor-pool.js';

export { TokenBuffer } from './token-buffer.js';

export { GenFrame } from './gen-frame.js';

export type { UIFrame, FrameType, MorphStrategy, GapStrategy } from './gen-frame.js';

export { VideoRenderer, compositeStateToRgba } from './video.js';

export type { VideoConfig, VideoFrameOutput } from './video.js';

export { FrameBudget } from './frame-budget.js';

export type { Priority } from './frame-budget.js';

export { AVBridge } from './av-bridge.js';

export { AVRenderer } from './av-renderer.js';
