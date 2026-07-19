/**
 * `@liteship/core/motion` — the animation + transition vocabulary: timelines,
 * the TransitionProgram algebra, transition interpreters, discrete state
 * transitions, easing, typed interpolation, stagger, reveal, blend, and
 * scroll-timeline lowering. Curated named re-exports only — no behavior here.
 * @module
 */

export { Easing, sampleRuntimeEasing, DEFAULT_MOTION_SPRING } from './easing.js';

export type { RuntimeEasing } from './easing.js';

export { Animation } from './animation.js';

export { interpolate, interpolateTyped, parseTypedBinding, formatTypedValue } from './interpolate.js';

export type { TypedValue, TransformPart, ColorSpace } from './interpolate.js';

export { interpretTransition } from './interpret-transition.js';

export type {
  LoweredMotionPlan,
  CssMotionPlan,
  NativeTimelineEligibility,
  RuntimeWritePlan,
  RuntimeWriteProperty,
  RuntimeWriteWindow,
  MotionPropertyTween,
  CssKeyframeStep,
} from './interpret-transition.js';

export {
  lowerTransitionProgram,
  interpretProgram,
  sampleProgramWindows,
  sampleProgram,
  sampleProgramUniforms,
  frameToT,
} from './transition-program.js';

export type {
  TransitionProgram,
  TransitionBranch,
  BranchCondition,
  ProgramEnv,
  BranchGuard,
  ProgramTimelineEntry,
  LoweredProgramTimeline,
  ProgramSample,
  ProgramUniforms,
} from './transition-program.js';

export {
  Reveal,
  lowerRevealIntent,
  lowerRevealChain,
  resolveRevealInitialState,
  ssrRevealPaint,
  motionPropToBinding,
} from './reveal.js';

export type {
  RevealIntent,
  RevealIntentInput,
  RevealTrigger,
  RevealTransition,
  RevealPolicy,
  RevealReducedMotion,
  LoweredReveal,
  RevealSsrPaint,
  RevealChainInput,
  RevealChainStep,
  RevealChainBranch,
  LoweredRevealChain,
} from './reveal.js';

export { Stagger, lowerStaggerIntent, resolveStaggerInitialState, staggerProgram } from './stagger.js';

export type { StaggerIntent, StaggerIntentInput, StaggerChild, LoweredStagger, LoweredStaggerItem } from './stagger.js';

export { ScrollTimeline, lowerScrollTimelineIntent, resolveScrollTimelineInitialState } from './scroll-timeline.js';

export type {
  ScrollTimelineIntent,
  ScrollTimelineIntentInput,
  ScrollTimelineAxis,
  LoweredScrollTimeline,
} from './scroll-timeline.js';

export { Timeline } from './timeline.js';

export { BlendTree } from './blend.js';

export {
  transitionReceipt,
  mintTransition,
  decodeDiscreteStateTransition,
  applyTransition,
  discreteTransitionSubjectId,
  discreteTransitionPayload,
} from './state-transition.js';

export type { DiscreteStateTransition } from './state-transition.js';
