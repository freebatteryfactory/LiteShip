# Media and Audio/Visual Time

Status: specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `12_media/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Define realm-neutral media assets, decode and encode requirements, format and container contracts, analysis identity and products, samples, semantic and physical frames, media events, and one semantic audio/visual coordinate shared by realtime and offline execution.

## Owns

- Media asset identity and metadata.
- Codec, track, packet, and container contracts, and the finished media artifact.
- Sample, frame, beat, onset, peak, waveform, and analysis definitions.
- Analysis identity: the algorithm, parameters, coordinate system, and asset revision that determined a result, and the cache address derived from them.
- The semantic frame, which owns one exact cut and no coordinate beside it.
- The physical frame envelope, generic over an opaque host payload and its provenance.
- Media events carried through semantic streams.
- Encoder and decoder requirements as typed holes, whose contract shapes core fixes.
- The export disposition: semantic projection, host capture, or unavailable.

## Does not own

- `AudioContext`, `AudioWorklet`, `WebCodecs`, filesystem, ffmpeg, cameras, microphones, or media devices.
- Host codec implementations, raster profiles, or capture profiles.
- Scene hierarchy or timeline authoring. `11_scene` owns those, including authored markers and envelopes — this home owns only what analysis observed at an exact asset coordinate.
- Interpolation. `09_quantization` remains that authority.
- A separate realtime renderer and offline renderer with different semantics.
- The transactional commit. `08_state` owns the cut; this home consumes it and never imports `16_runtime`.

## Semantic contracts

Audio sample position is the authoritative coordinate for A/V-backed programs. Video frames, wall display time, scene sampling, beat markers, and offline rendering project from declared sample and frame rates.

Realtime and offline paths consume the same semantic media program and time coordinates. Host APIs differ; meaning does not.

## Laws

- Long-running sample coordinates do not use a 32-bit signed counter.
- Frame/sample conversion is explicit and deterministic.
- A semantic frame carries one cut and no sibling frame index, sample range, or time member.
- Semantic and physical reuse are distinct algebras with distinct predicates and distinct owners.
- Rasterized provenance names the exact semantic frame it realizes; host-captured provenance cannot, and carries a composition instead.
- A physical frame is addressed apart from its payload, so identical pixels at two coordinates remain two frames.
- Track configuration is an explicit choice of audio-only, video-only, or audio-video — never an array that can be silently empty.
- An encode request carries actual frames, not a schema describing them, and the population cannot be empty.
- Artifact identity is caller-carried; its address and digest are producer-derived.
- Analysis results name the exact asset revision, algorithm, parameters, and coordinate system, and cache identity is derived from all of them.
- Media metadata is canonical portable data, not arbitrary host objects.
- Host decoders and encoders satisfy typed requirements whose contract shape this home fixes.
- Every export request receives exactly one disposition, and an unavailable one carries diagnostics and a remediation.
- Realtime and offline output agree at sampled coordinates.

## Operation vocabulary

- `decode` and `encode` are host-bound operations satisfying the requirement contracts declared here.
- `analyze` produces addressed analysis results carrying the profile that determined them.
- `sample` evaluates media meaning at a coordinate.

Authoring constructor names are not architecture and are not listed. `render` is a host relationship, not a core media operation — `01_hosts/server/10_media` and `01_hosts/web/09_graphics` own it.

## Proof obligations

- Long-running counter and overflow tests.
- Exact frame/sample conversion.
- Analysis determinism and cache identity.
- Realtime/offline parity.
- Host decoder/encoder conformance.
- Audio evidence driving scene and quantization behavior.
- Media events preserve asset and coordinate identity through streams.
- Meaningful scene/media changes alter output pixels or samples — that a frame's declared cut is the cut its pixels actually came from is the runtime obligation the semantic-frame law bounds but cannot prove.

## Implementation boundary

The media semantics, codec requirements, frame envelopes, and export dispositions are specified. Physical codecs, analysis kernels, encoder paths, muxers, and device bindings are absent.

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
  - a-frame-owns-one-cut-and-no-sibling-coordinate
  - semantic-and-physical-reuse-stay-distinct
  - rasterized-provenance-names-its-semantic-frame
  - track-configuration-is-explicit-never-an-empty-array
  - frames-not-a-schema-describing-frames
  - artifact-bytes-are-producer-derived
  - authored-markers-belong-to-the-scene
  - export-disposition-attaches-to-the-request
  production_authority: false
```
