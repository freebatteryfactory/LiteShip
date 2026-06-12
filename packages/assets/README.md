# @czap/assets

Decodes WAV audio to samples (plus image/video metadata probes) and derives deterministic analysis — beat markers, onsets, waveform — that scenes can sync to.

> Install this directly when a scene needs decoded audio or beat/onset analysis. If you're starting a new project, start with the [`liteship`](https://www.npmjs.com/package/liteship) package instead — it brings the whole stack.

## Install

```bash
pnpm add @czap/assets effect@4.0.0-beta.32
```

`effect` v4 is a required peer and only ships as a beta — install the pin above (any `>=4.0.0-beta.0` satisfies it).

## 30 seconds

```ts
import { readFile } from 'node:fs/promises';
import { defineAsset, audioDecoder, detectBeats } from '@czap/assets';

// Register the asset once — scenes reference it by id via AssetRef('intro-bed').
defineAsset({
  id: 'intro-bed',
  source: 'audio/intro-bed.wav',
  kind: 'audio',
  budgets: { decodeP95Ms: 50 }, // decode-time budget, in milliseconds
  invariants: [],
});

const file = await readFile('audio/intro-bed.wav');
const audio = await audioDecoder(new Uint8Array(file).buffer);
const { bpm, beats } = detectBeats(audio);
console.log(`${Math.round(bpm)} bpm, ${beats.length} beats`);
```

Logs the tempo estimate and beat count for the file. `beats` are sample indices, not milliseconds — `@czap/scene` provides `resolveBeatProjectionToSceneBeats` to convert them to timeline time. Same input, same output, every run: the analysis has no randomness, so results are cacheable by content.

## Where it sits

A layered package: `defineAsset` wraps each declaration in a capsule (a declared unit carrying budgets and invariant checks) via `@czap/core`, and the analysis output shapes come from `@czap/_spine` so `@czap/scene` can consume them without depending on this package. The image and video decoders probe format/dimension metadata only — frame decoding belongs to the render pipeline, not here. Test-only registry helpers ship at the `@czap/assets/testing` subpath. See the [package surfaces map](https://github.com/heyoub/LiteShip/blob/main/docs/PACKAGE-SURFACES.md) for the full layout.

## Docs

- [Getting started](https://github.com/heyoub/LiteShip/blob/main/docs/GETTING-STARTED.md)
- [Reference asset declarations](https://github.com/heyoub/LiteShip/blob/main/examples/scenes/assets.ts) — audio bed + beat-marker and metadata projections
- [Glossary](https://github.com/heyoub/LiteShip/blob/main/docs/GLOSSARY.md) — the vocabulary used above
- [API reference](https://github.com/heyoub/LiteShip/tree/main/docs/api/assets/src/) — generated from source

---

Part of [LiteShip](https://github.com/heyoub/LiteShip#readme) — powered by the CZAP engine (Content-Zoned Adaptive Projection), distributed as `@czap/*` packages.
