[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [error/src](../README.md) / matchTagOr

# Function: matchTagOr()

> **matchTagOr**\<`E`, `R`\>(`error`, `handlers`, `orElse`): `R`

Defined in: [error/src/contract.ts:173](https://github.com/heyoub/LiteShip/blob/main/packages/error/src/contract.ts#L173)

Partial match with a fallback — the OPEN counterpart to [matchTag](matchTag.md).
Handle the tags you care about; `orElse` covers the rest. This is the
extension-friendly matcher: a consumer matches LiteShip's known variants
and routes everything else (including their own) through `orElse`.

## Type Parameters

### E

`E` *extends* [`TaggedError`](../interfaces/TaggedError.md)\<`string`\>

### R

`R`

## Parameters

### error

`E`

### handlers

`Partial`\<`{ readonly [K in E["_tag"]]: (error: Extract<E, TaggedError<K>>) => R }`\>

### orElse

(`error`) => `R`

## Returns

`R`
