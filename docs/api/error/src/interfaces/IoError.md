[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [error/src](../README.md) / IoError

# Interface: IoError

Defined in: [error/src/variants.ts:85](https://github.com/heyoub/LiteShip/blob/main/packages/error/src/variants.ts#L85)

A file, process, or network operation failed at runtime. The operation was
well-formed; the environment refused or errored.

Migration target for: asset file read/write, `ffmpeg` spawn/encode, and the
IO throws across `assets`, `stage`, `command`, `cli`.

## Extends

- [`TaggedError`](TaggedError.md)\<`"IoError"`\>

## Properties

### \_tag

> `readonly` **\_tag**: `"IoError"`

Defined in: [error/src/contract.ts:29](https://github.com/heyoub/LiteShip/blob/main/packages/error/src/contract.ts#L29)

The discriminant. Unique per variant; what `matchTag`/`hasTag` key on.

#### Inherited from

[`TaggedError`](TaggedError.md).[`_tag`](TaggedError.md#_tag)

***

### detail

> `readonly` **detail**: `string`

Defined in: [error/src/variants.ts:89](https://github.com/heyoub/LiteShip/blob/main/packages/error/src/variants.ts#L89)

What went wrong, in human terms.

***

### message

> `readonly` **message**: `string`

Defined in: [error/src/contract.ts:31](https://github.com/heyoub/LiteShip/blob/main/packages/error/src/contract.ts#L31)

Human-readable summary. Doubles as the transport `Error.message`.

#### Inherited from

[`TaggedError`](TaggedError.md).[`message`](TaggedError.md#message)

***

### operation

> `readonly` **operation**: `string`

Defined in: [error/src/variants.ts:87](https://github.com/heyoub/LiteShip/blob/main/packages/error/src/variants.ts#L87)

The operation that failed, e.g. `'readFile'`, `'ffmpeg.encode'`.

***

### path?

> `readonly` `optional` **path?**: `string`

Defined in: [error/src/variants.ts:91](https://github.com/heyoub/LiteShip/blob/main/packages/error/src/variants.ts#L91)

Optional path/URI the operation targeted.
