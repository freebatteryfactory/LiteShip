# @czap/stage

The verb layer — casts one `DocumentGraph` to multiple carriers (a static Astro page **and** a headless video) from a single source digest, and proves both derive from it.

## Install

```bash
pnpm add @czap/stage effect@beta
```

`effect` must be the Effect 4 beta (`@czap/stage` declares it as a peer). The core entry is backend-agnostic; the headless ffmpeg byte-encoder is opt-in via the `@czap/stage/ffmpeg` subpath (it pulls `node:child_process`/`node:fs`, so it stays off the main entry).

## 30 seconds

```ts
import { dualExport } from '@czap/stage';
import type { DocumentGraph } from '@czap/core';

// `graph` is an addressed DocumentGraph (built by @czap/compiler).
const result = await dualExport(graph);

result.sharedSourceDigest === graph.digest; // true — the ONE source both casts read
result.astro.carrier; // 'astro-page' — sealed ExportNode for the static page
result.video.carrier; // 'video'      — sealed ExportNode for the frame-addressed video
result.receipt;       // parent MERGE envelope: previous = [astroReceipt, videoReceipt]
```

`dualExport` runs both existing casters, content-addresses each artifact through the one kernel, and returns a single assertable head — a merge receipt whose `previous` joins both child receipts and whose payload pins `sharedSourceDigest`. The proof is that `sharedSourceDigest === graph.digest`, not that two outputs happen to agree.

For a real, ffprobe-validatable MP4 in node/CI, inject the ffmpeg backend:

```ts
import { dualExportNode } from '@czap/stage';
import { ffmpegFrameEncoder, ffmpegEncodeAvailable } from '@czap/stage/ffmpeg';

if (ffmpegEncodeAvailable()) {
  const r = await dualExportNode(graph, ffmpegFrameEncoder());
  // r.encoded.bytes is a real MP4; r.sharedSourceDigest === graph.digest still holds
}
```

## Where it sits

Stage owns no identity kernel and reinvents no caster. It walks the graph and drives what already exists — `CSSCompiler.compile` (`@czap/compiler`), the satellite helpers (`@czap/astro`), `VideoRenderer` over a `Compositor` (`@czap/core`) — and mints every address through `CanonicalCbor` → `AddressedDigest` (the `@czap/core` kernel). Core stays pure nouns; stage is the verbs over it. See the [package surfaces map](https://github.com/freebatteryfactory/LiteShip/blob/main/PACKAGE-SURFACES.md).

## The byte-encode is injected

The core entry never imports a codec. `exportVideo` content-addresses the produced per-frame `CompositeState` snapshots, not encoded bytes — so the same-source proof never depends on a codec running. To emit real bytes, inject a `FrameEncoder` at the call site: the node ffmpeg adapter from `@czap/stage/ffmpeg`, or WebCodecs in a browser wrapper. The proof's video carrier always addresses the frames, identical across both paths.

## Docs

- [Getting started](https://github.com/freebatteryfactory/LiteShip/blob/main/GETTING-STARTED.md)
- [ADR-0015 — Document graph IR + AI cast envelope](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/adr/0015-document-graph-ir.md) — the IR stage casts
- [Glossary](https://github.com/freebatteryfactory/LiteShip/blob/main/GLOSSARY.md) — the vocabulary used above
- [API reference](https://github.com/freebatteryfactory/LiteShip/tree/main/docs/api/stage/src/) — generated from source

---

Part of [LiteShip](https://github.com/freebatteryfactory/LiteShip#readme) — powered by the CZAP engine (Content-Zoned Adaptive Projection), distributed as `@czap/*` packages.
