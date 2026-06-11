[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [assets/src](../README.md) / defineAsset

# Function: defineAsset()

> **defineAsset**\<`K`\>(`decl`): `AnyAssetCapsule`

Defined in: [assets/src/contract.ts:115](https://github.com/heyoub/LiteShip/blob/main/packages/assets/src/contract.ts#L115)

Declare an asset as a cachedProjection capsule + register in the
module-level asset registry. Resolves `decl.decoder ?? builtinDecoderFor(decl.kind)`
and wires it as the capsule's `derive` handler (the harness decode
bench + determinism probes and the host commands run through it).

The capsule's `site` follows the decoder that actually runs: builtin
decoders use [builtinDecoderSiteFor](builtinDecoderSiteFor.md) (video → `['node']`, because
ffprobe needs node:child_process), while a declared custom `decoder`
keeps `['node', 'browser']` — the declarer owns its runtime safety
(e.g. a WebCodecs-based video decoder is legitimately browser-capable).

## Type Parameters

### K

`K` *extends* [`AssetKind`](../type-aliases/AssetKind.md)

## Parameters

### decl

[`AssetDecl`](../interfaces/AssetDecl.md)\<`K`\>

## Returns

`AnyAssetCapsule`
