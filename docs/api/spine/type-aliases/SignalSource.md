[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / SignalSource

# Type Alias: SignalSource

> **SignalSource** = \{ `axis?`: `"width"` \| `"height"`; `type`: `"viewport"`; \} \| \{ `mode?`: `"elapsed"` \| `"absolute"` \| `"scheduled"`; `type`: `"time"`; \} \| \{ `axis?`: `"x"` \| `"y"` \| `"pressure"`; `type`: `"pointer"`; \} \| \{ `axis?`: `"x"` \| `"y"` \| `"progress"`; `type`: `"scroll"`; \} \| \{ `query`: `string`; `type`: `"media"`; \} \| \{ `id`: `string`; `type`: `"custom"`; \} \| \{ `mode?`: `"sample"` \| `"normalized"` \| `"amplitude"` \| `"beat"`; `type`: `"audio"`; \}

Defined in: [\_spine/core.d.ts:305](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L305)

Discriminant payloads default to the common case when omitted:
viewport `axis: 'width'`, time `mode: 'elapsed'`, pointer `axis: 'x'`,
scroll `axis: 'y'`, audio `mode: 'sample'`. `createSignal` normalizes the
source, so the returned signal's `source` always carries explicit values.

Audio modes: `sample`/`normalized` are offline/scrub reads; `amplitude`
(0..1 RMS) / `beat` (0/1 onset pulse) are live analyser-driven feeds
published by a host runtime producer.
