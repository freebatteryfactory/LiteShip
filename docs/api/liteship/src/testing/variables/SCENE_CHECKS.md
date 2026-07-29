[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/testing](../README.md) / SCENE\_CHECKS

# Variable: SCENE\_CHECKS

> `const` **SCENE\_CHECKS**: readonly \[\{ `id`: `"determinism"`; `lane`: `"unit"`; `title`: `"determinism: identical seed produces identical frame stream across 3 runs"`; \}, \{ `id`: `"sync-accuracy"`; `lane`: `"unit"`; `title`: `"sync accuracy: audio and video frame timestamps align within +/- 1ms"`; \}, \{ `id`: `"invariant-preservation"`; `lane`: `"unit"`; `title`: `"invariant preservation: every declared scene invariant holds across playback"`; \}, \{ `id`: `"per-frame-budget"`; `lane`: `"bench"`; `title`: `"per-frame budget: p95 frame time below declared budget"`; \}\]

Defined in: core/dist/harness/scene-composition.d.ts:69

The four canonical sceneComposition checks and the lane each runs in. The
`lane` here is the DECLARATIVE lane model: it states where the check belongs
(unit vs bench) independent of whether a given scene can satisfy it. The
driver's probe (see [HarnessContext.sceneDriver](../interfaces/HarnessContext.md#scenedriver)) then resolves each to
a [SceneCheckDisposition](../type-aliases/SceneCheckDisposition.md) — wired-real-in-lane or not-applicable.
