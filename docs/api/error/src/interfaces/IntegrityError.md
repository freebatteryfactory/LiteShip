[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [error/src](../README.md) / IntegrityError

# Interface: IntegrityError

Defined in: [error/src/variants.ts:214](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/variants.ts#L214)

Verification of content-addressed, ordered, or signed data failed — the
bytes decoded FINE, but they do not match their claimed identity, link,
order, or signature. The L4 "downstream would trust bad reality" category:
corruption, tampering, or version skew, NOT a malformed input.

Distinct from [ParseError](../variables/ParseError.md) (couldn't read the bytes) and from
[InvariantViolationError](../variables/InvariantViolationError.md) (our own impossible state): here the data is
well-formed and external, and its integrity claim is false.

Migration target for: `ChainValidationError` (`code` = `hash_mismatch` /
`chain_break` / `hlc_not_increasing` / `not_genesis`), signature
verification, and content-address/digest mismatch across `core`, `canonical`.

## Extends

- [`TaggedError`](TaggedError.md)\<`"IntegrityError"`\>

## Properties

### \_tag

> `readonly` **\_tag**: `"IntegrityError"`

Defined in: [error/src/contract.ts:29](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/contract.ts#L29)

The discriminant. Unique per variant; what `matchTag`/`hasTag` key on.

#### Inherited from

[`TaggedError`](TaggedError.md).[`_tag`](TaggedError.md#_tag)

***

### actual?

> `readonly` `optional` **actual?**: `string`

Defined in: [error/src/variants.ts:224](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/variants.ts#L224)

Optional observed/computed value (e.g. the recomputed hash).

***

### code?

> `readonly` `optional` **code?**: `string`

Defined in: [error/src/variants.ts:220](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/variants.ts#L220)

Optional machine reason, e.g. `'hash_mismatch'`, for callers that branch on it.

***

### detail

> `readonly` **detail**: `string`

Defined in: [error/src/variants.ts:218](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/variants.ts#L218)

What failed verification, in human terms.

***

### expected?

> `readonly` `optional` **expected?**: `string`

Defined in: [error/src/variants.ts:222](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/variants.ts#L222)

Optional claimed/expected value (e.g. the stored hash).

***

### message

> `readonly` **message**: `string`

Defined in: [error/src/contract.ts:31](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/contract.ts#L31)

Human-readable summary. Doubles as the transport `Error.message`.

#### Inherited from

[`TaggedError`](TaggedError.md).[`message`](TaggedError.md#message)

***

### subject

> `readonly` **subject**: `string`

Defined in: [error/src/variants.ts:216](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/variants.ts#L216)

What was being verified, e.g. `'receipt-chain'`, `'content-address'`, `'signature'`.
