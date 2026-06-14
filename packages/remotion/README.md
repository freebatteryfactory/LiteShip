# @czap/remotion

React hooks that read precomputed per-frame state (from `@czap/core`'s `VideoRenderer`) inside Remotion compositions and turn it into CSS custom properties.

> Install this directly in a Remotion project that renders LiteShip-driven state. If you're starting a new project, start with the [`liteship`](https://www.npmjs.com/package/liteship) package instead — it brings the whole stack.

## Install

```bash
pnpm add @czap/remotion effect@4.0.0-beta.32
```

Peers: `react >= 18`, `remotion >= 4`, and `effect` v4 — which only ships as a beta, so install the pin above (any `>=4.0.0-beta.0` satisfies it).

## 30 seconds

```tsx
import { precomputeFrames, useCompositeState, cssVarsFromState } from '@czap/remotion';
import type { VideoRenderer, VideoFrameOutput } from '@czap/core';

// Once, before Remotion renders (server side or in calculateMetadata):
export async function loadFrames(renderer: VideoRenderer.Shape) {
  return precomputeFrames(renderer); // walks every frame into memory
}

// Inside a composition:
export function Title({ frames }: { frames: ReadonlyArray<VideoFrameOutput> }) {
  const state = useCompositeState(frames); // state for the current Remotion frame
  return <h1 style={cssVarsFromState(state)}>czap</h1>;
}
```

The `<h1>` carries the CSS variables (`--scale`, `--bg`, ...) computed for whichever frame Remotion is rendering — deterministic, so renders are reproducible. To skip prop threading, mount `<Provider frames={frames}>` once and call `useCzapState()` anywhere below it.

## Where it sits

A host adapter — it calls Remotion's `useCurrentFrame` so nothing else has to. Its only `@czap` dependency is `@czap/core`, for the `VideoRenderer` that produces frames and the state type those frames carry. Timeline authoring (tracks, beats, transitions) lives in `@czap/scene`; this package only consumes rendered frames. See the [package surfaces map](https://github.com/heyoub/LiteShip/blob/main/PACKAGE-SURFACES.md) for the full layout.

## If it does nothing

Every failure path returns a structurally-empty state instead of throwing: an empty `frames` array, or `useCzapState()` without a mounted `Provider`, renders with zero CSS variables and no error. If your composition shows unstyled output, check that `precomputeFrames` actually ran and its result reached the hook (`frames.length > 0`).

## Docs

- [Getting started](https://github.com/heyoub/LiteShip/blob/main/GETTING-STARTED.md)
- [Remotion demo](https://github.com/heyoub/LiteShip/tree/main/examples/remotion-demo) — boundary → quantizer → renderer → composition, end to end
- [Glossary](https://github.com/heyoub/LiteShip/blob/main/GLOSSARY.md) — the vocabulary used above
- [API reference](https://github.com/heyoub/LiteShip/tree/main/docs/api/remotion/src/) — generated from source

---

Part of [LiteShip](https://github.com/heyoub/LiteShip#readme) — powered by the CZAP engine (Content-Zoned Adaptive Projection), distributed as `@czap/*` packages.
