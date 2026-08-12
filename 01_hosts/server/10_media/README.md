# Server Media

Status: specified with physical profiles deferred; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `01_hosts/server/10_media/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Own server-physical media resources: native decode, analysis, render, and encode jobs bound to their exact source revision, speaking core's sample coordinate, composed over tools and scoped filesystem.

## Owns

- `renderFrames`: one exact semantic cut into a bounded source of physical frames, under an exact render profile.
- Four distinct relationships: decode, render, encode, and mux.
- Media packet streams bound to the exact job and encode profile that produced them.
- The media job: bound to the exact source revision it renders — the job cannot forget which authored content it rendered — with core's sample position, the exact core `MediaFrame` contract being rendered, its exact named tool, the exact physical input stream and output destination it depends on (both root-correlated filesystem resources), determinism evidence (a witness address, or an explicit refusal to claim it), a job-exact bounded output stream, an output address, job-exact cancellation, and an owned lifecycle.
- The complete job request: caller-carried job identity, source, position, the core frame contract, tool, physical input stream, and output destination together; no naked render and no output whose physical inputs were never named.
- The threaded ancestry: rendering is correlated through the provider's generic operation — the job the public path returns speaks exactly the contract, tool, roots, and identity the request named, and the exact `FileStream` the filesystem provider returns enters the request without erasure or a cast. The upstream waterfall arrow composes; meaningful pixels and byte fidelity stay implementation assurance.

## Does not own

- Scene, media, casting, or A/V semantic meaning — core. Tool contracts — `07_tool`. Encoder choice as architecture — the tool profile is an input, not a semantic commitment.

## The fidelity obligation

The reset's canonical failure was a scene render whose output was a flat color fill that passed its smoke test. The source-revision binding on every job is this home's structural answer: at implementation, authored scene differences must produce different semantic frames and meaningful output, proved against the revision the job names.

## Laws

- The render stage owns its own profile. Borrowing the encode profile attached a claim about rasterization to a description of the codec that runs afterwards. One stage, one profile, one claim.
- The render request carries no sample position beside its cut. The media cut already owns the frame and sample coordinate.
- This host fills core's decode, encode, and mux sockets and declares none of its own. A server-local codec contract would be a second vocabulary beside core's.
- The job carries the exact admitted tool profile, not a bare tool reference — otherwise two admitted builds of the same binary, one pinned and one from the PATH, are freely interchangeable.
- A render job carries an actual non-empty frame population. A schema describing a frame is satisfied by a job that never received one, which is how a renderer emits a valid file containing none of the authored work.
- Packets are media packets. Network framing cannot satisfy the stream, and the comparison is structural because the two are both bytes with metadata and only their members keep them apart.
- A packet stream is exact over both its job and its profile, so packets encoded under one profile cannot be reported under another.
- The mux stage owns the artifact claim, over the container rather than the encoder. Two runs may emit identical packets and different container bytes.
- The media job carries the exact tool profile, not a bare tool reference.
- Decode, render, encode, and mux are four operations and do not collapse into one uninspectable call.
- A job binds its exact source revision, contract, tool, input, destination, and identity, and speaks the core coordinate — a job of another contract or identity is not this job.
- Rendering threads the request ancestry through the provider's generic operation, and the output stream is job-exact.
- The sample position is core's coordinate — index at a rate.
- A job is receipted, cancellable job-exactly, and owned; requests are complete.

## Proof obligations

- Deterministic outputs bind to source revisions; realtime and offline share the semantic clock; output is meaningful, never a fill.

Implementation-phase fidelity fixtures; encode batch sizes are empirical.

## Machine-checkable projection

```yaml
home:
  path: 01_hosts/server/10_media
  title: "Server Media"
  maturity: specified-with-physical-profiles-deferred
  implementation: absent
  runtime_exports: false
  dependency_authority: source-imports
  semantic_decisions:
  - render-owns-its-own-profile
  - no-sample-position-beside-the-cut
  - the-server-fills-the-core-sockets
  - four-relationships-not-one-render
  - frames-not-a-schema-describing-frames
  - media-packets-are-not-network-chunks
  - the-container-owns-the-artifact-claim
  - jobs-bind-their-source-revision
  - render-threads-request-ancestry
  - exact-filesystem-streams-compose-without-erasure
  - core-sample-coordinate-never-restated
  - tool-profiles-are-inputs-not-architecture
  empirical_contracts:
  - encode-batch-sizes
  - concurrency
  production_authority: false
```
