# Media and Audio/Visual Time

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `12_media/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Define realm-neutral media assets, decode and encode requirements, format and container contracts, analysis identity and products, samples, semantic and physical frames, media events, and one semantic audio/visual coordinate shared by realtime and offline execution.

## Owns

- The bounded, ordered, lossless media source: ordered production, consumer credit, non-empty batches, explicit completion, cancellation, and failure.
- Physical payload identity by *representation*, with origin left to provenance.
- Three sockets — decode, encode, and mux — each total over an admitted profile.
- The export request, and separately the decision about it.
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

- A media source is lossless. `13_stream` owns push delivery and may lawfully drop oldest, drop newest, or coalesce — losing a stale UI event is recoverable. Losing frame 317 changes the movie, so there is no dropped arm here at all. Deliberate decimation is a media transformation with a receipt, never a consequence of a full buffer.
- Encoding consumes a source and produces a source. A tuple at either end reintroduces the memory wall that made long-form rendering impossible: a five-minute render cannot exist in memory before encoding starts.
- The encode input and the track configuration are selected by one shared tag, so an audio-only output cannot be requested with a video frame source, and an audio-video output cannot be requested with half its input.
- A physical frame carries no coordinate of its own — provenance owns it. A rasterized frame's coordinate is its semantic frame's; a decoded frame's is its source's; a captured frame's is the capture's.
- Provenance is specialized per frame kind rather than one union with arms a frame can never inhabit. Decoded frames needed an arm of their own rather than wearing a rasterized nametag that was never true.
- Payload identity follows representation, not realm. Two hosts producing the same canonical bytes interoperate; that is a feature, and four realm-named wrappers around one structure were four comments on the same type.
- Every codec operation consumes an *admitted* profile. That is what makes a total contract honest — a bare reference is a branded identity anyone can mint, so a total operation over it would promise output for codecs the host has never heard of. Totality means no compatibility-refusal arm after admission; it never means the physical work cannot fail, and every operation still returns a `Result`.
- A packet names the source, track, and profile that produced it, and carries its own sequence. Without the track relation a mux can assemble a container whose roster its packets never had.
- An export request names its subject, cut, and egress, and carries no disposition. A request holding its own answer is a decided plan wearing a request nametag, and it let a semantic-projection disposition exist while naming nothing at all.
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

- **Render-path purity.** Evaluating a frame at a coordinate reads no ambient clock and no ambient randomness: no `Date.now`, no `performance.now`, no `Math.random`, no `requestAnimationFrame`, no locale or timezone read that was not named in the cut. This is why nothing external is needed for deterministic offline driving — `FrameIndex` means there is no clock to fake — and it is the obligation that makes semantic frame determinism true rather than merely declared. A type cannot see a function body, so it is stated here and proved by assurance.
- Long-running counter and overflow tests.
- Exact frame/sample conversion.
- Analysis determinism and cache identity.
- Realtime/offline parity.
- Host decoder/encoder conformance.
- Audio evidence driving scene and quantization behavior.
- Media events preserve asset and coordinate identity through streams.
- Meaningful scene/media changes alter output pixels or samples — that a frame's declared cut is the cut its pixels actually came from is the runtime obligation the semantic-frame law bounds but cannot prove.

## Implementation boundary

Codecs, analysis kernels, encoders, muxers, and device bindings must preserve media coordinates, admitted profiles, frame and packet envelopes, custody, and export dispositions.

Porting and completing old media behaviour, generalizing DSP kernels, and qualifying browser, worker, Wasm, native, and server paths are implementation obligations this architecture already authorizes.
