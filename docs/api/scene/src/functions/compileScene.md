[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / compileScene

# Function: compileScene()

> **compileScene**(`scene`): [`CompiledScene`](../interfaces/CompiledScene.md)

Defined in: [scene/src/compile.ts:108](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/compile.ts#L108)

Compile a [SceneContract](../interfaces/SceneContract.md) into a pure [CompiledScene](../interfaces/CompiledScene.md)
descriptor. No world is constructed here — see [SceneRuntime](../namespaces/SceneRuntime/README.md).

The contract is normalized FIRST: every `Beat()` / frame-mark on a
track's `from` / `to` resolves to a numeric frame index using the
scene's `bpm` + `fps` (see `sugar/beat.ts`). Invariants run against
that [ResolvedSceneContract](../type-aliases/ResolvedSceneContract.md), so checks like
`t.to <= (duration / 1000) * fps` always operate on numbers — never
on unresolved beat handles.

Every declared [SceneInvariant](../interfaces/SceneInvariant.md) is evaluated against the
normalized contract before any compilation work happens. A check that
returns `false` — or throws — counts as a violation. ALL violations
are collected, then reported together in a single
ValidationError (module `'compileScene'`) listing each
violated invariant's name and message, so one compile run surfaces
every problem instead of stopping at the first.

If the scene declares a `beats?` field, those beat markers are
propagated unchanged onto the compiled descriptor. The runtime
spawns one Beat-tagged entity per marker before registering systems
(see SceneRuntime.build) so SyncSystem can query them on the first
tick. Asset-derived beats (BeatMarkerProjection) are wired by feeding
the projection's output into `scene.beats` ahead of compile.

Built-in structural checks run alongside the declared invariants:
fps must be positive and finite, every resolved range must run
forward (`from <= to`), and transition `between` refs must name
declared video tracks (unknown ids get a did-you-mean suggestion).
A track extending past an explicitly declared `duration` is reported
as a `track-past-duration` Diagnostics warning — truncation is legal
when intended — rather than failing the compile.

## Parameters

### scene

[`SceneContract`](../interfaces/SceneContract.md)

## Returns

[`CompiledScene`](../interfaces/CompiledScene.md)

## Throws

ValidationError when structural checks or declared scene
invariants fail — all problems are collected into one error.
