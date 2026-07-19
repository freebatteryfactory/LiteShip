# @liteship/remotion

React hooks that read precomputed per-frame state (from `@liteship/core`'s `VideoRenderer`) inside Remotion compositions and turn it into CSS custom properties.

> Install this directly in a Remotion project that renders LiteShip-driven state. If you're starting a new project, start with the [`liteship`](https://www.npmjs.com/package/liteship) package instead — it brings the whole stack.

## Install

```bash
pnpm add @liteship/remotion
```

Peers: `react >= 18`, `remotion >= 4`.

## 30 seconds

```tsx
import { precomputeFrames, useCompositeState, cssVarsFromState } from '@liteship/remotion';
import type { VideoRenderer, VideoFrameOutput } from '@liteship/core';

// Once, before Remotion renders (server side or in calculateMetadata):
export async function loadFrames(renderer: VideoRenderer.Shape) {
  return precomputeFrames(renderer); // walks every frame into memory
}

// Inside a composition:
export function Title({ frames }: { frames: ReadonlyArray<VideoFrameOutput> }) {
  const state = useCompositeState(frames); // state for the current Remotion frame
  return <h1 style={cssVarsFromState(state)}>liteship</h1>;
}
```

The `<h1>` carries the CSS variables (`--scale`, `--bg`, ...) computed for whichever frame Remotion is rendering — deterministic, so renders are reproducible. To skip prop threading, mount `<Provider frames={frames}>` once and call `useLiteshipState()` anywhere below it.

## Where it sits

A host adapter — it calls Remotion's `useCurrentFrame` so nothing else has to. Its only `@liteship` dependency is `@liteship/core`, for the `VideoRenderer` that produces frames and the state type those frames carry. Timeline authoring (tracks, beats, transitions) lives in `@liteship/scene`; this package only consumes rendered frames. See the [package surfaces map](https://github.com/freebatteryfactory/LiteShip/blob/main/PACKAGE-SURFACES.md) for the full layout.

## If it does nothing

Every failure path returns a structurally-empty state instead of throwing: an empty `frames` array, or `useLiteshipState()` without a mounted `Provider`, renders with zero CSS variables and no error. If your composition shows unstyled output, check that `precomputeFrames` actually ran and its result reached the hook (`frames.length > 0`).

## Authored-motion adapter

`sampleMotionFrame(plan, frame, durationInFrames)` samples the ONE shared kernel (`@liteship/core`'s `sampleProgram`, #130) at the composition's current frame (`t = frame / max(1, durationInFrames-1)`); `motionCssVars` folds the typed leaves into a Remotion `style`, formatted through the same `formatTypedValue` the browser floor uses. Pure + React-free, so a `calculateMetadata` or test can call it directly — the composition wraps it with `useCurrentFrame()`. A differential oracle proves the remotion leg renders identically to browser CSS, the browser runtime, scene, stage, and worker ([ADR-0040](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/adr/0040-cross-target-motion-parity.md)).

## Docs

- [Getting started](https://github.com/freebatteryfactory/LiteShip/blob/main/GETTING-STARTED.md)
- [Remotion demo](https://github.com/freebatteryfactory/LiteShip/tree/main/examples/remotion-demo) — boundary → quantizer → renderer → composition, end to end
- [Glossary](https://github.com/freebatteryfactory/LiteShip/blob/main/GLOSSARY.md) — the vocabulary used above
- [API reference](https://github.com/freebatteryfactory/LiteShip/tree/main/docs/api/remotion/src/) — generated from source

---

Part of [LiteShip](https://github.com/freebatteryfactory/LiteShip#readme) — distributed as `@liteship/*` packages.
