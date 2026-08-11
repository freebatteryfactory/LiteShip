# Media and Audio/Visual Time

Status: specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `12_media/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Define realm-neutral media assets, decoding requirements, analysis products, samples, frames, markers, envelopes, media events, and one semantic audio/visual coordinate shared by realtime and offline execution.

## Owns

- Media asset identity and metadata.
- Audio and video format contracts.
- Sample, frame, beat, onset, peak, waveform, and analysis definitions.
- Media-analysis cache identity.
- Frame/sample contracts and A/V synchronization semantics.
- Media events carried through semantic streams.
- Encoder and decoder requirements as typed holes.

## Does not own

- `AudioContext`, `AudioWorklet`, `WebCodecs`, filesystem, ffmpeg, cameras, microphones, or media devices.
- Host codec implementations.
- Scene hierarchy or timeline authoring.
- A separate realtime renderer and offline renderer with different semantics.

## Semantic contracts

Audio sample position is the authoritative coordinate for A/V-backed programs. Video frames, wall display time, scene sampling, beat markers, and offline rendering project from declared sample and frame rates.

Realtime and offline paths consume the same semantic media program and time coordinates. Host APIs differ; meaning does not.

## Laws

- Long-running sample coordinates do not use a 32-bit signed counter.
- Frame/sample conversion is explicit and deterministic.
- Analysis results name the exact asset revision, algorithm, parameters, and coordinate system.
- Media metadata is canonical portable data, not arbitrary host objects.
- Host decoders and encoders satisfy typed requirements.
- Cache identity includes every semantic input.
- Realtime and offline output agree at sampled coordinates.

## Operation vocabulary

- `defineMedia`, `defineAnalysis`, and `defineEnvelope` declare meaning.
- `decode` and `encode` are host-bound operations satisfying core ports.
- `analyze` produces addressed analysis values.
- `sample` evaluates media meaning at a coordinate.
- `render` physically realizes frames or audio in a host.

## Proof obligations

- Long-running counter and overflow tests.
- Exact frame/sample conversion.
- Analysis determinism and cache identity.
- Realtime/offline parity.
- Host decoder/encoder conformance.
- Audio evidence driving scene and quantization behavior.
- Media events preserve asset and coordinate identity through streams.
- Meaningful scene/media changes alter output pixels or samples.

## Implementation boundary

The media semantics and host requirements are specified. Physical codecs, analysis kernels, encoder paths, and device bindings are absent.

## Remaining work

Implementation must port and complete old media behavior, generalize DSP kernels, and qualify browser, worker, Wasm, native, and server paths.

## Machine-checkable projection

```yaml
home:
  path: 00_core/12_media
  title: "Media and Audio/Visual Time"
  maturity: specified
  implementation: absent
  runtime_exports: false
  dependency_authority: source-imports
  semantic_decisions:
  - one-realtime-offline-media-program
  - sample-coordinate-authority
  - host-codecs-as-requirements
  production_authority: false
```
