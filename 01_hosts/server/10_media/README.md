# Server Media

Status: specified with physical profiles deferred; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `01_hosts/server/10_media/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Own the one server-physical media relationship that has no owner upstream — turning an exact semantic cut into physical frames — and fill core's codec sockets with this machine's native tools.

## Owns

- `renderFrames`, the single operation on `ServerMediaAuthority`: one `ServerRenderRequest` in, a `ServerRenderJob` or diagnostics out.
- The render profile: an addressed configuration and a reproducibility claim over that profile. A render profile, not an encode profile — the rasterizer, font stack, and colour pipeline decided these bytes, and the codec that runs afterwards did not.
- The physical frame, which is core's `RasterizedFrame` at this host's render profile.
- The render request: job identity, source program address, the media cut, the frame contract schema, the render profile, the admitted tool profile, and an admitted output path.
- The render job: everything the request named, plus a bounded `MediaSource` of produced frames, a job-exact cancellation signature, and an owned lifecycle.
- Native codec admission — whether this machine's tools accept a decode, encode, or container profile — and the deployment grounding that supplies it.
- The offer that constructs the media provider over tool authority, scoped filesystem, and codec admission, and that provides core's decoder, encoder, and mux requirements.

## Does not own

- Decode, encode, and mux *contracts*. Those are `00_core/12_media`'s. This host fills them through its offer's provided row and declares none of its own; `ServerMediaAuthority` has exactly one member, and a law pins that `decode` and `encode` are not keys of it.
- Scene, media, casting, or A/V semantic meaning — core's.
- Tool contracts — `07_tool`.
- Encoder choice as architecture. The tool profile is an input, not a semantic commitment.

## What the request deliberately does not carry

No sample position beside the cut. `MediaCut` already owns the frame and sample coordinate, and a sibling position is the duplicate coordinate this layer removed everywhere else. A law pins its absence.

No physical input stream. The request names a source program *address* and an admitted output path; it does not carry an opened input handle.

## The fidelity obligation

The reset's canonical failure was a scene render whose output was a flat colour fill that passed its smoke test. The request carries the frame contract *and* the job carries an actual frame source, because a schema describing a frame is satisfied by a job that never received one — which is exactly how a renderer emits a valid file containing none of the authored work.

At implementation, authored scene differences must produce different frames and meaningful output, proved against the source the job names.

## Laws

- The render stage owns its own profile; borrowing the encode profile attached a rasterization claim to a description of the codec that runs afterwards.
- The render request carries no sample position beside its cut.
- This host fills core's codec sockets and declares none of its own — `decode` and `encode` are not members of the authority.
- The job carries the exact admitted tool profile, not a bare tool reference, so two admitted builds of one binary are not interchangeable.
- A render job carries a frame source, not merely a schema describing frames.
- The job binds its exact source, cut, contract, profiles, destination, and identity; a job of another contract or identity is not this job.
- The rendered frame is core's rasterized frame at this host's render profile.
- The sample coordinate is core's — an index at a rate.
- A job is cancellable job-exactly and its lifecycle is owned.
- Codec admission is a deployment grounding, unowned, because which build sits beside the process is what a deployment decides and a program discovers.

## Proof obligations

- Deterministic outputs bind to the source they render; realtime and offline share the semantic clock; output is meaningful, never a fill.
- That an admitted codec profile reflects what the installed tool actually accepts, rather than what a manifest claimed.

Implementation-phase fidelity fixtures. Physical render profiles and encode batch sizes are empirical.

## Known gap

`ServerSamplePosition` has no consumer inside this home. It is read by the surface and by one law proving it is core's coordinate, and by nothing on the render path — which is correct, because the request carries the cut instead. It is a statement that this home does not restate core's sample coordinate, and it should either acquire a consumer or be deleted rather than kept as a claim about a path it is not on.
