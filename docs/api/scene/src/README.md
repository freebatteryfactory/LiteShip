[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / scene/src

# scene/src

`@czap/scene` — **LiteShip** scene stack: typed timeline authoring over the
ECS substrate in `@czap/core`.

## Namespaces

- [BeatBinding](namespaces/BeatBinding/README.md)
- [SceneRuntime](namespaces/SceneRuntime/README.md)
- [Track](namespaces/Track/README.md)

## Interfaces

- [AudioTrack](interfaces/AudioTrack.md)
- [CompiledScene](interfaces/CompiledScene.md)
- [EffectTrack](interfaces/EffectTrack.md)
- [MixReceipt](interfaces/MixReceipt.md)
- [SceneContext](interfaces/SceneContext.md)
- [SceneContract](interfaces/SceneContract.md)
- [SceneInvariant](interfaces/SceneInvariant.md)
- [SceneRuntimeHandle](interfaces/SceneRuntimeHandle.md)
- [SceneRuntimeOptions](interfaces/SceneRuntimeOptions.md)
- [TrackSpawn](interfaces/TrackSpawn.md)
- [TransitionTrack](interfaces/TransitionTrack.md)
- [VideoTrack](interfaces/VideoTrack.md)

## Type Aliases

- [BeatComponent](type-aliases/BeatComponent.md)
- [BeatHandle](type-aliases/BeatHandle.md)
- [BeatSpawn](type-aliases/BeatSpawn.md)
- [EaseFn](type-aliases/EaseFn.md)
- [EaseName](type-aliases/EaseName.md)
- [EaseTag](type-aliases/EaseTag.md)
- [FadeEnvelope](type-aliases/FadeEnvelope.md)
- [FrameMark](type-aliases/FrameMark.md)
- [FrameMarkSum](type-aliases/FrameMarkSum.md)
- [PulseEnvelope](type-aliases/PulseEnvelope.md)
- [ResolvedEnvelope](type-aliases/ResolvedEnvelope.md)
- [ResolvedSceneContract](type-aliases/ResolvedSceneContract.md)
- [SceneBeat](type-aliases/SceneBeat.md)
- [SceneSubscenePartial](type-aliases/SceneSubscenePartial.md)
- [TrackEnvelope](type-aliases/TrackEnvelope.md)
- [TrackId](type-aliases/TrackId.md)
- [TrackKind](type-aliases/TrackKind.md)
- [TrackRef](type-aliases/TrackRef.md)

## Variables

- [BeatBinding](variables/BeatBinding.md)
- [beatBindingCapsule](variables/beatBindingCapsule.md)
- [ease](variables/ease.md)
- [fade](variables/fade.md)
- [Layout](variables/Layout.md)
- [pulse](variables/pulse.md)
- [Scene](variables/Scene.md)
- [SceneRuntime](variables/SceneRuntime.md)
- [sceneRuntimeCapsule](variables/sceneRuntimeCapsule.md)
- [syncTo](variables/syncTo.md)
- [Track](variables/Track.md)

## Functions

- [addFrameMarks](functions/addFrameMarks.md)
- [AudioSystem](functions/AudioSystem.md)
- [Beat](functions/Beat.md)
- [bindBeats](functions/bindBeats.md)
- [compileScene](functions/compileScene.md)
- [easeFnFor](functions/easeFnFor.md)
- [EffectSystem](functions/EffectSystem.md)
- [envelopeFactor](functions/envelopeFactor.md)
- [inheritContext](functions/inheritContext.md)
- [PassThroughMixer](functions/PassThroughMixer.md)
- [resolveBeat](functions/resolveBeat.md)
- [resolveBeatProjectionToSceneBeats](functions/resolveBeatProjectionToSceneBeats.md)
- [resolveEnvelope](functions/resolveEnvelope.md)
- [resolveFrameMark](functions/resolveFrameMark.md)
- [SyncSystem](functions/SyncSystem.md)
- [trackRefId](functions/trackRefId.md)
- [TransitionSystem](functions/TransitionSystem.md)
- [VideoSystem](functions/VideoSystem.md)
