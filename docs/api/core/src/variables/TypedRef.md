[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / TypedRef

# Variable: TypedRef

> `const` **TypedRef**: `object`

Defined in: [core/src/typed-ref.ts:94](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/typed-ref.ts#L94)

TypedRef — schema-plus-content-hash pointer used by the receipt pipeline.
Lets a receipt reference a payload by its content address without embedding
the payload itself, while still binding it to a schema identity.

## Type Declaration

### canonicalize

> **canonicalize**: (`value`) => `Uint8Array`

cborg deterministic-CBOR serialization feeding the SHA-256 content hash (the receipt byte law).

Canonicalize a value to deterministic CBOR bytes via `cborg` — the input to
SHA-256 receipt/mutation hashing. NOT the `fnv1a:` identity encoder: identity
addresses use `CanonicalCbor` (always-float64). See the module header.

#### Parameters

##### value

`unknown`

#### Returns

`Uint8Array`

### create

> **create**: (`schemaHash`, `payload`) => `Promise`\<`TypedRefShape`\> = `_create`

Build a TypedRef from a schema hash and an arbitrary payload.

Create a TypedRef from schema hash and payload.

#### Parameters

##### schemaHash

`string`

##### payload

`unknown`

#### Returns

`Promise`\<`TypedRefShape`\>

### equals

> **equals**: (`a`, `b`) => `boolean` = `_equals`

Structural equality over schema + content hashes.

Compare two TypedRefs for structural equality.

#### Parameters

##### a

`TypedRefShape`

##### b

`TypedRefShape`

#### Returns

`boolean`

### hash

> **hash**: (`data`) => `Promise`\<`string`\>

Hash a canonicalized payload to its content address.

Hash data using SHA-256. Returns "sha256:hex" formatted hash.

The `bytes as BufferSource` assertion is the single sanctioned cast in this
file. `Uint8Array` is structurally a BufferSource, but TS's DOM lib types
`bytes.buffer` as potentially-SharedArrayBuffer, preventing direct assignment.
Safe: cborg encodes into fresh ArrayBuffer and TextEncoder.encode returns
ArrayBuffer-backed views. No data copy.

`crypto.subtle.digest` is the seam's ONE genuinely-async leaf, so `hash` is a
plain `async` function returning `Promise<string>`. Hash-primitive failures are
unrecoverable in practice (crypto.subtle errors are environment-level, not
user-recoverable), so a failure is wrapped and re-thrown as a tagged
`IntegrityError` (a real `Error`, so `instanceof Error` still holds) — the
rejection every content-addressing consumer awaits.

#### Parameters

##### data

`string` \| `Uint8Array`\<`ArrayBufferLike`\>

#### Returns

`Promise`\<`string`\>
