[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / S

# Variable: S

> `const` **S**: `object`

Defined in: [core/src/schema/constructors.ts:202](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/constructors.ts#L202)

The schema-kernel constructor namespace. Scalars are singleton VALUES
(`S.string`); composites are constructor FUNCTIONS (`S.struct({ … })`).

## Type Declaration

### any

> `readonly` **any**: [`Schema`](../interfaces/Schema.md)\<`unknown`, `unknown`\> = `anySchema`

### array

> **array**: \<`E`\>(`element`) => [`Schema`](../interfaces/Schema.md)\<readonly [`Infer`](../type-aliases/Infer.md)\<`E`\>[], readonly [`InferEncoded`](../type-aliases/InferEncoded.md)\<`E`\>[]\>

A homogeneous array of `element`.

#### Type Parameters

##### E

`E` *extends* [`Schema`](../interfaces/Schema.md)\<`unknown`, `unknown`\>

#### Parameters

##### element

`E`

#### Returns

[`Schema`](../interfaces/Schema.md)\<readonly [`Infer`](../type-aliases/Infer.md)\<`E`\>[], readonly [`InferEncoded`](../type-aliases/InferEncoded.md)\<`E`\>[]\>

### boolean

> `readonly` **boolean**: [`Schema`](../interfaces/Schema.md)\<`boolean`, `boolean`\> = `booleanSchema`

### brand

> **brand**: \<`B`, `Out`\>(`base`, `refine`, `name?`) => [`Schema`](../interfaces/Schema.md)\<`Out`, [`InferEncoded`](../type-aliases/InferEncoded.md)\<`B`\>\>

A nominal refinement over `base`: decode the base, then run `refine` (an
existing parse-don't-validate smart constructor from `brands.ts` and friends).
The refined return type carries the brand, so `Infer` propagates nominality.

#### Type Parameters

##### B

`B` *extends* [`Schema`](../interfaces/Schema.md)\<`unknown`, `unknown`\>

##### Out

`Out`

#### Parameters

##### base

`B`

##### refine

(`value`) => `Out`

##### name?

`string`

#### Returns

[`Schema`](../interfaces/Schema.md)\<`Out`, [`InferEncoded`](../type-aliases/InferEncoded.md)\<`B`\>\>

### bytes

> **bytes**: \<`C`\>(`ctor`, `name?`) => [`Schema`](../interfaces/Schema.md)\<`CarrierInstance`\<`C`\>, `CarrierInstance`\<`C`\>\>

A DECLARATION over an opaque binary carrier (`Uint8Array`, `ArrayBuffer`).
Decode accepts an instance; structural derivation refuses it (attach a
[withArbitrary](../functions/withArbitrary.md) thunk to sample a narrow valid subset).

#### Type Parameters

##### C

`C` *extends* `BytesCtor`

#### Parameters

##### ctor

`C`

##### name?

`string`

#### Returns

[`Schema`](../interfaces/Schema.md)\<`CarrierInstance`\<`C`\>, `CarrierInstance`\<`C`\>\>

### hole

> **hole**: \<`A`\>(`name`) => [`Schema`](../interfaces/Schema.md)\<`A`, `A`\>

A typed HOLE: types as `A` so authoring proceeds, but decode always emits a
blocking `schema/hole` issue and never passes data. Loud, enumerable, and
decode-blocking — the sanctioned placeholder, never a silent typed hole.

#### Type Parameters

##### A

`A` = `unknown`

#### Parameters

##### name

`string`

#### Returns

[`Schema`](../interfaces/Schema.md)\<`A`, `A`\>

### literal

> **literal**: \<`V`\>(`value`) => [`Schema`](../interfaces/Schema.md)\<`V`, `V`\>

A single-value literal pinned to one JSON primitive.

#### Type Parameters

##### V

`V` *extends* `LiteralValue`

#### Parameters

##### value

`V`

#### Returns

[`Schema`](../interfaces/Schema.md)\<`V`, `V`\>

### number

> `readonly` **number**: [`Schema`](../interfaces/Schema.md)\<`number`, `number`\> = `numberSchema`

### optional

> **optional**: \<`S2`\>(`schema`) => `OptionalSchema`\<[`Infer`](../type-aliases/Infer.md)\<`S2`\>, [`InferEncoded`](../type-aliases/InferEncoded.md)\<`S2`\>\>

Mark a schema as an OPTIONAL struct field (a no-op outside `S.struct`).

#### Type Parameters

##### S2

`S2` *extends* [`Schema`](../interfaces/Schema.md)\<`unknown`, `unknown`\>

#### Parameters

##### schema

`S2`

#### Returns

`OptionalSchema`\<[`Infer`](../type-aliases/Infer.md)\<`S2`\>, [`InferEncoded`](../type-aliases/InferEncoded.md)\<`S2`\>\>

### record

> **record**: \<`V`\>(`value`) => [`Schema`](../interfaces/Schema.md)\<\{\[`k`: `string`\]: [`Infer`](../type-aliases/Infer.md)\<`V`\>; \}, \{\[`k`: `string`\]: [`InferEncoded`](../type-aliases/InferEncoded.md)\<`V`\>; \}\>

A string-keyed record whose values conform to `value`.

#### Type Parameters

##### V

`V` *extends* [`Schema`](../interfaces/Schema.md)\<`unknown`, `unknown`\>

#### Parameters

##### value

`V`

#### Returns

[`Schema`](../interfaces/Schema.md)\<\{\[`k`: `string`\]: [`Infer`](../type-aliases/Infer.md)\<`V`\>; \}, \{\[`k`: `string`\]: [`InferEncoded`](../type-aliases/InferEncoded.md)\<`V`\>; \}\>

### string

> `readonly` **string**: [`Schema`](../interfaces/Schema.md)\<`string`, `string`\> = `stringSchema`

### struct

> **struct**: \<`F`\>(`fields`) => [`Schema`](../interfaces/Schema.md)\<\{ \[K in string \| number \| symbol\]: (\{ readonly \[K in string \| number \| symbol as IsOptional\<F\[K\]\> extends true ? never : K\]: Infer\<F\[K\]\> \} & \{ readonly \[K in string \| number \| symbol as IsOptional\<F\[K\]\> extends true ? K : never\]?: Infer\<F\[K\]\> \})\[K\] \}, \{ \[K in string \| number \| symbol\]: (\{ readonly \[K in string \| number \| symbol as IsOptional\<F\[K\]\> extends true ? never : K\]: InferEncoded\<F\[K\]\> \} & \{ readonly \[K in string \| number \| symbol as IsOptional\<F\[K\]\> extends true ? K : never\]?: InferEncoded\<F\[K\]\> \})\[K\] \}\>

A fixed-key object; a field wrapped by [optional](#optional) becomes an optional key.

#### Type Parameters

##### F

`F` *extends* `Readonly`\<`Record`\<`string`, [`Schema`](../interfaces/Schema.md)\<`unknown`, `unknown`\>\>\>

#### Parameters

##### fields

`F`

#### Returns

[`Schema`](../interfaces/Schema.md)\<\{ \[K in string \| number \| symbol\]: (\{ readonly \[K in string \| number \| symbol as IsOptional\<F\[K\]\> extends true ? never : K\]: Infer\<F\[K\]\> \} & \{ readonly \[K in string \| number \| symbol as IsOptional\<F\[K\]\> extends true ? K : never\]?: Infer\<F\[K\]\> \})\[K\] \}, \{ \[K in string \| number \| symbol\]: (\{ readonly \[K in string \| number \| symbol as IsOptional\<F\[K\]\> extends true ? never : K\]: InferEncoded\<F\[K\]\> \} & \{ readonly \[K in string \| number \| symbol as IsOptional\<F\[K\]\> extends true ? K : never\]?: InferEncoded\<F\[K\]\> \})\[K\] \}\>

### tuple

> **tuple**: \<`E`\>(...`elements`) => [`Schema`](../interfaces/Schema.md)\<`TupleType`\<`E`\>, `TupleEncoded`\<`E`\>\>

A FIXED-ARITY tuple over `elements`. Unlike [array](#array) (homogeneous, variable
length), the arity and the per-position element schemas are pinned: decode
accepts an array iff its length equals `elements.length` and each position
decodes against its own element schema. `Infer` recovers a `readonly [...]`.

#### Type Parameters

##### E

`E` *extends* readonly [`Schema`](../interfaces/Schema.md)\<`unknown`, `unknown`\>[]

#### Parameters

##### elements

...`E`

#### Returns

[`Schema`](../interfaces/Schema.md)\<`TupleType`\<`E`\>, `TupleEncoded`\<`E`\>\>

### union

> **union**: \<`M`\>(...`members`) => [`Schema`](../interfaces/Schema.md)\<[`Infer`](../type-aliases/Infer.md)\<`M`\[`number`\]\>, [`InferEncoded`](../type-aliases/InferEncoded.md)\<`M`\[`number`\]\>\>

A closed alternation; decode accepts the first member that matches.

#### Type Parameters

##### M

`M` *extends* readonly [`Schema`](../interfaces/Schema.md)\<`unknown`, `unknown`\>[]

#### Parameters

##### members

...`M`

#### Returns

[`Schema`](../interfaces/Schema.md)\<[`Infer`](../type-aliases/Infer.md)\<`M`\[`number`\]\>, [`InferEncoded`](../type-aliases/InferEncoded.md)\<`M`\[`number`\]\>\>

### unknown

> `readonly` **unknown**: [`Schema`](../interfaces/Schema.md)\<`unknown`, `unknown`\> = `unknownSchema`
