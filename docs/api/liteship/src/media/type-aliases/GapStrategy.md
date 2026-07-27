[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/media](../README.md) / GapStrategy

# Type Alias: GapStrategy

> **GapStrategy** = \{ `bufferPosition`: `number`; `type`: `"resume"`; \} \| \{ `frames`: readonly [`UIFrame`](../interfaces/UIFrame.md)[]; `type`: `"replay"`; \} \| \{ `fromScratch`: `true`; `type`: `"re-request"`; \} \| \{ `type`: `"noop"`; \}

Defined in: core/dist/media/gen-frame.d.ts:45

Recovery plan returned by [GenFrame.resolveGap](../variables/GenFrame.md#resolvegap) when a stream disconnects:
resume from a buffer position, replay cached frames, request a full restart,
or do nothing.
