/**
 * `liteship/media` — the curated facade over `@liteship/core/media`: the media +
 * compositor vocabulary. The video renderer, the AV bridge/renderer,
 * responsive-media resolution, the compositor + its state pool, generative UI
 * frames, the token buffer, and the frame budget. Curated named re-exports only —
 * no behavior lives here.
 * @module
 */

export {
  ResponsiveMedia,
  selectCandidates,
  resolveResponsiveMedia,
  buildResponsiveSrcset,
  buildResponsiveImageSet,
  projectResponsiveMediaPicture,
} from '@liteship/core/media';
export type {
  ResponsiveMediaIntent,
  ResponsiveMediaIntentInput,
  ResponsiveMediaVariant,
  ResponsiveMediaCapabilities,
  ResponsiveMediaResolutionReason,
  ResolvedResponsiveMedia,
  ResponsiveMediaCandidateSet,
  ResponsiveMediaPictureProjection,
} from '@liteship/core/media';

export { Compositor } from '@liteship/core/media';
export type { CompositeState, CompositorConfig } from '@liteship/core/media';

export { CompositorStatePool } from '@liteship/core/media';

export { TokenBuffer } from '@liteship/core/media';

export { GenFrame } from '@liteship/core/media';
export type { UIFrame, FrameType, MorphStrategy, GapStrategy } from '@liteship/core/media';

export { VideoRenderer, compositeStateToRgba } from '@liteship/core/media';
export type { VideoConfig, VideoFrameOutput } from '@liteship/core/media';

export { FrameBudget } from '@liteship/core/media';
export type { Priority } from '@liteship/core/media';

export { AVBridge } from '@liteship/core/media';

export { AVRenderer } from '@liteship/core/media';
