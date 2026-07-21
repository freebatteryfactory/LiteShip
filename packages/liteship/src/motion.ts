/**
 * `liteship/motion` — the curated facade over `@liteship/core/motion`: the
 * animation + transition vocabulary. Timelines, the TransitionProgram algebra,
 * transition interpreters, discrete state transitions, easing, typed
 * interpolation, stagger, reveal, blend, and scroll-timeline lowering. Curated
 * named re-exports only — no behavior lives here.
 * @module
 */

export { Easing, sampleRuntimeEasing, DEFAULT_MOTION_SPRING } from '@liteship/core/motion';
export type { RuntimeEasing } from '@liteship/core/motion';

export { Animation } from '@liteship/core/motion';

export { interpolate, interpolateTyped, parseTypedBinding, formatTypedValue } from '@liteship/core/motion';
export type { TypedValue, TransformPart, ColorSpace } from '@liteship/core/motion';

export { interpretTransition } from '@liteship/core/motion';
export type {
  LoweredMotionPlan,
  CssMotionPlan,
  NativeTimelineEligibility,
  RuntimeWritePlan,
  RuntimeWriteProperty,
  RuntimeWriteWindow,
  MotionPropertyTween,
  CssKeyframeStep,
} from '@liteship/core/motion';

export {
  lowerTransitionProgram,
  interpretProgram,
  sampleProgramWindows,
  sampleProgram,
  sampleProgramUniforms,
  frameToT,
} from '@liteship/core/motion';
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
} from '@liteship/core/motion';

export {
  Reveal,
  lowerRevealIntent,
  lowerRevealChain,
  resolveRevealInitialState,
  ssrRevealPaint,
  motionPropToBinding,
} from '@liteship/core/motion';
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
} from '@liteship/core/motion';

export { Stagger, lowerStaggerIntent, resolveStaggerInitialState, staggerProgram } from '@liteship/core/motion';
export type {
  StaggerIntent,
  StaggerIntentInput,
  StaggerChild,
  LoweredStagger,
  LoweredStaggerItem,
} from '@liteship/core/motion';

export { ScrollTimeline, lowerScrollTimelineIntent, resolveScrollTimelineInitialState } from '@liteship/core/motion';
export type {
  ScrollTimelineIntent,
  ScrollTimelineIntentInput,
  ScrollTimelineAxis,
  LoweredScrollTimeline,
} from '@liteship/core/motion';

export { createTimeline } from '@liteship/core/motion';
export type { Timeline } from '@liteship/core/motion';

export { createBlendTree } from '@liteship/core/motion';
export type { BlendTree } from '@liteship/core/motion';

export {
  transitionReceipt,
  mintTransition,
  decodeDiscreteStateTransition,
  applyTransition,
  discreteTransitionSubjectId,
  discreteTransitionPayload,
} from '@liteship/core/motion';
export type { DiscreteStateTransition } from '@liteship/core/motion';
