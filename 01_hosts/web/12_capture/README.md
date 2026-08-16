# Web Composite Capture

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `01_hosts/web/12_capture/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Turn a committed browser composition into a physical frame, and say honestly where those pixels came from.

## Owns

- The capture scope: which part of a committed composition was selected.
- Browser-composite capture of an exact committed web surface.
- The orchestration from committed web state to a physical captured frame.
- Capture profile identity, and capture availability and permission as evidence.

## Does not own

- Scene evaluation. `00_core/11_scene` owns it.
- Rasterization or GPU resource readback. `09_graphics` owns those.
- Codecs, media formats, packets, or containers. `08_media` and `00_core/12_media` own those.
- Region custody or DOM mutation. `01_region` owns those.
- Screen-capture protocol details as semantic truth.

## Why this is a home and not a member

`08_media` sits above `09_graphics` in the waterfall and cannot lawfully consume it, so capture cannot live there. `09_graphics` could reach it, but capturing a committed region or browser surface is not reading a GPU resource: the composition may span DOM text, native layout, form controls, images, canvas, WebGL, video, and foreign regions, none of which the graphics home has any business knowing about.

A late-ordinal home that gathers physical outputs *after* they are lawfully committed is the shape that reaches across this many authorities without becoming the parent of any of them.

## Capture is not rasterization

The two produce the same envelope and make different claims, and the difference is the whole reason both exist.

A rasterized frame says: *these pixels realize this exact semantic frame, on this exact graphics resource, under this exact raster profile.* That is evidence a subject had a faithful projection.

A captured frame says: *these pixels came off this committed composition, under this capture profile.* That is evidence of nothing beyond itself.

The type carries the distinction rather than the prose: a captured frame's provenance is captured-only by construction, so there is no rasterized arm for a capture to inhabit and no way for one to name a semantic frame it realizes. If it could, a capture would be admissible everywhere a rasterization is, and "this is what the scene means" would stop being distinguishable from "this is what the browser drew".

## What the platform actually permits

There is no standard operation that draws an arbitrary element. `CanvasImageSource` admits images, video, canvas, `ImageBitmap`, `OffscreenCanvas`, and `VideoFrame` — never a generic element. Capturing the composite requires the user to select a surface and grant permission, per session.

Both facts are why this home exists and why it claims so little. Capture is a legitimate way to obtain pixels from a page. It is not a portable headless renderer, and it must never be presented as proof that every semantic subject had a faithful video projection.

## Laws

- The composition restates no boundary. `ProjectionCommit` already carries the region lease whose membership owns it, and a second writable boundary beside it is one fact with two owners. The scope is a different fact — capture may target less than the full region — and it gets an identity rather than a duplicate.
- The intrinsic browser entrypoint is grounded; the owned, permission-sensitive session authority is constructed by an offer requiring it. Grounding admits what exists; an offer acquires what does not.
- A captured frame's provenance is captured-only by construction. There is no rasterized arm to inhabit.
- A capture names a committed composition: a projection commit and a capture scope. Neither alone identifies which pixels.
- A captured frame carries host-captured provenance and can never carry rasterized provenance.
- Availability is answered, not assumed, and refusal says which kind it is — permission-required and unavailable have different remediations.
- Capture decides nothing about codecs, containers, or bitrates, and holds no scene or frame model of its own.
- A capture profile's reproducibility claim is exact over its own reference, and the full claim grammar stays available so `unclaimed` remains sayable.

## Proof obligations

These are runtime claims, not unfinished work. A type cannot express any of them, so they are named here to mark the boundary of what compiling proves:

- That a captured composition genuinely contains what the page displayed at the named commit.
- That permission is obtained before any surface is read, and that a withdrawn permission ends capture rather than yielding a stale frame.
- That no capture path reads pixels from a region mid-write.

## Implementation boundary

A capture realization must preserve source identity, permission evidence, admitted media profiles, custody, cancellation, and device failure.
