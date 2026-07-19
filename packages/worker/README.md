# @liteship/worker

Evaluates boundary states in a Web Worker so the main thread never blocks on them.

> You usually don't install this directly — it arrives as a dependency of
> [`@liteship/astro`](https://github.com/freebatteryfactory/LiteShip/tree/main/packages/astro),
> whose `client:worker` directive routes through it. Install that instead
> unless you are hosting an off-thread evaluator in your own (non-Astro) runtime.

## Install

```bash
pnpm add @liteship/astro   # brings @liteship/worker with it
# direct use: pnpm add @liteship/worker @liteship/core
```

Workers are spawned from inline Blob URLs — no separate worker entry file, no bundler configuration. Only the `SPSCRing` shared-memory channel needs the page served with `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`; without those headers `new SharedArrayBuffer(...)` throws. Everything below works without them.

## 30 seconds

```ts
import { Boundary, StateName } from '@liteship/core';
import { CompositorWorker } from '@liteship/worker';

// A boundary names the thresholds where one state becomes the next.
const layout = Boundary.make({
  input: 'viewport.width',
  at: [
    [0, 'compact'],
    [768, 'wide'],
  ],
});

const compositor = CompositorWorker.create();
compositor.addQuantizer('layout', {
  id: layout.id,
  states: layout.states.map((s) => StateName(s)),
  thresholds: layout.thresholds,
});
compositor.onState((state) => {
  console.log(state.discrete['layout']);
});
compositor.evaluate('layout', window.innerWidth);
compositor.requestCompute();
```

Logs `compact` (below 768px) or `wide` — selected inside the worker, delivered back as a state snapshot. Call `compositor.dispose()` when finished.

## Where it sits

A runtime layer one step below the host integrations: `@liteship/astro` delegates its worker directive here rather than carrying its own worker protocol. Its only dependency is [`@liteship/core`](https://github.com/freebatteryfactory/LiteShip/tree/main/packages/core), for boundary definitions and the shared state-snapshot contracts. It also ships `SPSCRing` (a lock-free shared-memory ring for streaming values out of a worker without blocking either side), `RenderWorker` for OffscreenCanvas rendering, and `WorkerHost`, a typed lifecycle wrapper around `Worker`. See the
[package surfaces map](https://github.com/freebatteryfactory/LiteShip/blob/main/PACKAGE-SURFACES.md)
for the full layout.

## If it does nothing

`onState` callbacks only fire after a compute round: if you `evaluate(...)` and never see a snapshot, you likely skipped `requestCompute()`. Pass a real `Boundary.make(...).id` to `addQuantizer` — the id is a content address (a hash of the definition), and downstream caching keys on it.

## Authored-motion adapter (minimal)

`motionSampleMessage(plan, t)` is the worker's deliberately **thin** authored-motion adapter (#130): it runs the ONE shared kernel (`@liteship/core`'s `sampleProgram`, via the re-exported `sampleProgramUniforms`) off the main thread and returns a structured-clone-safe `{ type: 'motion-sample', css, wgsl }` envelope. The host relays `css`/`wgsl` onto a bound element with `dispatchLiteshipEvent(el, 'liteship:uniform-update', …)` — the SAME channel the main-thread floor already dispatches. There is no new compositor, render loop, or protocol; the sample envelope is kept out of the `FromWorkerMessage` union on purpose. A differential oracle proves the worker leg renders identically to every other target ([ADR-0040](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/adr/0040-cross-target-motion-parity.md)).

## Docs

- [Getting started](https://github.com/freebatteryfactory/LiteShip/blob/main/GETTING-STARTED.md)
- [Hosting guide](https://github.com/freebatteryfactory/LiteShip/blob/main/HOSTING.md) — the COOP/COEP headers per host
- [Glossary](https://github.com/freebatteryfactory/LiteShip/blob/main/GLOSSARY.md) — the vocabulary used above
- [API reference](https://github.com/freebatteryfactory/LiteShip/tree/main/docs/api/worker/src/) — generated from source

---

Part of [LiteShip](https://github.com/freebatteryfactory/LiteShip#readme) — distributed as `@liteship/*` packages.
