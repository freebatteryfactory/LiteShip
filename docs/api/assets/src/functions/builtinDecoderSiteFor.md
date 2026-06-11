[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [assets/src](../README.md) / builtinDecoderSiteFor

# Function: builtinDecoderSiteFor()

> **builtinDecoderSiteFor**(`kind`): readonly `Site`[]

Defined in: [assets/src/contract.ts:92](https://github.com/heyoub/LiteShip/blob/main/packages/assets/src/contract.ts#L92)

Sites a media kind's BUILT-IN decoder can honestly run on. The video
built-in shells out to ffprobe (node:child_process / fs / os), so a
builtin-decoded video capsule is node-only — declaring 'browser' would
lie to bundlers and site routers. The audio built-in (pure RIFF walk)
and image built-in (header sniff) are byte-level and run anywhere.
Analysis kinds have no byte decoder, so they keep the permissive
default; their dedicated projection factories declare their own sites.

## Parameters

### kind

[`AssetKind`](../type-aliases/AssetKind.md)

## Returns

readonly `Site`[]
