[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / ValidatedProposal

# Interface: ValidatedProposal\<T\>

Defined in: [core/src/validated-output.ts:74](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/validated-output.ts#L74)

A model proposal that has PASSED validation — the only artifact a host's
admission layer is allowed to act on. The `token` is the load-bearing field:
it cannot be forged (its witness type is private), and it binds to `payload`
by content address. `subject` is the receipt subject id (== `token.subject`),
surfaced for citation/caching without reaching into the branded token.

There is NO public constructor for this type. The framework exposes
`apply`-style host steps that CONSUME it, but never a path that produces one
from raw model output bypassing validation.

## Type Parameters

### T

`T`

## Properties

### \_tag

> `readonly` **\_tag**: `"ValidatedProposal"`

Defined in: [core/src/validated-output.ts:75](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/validated-output.ts#L75)

***

### \_version

> `readonly` **\_version**: `1`

Defined in: [core/src/validated-output.ts:76](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/validated-output.ts#L76)

***

### payload

> `readonly` **payload**: `T`

Defined in: [core/src/validated-output.ts:79](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/validated-output.ts#L79)

The validated payload (a GraphPatch, a GeneratedUINode, …).

***

### subject

> `readonly` **subject**: `ContentAddress`

Defined in: [core/src/validated-output.ts:81](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/validated-output.ts#L81)

Content address of the payload — the proposal's stable identity / receipt subject.

***

### target

> `readonly` **target**: [`ProposalTarget`](../type-aliases/ProposalTarget.md)

Defined in: [core/src/validated-output.ts:77](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/validated-output.ts#L77)

***

### token

> `readonly` **token**: [`ApplyToken`](ApplyToken.md)

Defined in: [core/src/validated-output.ts:83](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/validated-output.ts#L83)

The unforgeable, validation-minted apply authorization.
