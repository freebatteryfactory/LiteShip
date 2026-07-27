[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / worker/src

# worker/src

`@liteship/worker` — **LiteShip** off-deck crew: compositor and render workers
that keep the main thread trim while boundaries and media stay live.

This package ships:

- [SPSCRing](interfaces/SPSCRing.md): lock-free single-producer/single-consumer ring
  backed by `SharedArrayBuffer`, used for real-time state streaming
  from a worker to the main thread.
- [CompositorWorker](type-aliases/CompositorWorker.md): a factory that spins up a worker which
  evaluates quantizer boundaries and emits `CompositeState`.
- [RenderWorker](interfaces/RenderWorker.md): a factory for a worker that renders
  `VideoFrameOutput` into an `OffscreenCanvas`.
- [WorkerHost](namespaces/WorkerHost/README.md): a thin lifecycle wrapper around `Worker` with
  typed message helpers.

## SharedArrayBuffer requirements

The SPSC ring buffer uses `SharedArrayBuffer`, which requires the page
to be served with the following HTTP headers:

  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp

Workers created by this package use inline Blob URLs and do not require
separate worker entry files or bundler configuration.

## Namespaces

- [Messages](namespaces/Messages/README.md)
- [WorkerHost](namespaces/WorkerHost/README.md)

## Interfaces

- [MotionSampleMessage](interfaces/MotionSampleMessage.md)
- [ProgramUniforms](interfaces/ProgramUniforms.md)
- [QuantizerBoundarySource](interfaces/QuantizerBoundarySource.md)
- [RenderWorker](interfaces/RenderWorker.md)
- [ResolvedStateAckPayload](interfaces/ResolvedStateAckPayload.md)
- [SPSCRing](interfaces/SPSCRing.md)
- [SPSCRingPair](interfaces/SPSCRingPair.md)
- [TransferableCanvas](interfaces/TransferableCanvas.md)
- [WorkerConfig](interfaces/WorkerConfig.md)
- [WorkerHost](interfaces/WorkerHost.md)
- [WorkerHostRenderConfig](interfaces/WorkerHostRenderConfig.md)
- [WorkerLike](interfaces/WorkerLike.md)

## Type Aliases

- [CompositorWorker](type-aliases/CompositorWorker.md)
- [CompositorWorkerState](type-aliases/CompositorWorkerState.md)
- [FromWorkerMessage](type-aliases/FromWorkerMessage.md)
- [ToWorkerMessage](type-aliases/ToWorkerMessage.md)
- [WorkerMetrics](type-aliases/WorkerMetrics.md)

## Variables

- [CompositorWorker](variables/CompositorWorker.md)
- [Messages](variables/Messages.md)
- [RenderWorker](variables/RenderWorker.md)
- [SPSCRing](variables/SPSCRing.md)
- [WorkerHost](variables/WorkerHost.md)

## Functions

- [motionSampleMessage](functions/motionSampleMessage.md)
- [sampleProgramUniforms](functions/sampleProgramUniforms.md)
