[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [mcp-server/src](../README.md) / makeFrameReader

# Function: makeFrameReader()

> **makeFrameReader**(): [`FrameReader`](../interfaces/FrameReader.md)

Defined in: [mcp-server/src/lsp/framing.ts:49](https://github.com/heyoub/LiteShip/blob/main/packages/mcp-server/src/lsp/framing.ts#L49)

Build a [FrameReader](../interfaces/FrameReader.md). The buffer grows until a full header block + its
declared payload byte-count are present, then emits the payload and advances.
A malformed header (missing/non-numeric Content-Length) is a protocol
violation — surfaced as a tagged [InvariantViolationError](https://github.com/heyoub/LiteShip/blob/main/packages/error/src/variants.ts), never
silently dropped (the §baseProtocol contract is broken; the stream cannot be
realigned without a length).

## Returns

[`FrameReader`](../interfaces/FrameReader.md)
