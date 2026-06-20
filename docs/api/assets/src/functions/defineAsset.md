[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [assets/src](../README.md) / defineAsset

# Function: defineAsset()

> **defineAsset**\<`K`\>(`decl`): `CapsuleDef`\<`"cachedProjection"`, `ArrayBuffer`, [`DecodedAsset`](../type-aliases/DecodedAsset.md)\<`K`\>, `unknown`\>

Defined in: [assets/src/contract.ts:252](https://github.com/heyoub/LiteShip/blob/main/packages/assets/src/contract.ts#L252)

Declare an asset as a cachedProjection capsule + register in the
module-level asset registry. Resolves `decl.decoder ?? builtinDecoderFor(decl.kind)`
and wires it as the capsule's `derive` handler (the harness decode
bench + determinism probes and the host commands run through it).

The capsule's `site` follows the decoder that actually runs: builtin
decoders use [builtinDecoderSiteFor](builtinDecoderSiteFor.md) (video → `['node']`, because
ffprobe needs node:child_process), while a declared custom `decoder`
keeps `['node', 'browser']` — the declarer owns its runtime safety
(e.g. a WebCodecs-based video decoder is legitimately browser-capable).
An explicit `decl.site` wins over both derivations after validation
(see [AssetDecl.site](../interfaces/AssetDecl.md#site)).

## Type Parameters

### K

`K` *extends* [`AssetKind`](../type-aliases/AssetKind.md)

## Parameters

### decl

[`AssetDecl`](../interfaces/AssetDecl.md)\<`K`\>

## Returns

`CapsuleDef`\<`"cachedProjection"`, `ArrayBuffer`, [`DecodedAsset`](../type-aliases/DecodedAsset.md)\<`K`\>, `unknown`\>
