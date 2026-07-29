[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / liteship/src/motion

# liteship/src/motion

`liteship/motion` — the curated facade over `@liteship/core/motion`: the
animation + transition vocabulary. Timelines, the TransitionProgram algebra,
transition interpreters, discrete state transitions, easing, typed
interpolation, stagger, reveal, blend, and scroll-timeline lowering. Curated
named re-exports only — no behavior lives here.

## Namespaces

- [Animation](namespaces/Animation/README.md)
- [BlendTree](namespaces/BlendTree/README.md)
- [Easing](namespaces/Easing/README.md)

## Interfaces

- [BranchGuard](interfaces/BranchGuard.md)
- [CssKeyframeStep](interfaces/CssKeyframeStep.md)
- [CssMotionPlan](interfaces/CssMotionPlan.md)
- [DiscreteStateTransition](interfaces/DiscreteStateTransition.md)
- [LoweredMotionPlan](interfaces/LoweredMotionPlan.md)
- [LoweredReveal](interfaces/LoweredReveal.md)
- [LoweredRevealChain](interfaces/LoweredRevealChain.md)
- [LoweredScrollTimeline](interfaces/LoweredScrollTimeline.md)
- [LoweredStagger](interfaces/LoweredStagger.md)
- [LoweredStaggerItem](interfaces/LoweredStaggerItem.md)
- [MotionPropertyTween](interfaces/MotionPropertyTween.md)
- [ProgramEnv](interfaces/ProgramEnv.md)
- [ProgramSample](interfaces/ProgramSample.md)
- [ProgramTimelineEntry](interfaces/ProgramTimelineEntry.md)
- [RevealChainBranch](interfaces/RevealChainBranch.md)
- [RevealChainInput](interfaces/RevealChainInput.md)
- [RevealChainStep](interfaces/RevealChainStep.md)
- [RevealIntent](interfaces/RevealIntent.md)
- [RevealIntentInput](interfaces/RevealIntentInput.md)
- [RevealPolicy](interfaces/RevealPolicy.md)
- [RevealSsrPaint](interfaces/RevealSsrPaint.md)
- [RevealTransition](interfaces/RevealTransition.md)
- [RuntimeEasing](interfaces/RuntimeEasing.md)
- [RuntimeWritePlan](interfaces/RuntimeWritePlan.md)
- [RuntimeWriteProperty](interfaces/RuntimeWriteProperty.md)
- [RuntimeWriteWindow](interfaces/RuntimeWriteWindow.md)
- [ScrollTimelineIntent](interfaces/ScrollTimelineIntent.md)
- [ScrollTimelineIntentInput](interfaces/ScrollTimelineIntentInput.md)
- [StaggerChild](interfaces/StaggerChild.md)
- [StaggerIntent](interfaces/StaggerIntent.md)
- [StaggerIntentInput](interfaces/StaggerIntentInput.md)
- [TransformPart](interfaces/TransformPart.md)
- [TransitionBranch](interfaces/TransitionBranch.md)
- [TransitionTimeline](interfaces/TransitionTimeline.md)

## Type Aliases

- [BlendTree](type-aliases/BlendTree.md)
- [BranchCondition](type-aliases/BranchCondition.md)
- [ColorSpace](type-aliases/ColorSpace.md)
- [NativeTimelineEligibility](type-aliases/NativeTimelineEligibility.md)
- [RevealReducedMotion](type-aliases/RevealReducedMotion.md)
- [RevealTrigger](type-aliases/RevealTrigger.md)
- [ScrollTimelineAxis](type-aliases/ScrollTimelineAxis.md)
- [Timeline](type-aliases/Timeline.md)
- [TransitionProgram](type-aliases/TransitionProgram.md)
- [TypedValue](type-aliases/TypedValue.md)

## Variables

- [Animation](variables/Animation.md)
- [DEFAULT\_MOTION\_SPRING](variables/DEFAULT_MOTION_SPRING.md)
- [Easing](variables/Easing.md)
- [Reveal](variables/Reveal.md)
- [ScrollTimeline](variables/ScrollTimeline.md)
- [Stagger](variables/Stagger.md)

## Functions

- [applyTransition](functions/applyTransition.md)
- [createBlendTree](functions/createBlendTree.md)
- [createTimeline](functions/createTimeline.md)
- [decodeDiscreteStateTransition](functions/decodeDiscreteStateTransition.md)
- [discreteTransitionPayload](functions/discreteTransitionPayload.md)
- [discreteTransitionSubjectId](functions/discreteTransitionSubjectId.md)
- [formatTypedValue](functions/formatTypedValue.md)
- [frameToT](functions/frameToT.md)
- [interpolate](functions/interpolate.md)
- [interpolateTyped](functions/interpolateTyped.md)
- [interpretProgram](functions/interpretProgram.md)
- [interpretTransition](functions/interpretTransition.md)
- [lowerRevealChain](functions/lowerRevealChain.md)
- [lowerRevealIntent](functions/lowerRevealIntent.md)
- [lowerScrollTimelineIntent](functions/lowerScrollTimelineIntent.md)
- [lowerStaggerIntent](functions/lowerStaggerIntent.md)
- [lowerTransitionProgram](functions/lowerTransitionProgram.md)
- [mintTransition](functions/mintTransition.md)
- [motionPropToBinding](functions/motionPropToBinding.md)
- [parseTypedBinding](functions/parseTypedBinding.md)
- [resolveRevealInitialState](functions/resolveRevealInitialState.md)
- [resolveScrollTimelineInitialState](functions/resolveScrollTimelineInitialState.md)
- [resolveStaggerInitialState](functions/resolveStaggerInitialState.md)
- [sampleProgram](functions/sampleProgram.md)
- [sampleProgramWindows](functions/sampleProgramWindows.md)
- [sampleRuntimeEasing](functions/sampleRuntimeEasing.md)
- [ssrRevealPaint](functions/ssrRevealPaint.md)
- [staggerProgram](functions/staggerProgram.md)
- [transitionReceipt](functions/transitionReceipt.md)

## References

### ProgramUniforms

Re-exports [ProgramUniforms](../../../worker/src/interfaces/ProgramUniforms.md)

***

### sampleProgramUniforms

Re-exports [sampleProgramUniforms](../../../worker/src/functions/sampleProgramUniforms.md)
