[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / Mutant

# Interface: Mutant

Defined in: [audit/src/mutation-engine.ts:169](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/mutation-engine.ts#L169)

A content-addressed mutant — one deterministic, located, identified rewrite of a
source file. The `id` is STABLE across runs: it is the blake3 digest (over
canonical CBOR) of `{file, operator, line, column, originalText, mutatedText}`,
so the same source always mints the same id (the verdict-cache key half the B2
cache content-addresses against). The classic-mutation specialization of
[MutantCore](MutantCore.md) — its `operator` is a [MutationOperatorId](../type-aliases/MutationOperatorId.md).

## Extends

- [`MutantCore`](MutantCore.md)

## Properties

### column

> `readonly` **column**: `number`

Defined in: [audit/src/mutation-engine.ts:150](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/mutation-engine.ts#L150)

1-based column of the mutated span.

#### Inherited from

[`MutantCore`](MutantCore.md).[`column`](MutantCore.md#column)

***

### end

> `readonly` **end**: `number`

Defined in: [audit/src/mutation-engine.ts:154](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/mutation-engine.ts#L154)

Absolute end offset of the mutated span (exclusive).

#### Inherited from

[`MutantCore`](MutantCore.md).[`end`](MutantCore.md#end)

***

### file

> `readonly` **file**: `string`

Defined in: [audit/src/mutation-engine.ts:146](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/mutation-engine.ts#L146)

The repo-relative source file the mutant lives in.

#### Inherited from

[`MutantCore`](MutantCore.md).[`file`](MutantCore.md#file)

***

### id

> `readonly` **id**: `IntegrityDigest`

Defined in: [audit/src/mutation-engine.ts:144](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/mutation-engine.ts#L144)

Stable content address — `addressedDigestOf(...).integrity_digest`.

#### Inherited from

[`MutantCore`](MutantCore.md).[`id`](MutantCore.md#id)

***

### line

> `readonly` **line**: `number`

Defined in: [audit/src/mutation-engine.ts:148](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/mutation-engine.ts#L148)

1-based line of the mutated span.

#### Inherited from

[`MutantCore`](MutantCore.md).[`line`](MutantCore.md#line)

***

### mutatedText

> `readonly` **mutatedText**: `string`

Defined in: [audit/src/mutation-engine.ts:158](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/mutation-engine.ts#L158)

The text the span is replaced with.

#### Inherited from

[`MutantCore`](MutantCore.md).[`mutatedText`](MutantCore.md#mutatedtext)

***

### operator

> `readonly` **operator**: [`MutationOperatorId`](../type-aliases/MutationOperatorId.md)

Defined in: [audit/src/mutation-engine.ts:171](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/mutation-engine.ts#L171)

The operator that produced the mutant.

***

### originalText

> `readonly` **originalText**: `string`

Defined in: [audit/src/mutation-engine.ts:156](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/mutation-engine.ts#L156)

The exact original text of the span.

#### Inherited from

[`MutantCore`](MutantCore.md).[`originalText`](MutantCore.md#originaltext)

***

### start

> `readonly` **start**: `number`

Defined in: [audit/src/mutation-engine.ts:152](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/mutation-engine.ts#L152)

Absolute start offset of the mutated span (inclusive).

#### Inherited from

[`MutantCore`](MutantCore.md).[`start`](MutantCore.md#start)
