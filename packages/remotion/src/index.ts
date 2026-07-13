/**
 * `@czap/remotion` — **LiteShip** Remotion adapter: video timeline + shader
 * surfaces driven by `CompositeState` from the **CZAP** `VideoRenderer`.
 *
 * Provides React hooks and composition helpers to consume
 * `CompositeState` from `@czap/core`'s `VideoRenderer` in Remotion projects.
 *
 * Typical flow:
 * 1. Build a {@link VideoRenderer.Shape} on the server — usually via
 *    {@link rendererFromRemotionConfig}, so fps/duration are declared once,
 *    in Remotion.
 * 2. Call {@link precomputeFrames} once before Remotion renders.
 * 3. Inside a composition, read the current frame's state with
 *    {@link useCompositeState} (or {@link useCzapState} if you wrap your
 *    tree in {@link Provider}).
 * 4. Turn the discrete state into CSS variables via {@link cssVarsFromState}.
 *
 * @module
 */

// Bring the `VideoRenderer` symbol into scope for TSDoc link resolution
// (typedoc resolves {@link VideoRenderer.Shape} against this type-only import).
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { VideoRenderer } from '@czap/core';

// Hooks
export { cssVarsFromState, stateAtFrame, useCompositeState } from './hooks.js';

// Authored-motion adapter (#130): samples the ONE shared `sampleProgram` kernel at the
// composition's current frame and folds the typed leaves into frame content.
export { sampleMotionFrame, motionCssVars } from './motion.js';

// Composition
export type { RemotionVideoConfig } from './composition.js';
export { precomputeFrames, rendererFromRemotionConfig, Provider, useCzapState } from './composition.js';

// Capsules
export { remotionAdapterCapsule } from './capsules/remotion-adapter.js';
