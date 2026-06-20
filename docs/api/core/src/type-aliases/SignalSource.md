[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / SignalSource

# Type Alias: SignalSource

> **SignalSource** = \{ `axis?`: `"width"` \| `"height"`; `type`: `"viewport"`; \} \| \{ `mode?`: `"elapsed"` \| `"absolute"` \| `"scheduled"`; `type`: `"time"`; \} \| \{ `axis?`: `"x"` \| `"y"` \| `"pressure"`; `type`: `"pointer"`; \} \| \{ `axis?`: `"x"` \| `"y"` \| `"progress"`; `type`: `"scroll"`; \} \| \{ `query`: `string`; `type`: `"media"`; \} \| \{ `id`: `string`; `type`: `"custom"`; \} \| \{ `mode?`: `"sample"` \| `"normalized"` \| `"amplitude"` \| `"beat"`; `type`: `"audio"`; \}

Defined in: [core/src/signal.ts:37](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/signal.ts#L37)

Configuration describing what a [Signal](../variables/Signal.md) reads from: viewport axis,
time mode, pointer axis, scroll axis, media query, custom push source,
or audio sample/normalized mode.

Discriminant payloads default to the common case when omitted:
viewport `axis: 'width'`, time `mode: 'elapsed'`, pointer `axis: 'x'`,
scroll `axis: 'y'`, audio `mode: 'sample'`. [Signal.make](../variables/Signal.md#make) normalizes
the source, so the returned signal's `source` always carries explicit values.

Audio modes:
- `sample` / `normalized` — offline/scrub reads via [Signal.audio](../variables/Signal.md#audio)
  (raw sample index / 0..1 progress over a known duration).
- `amplitude` / `beat` — LIVE analyser-driven feeds, published by a runtime
  producer (e.g. the Astro `audio.*` rAF observer reading an AnalyserNode).
  `amplitude` is 0..1 RMS loudness; `beat` is a 0/1 onset pulse. These are
  "driven externally" stubs here — `@czap/core` owns the vocabulary and
  initial value; the host publishes the live samples.
