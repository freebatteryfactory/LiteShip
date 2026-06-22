[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / ConditionMutant

# Interface: ConditionMutant

Defined in: [audit/src/mcdc-engine.ts:100](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/mcdc-engine.ts#L100)

A content-addressed CONDITION-mutant — a [MutantCore](MutantCore.md) (so it flows through the
SAME `evaluateMutant` runner/cache path verbatim, which reads only the operator-agnostic
core fields) carrying the MC/DC descriptor: the
DECISION text it belongs to, the atomic CONDITION text it pins, and the `force`
direction. The mutant's `operator` is the [ConditionForce](../type-aliases/ConditionForce.md); `mutatedText` is the
`(true)`/`(false)` pin; `originalText` is the condition's source. The `id` folds
`force` into its identity tuple, so the true-pin and false-pin of one condition are
distinct stable ids.

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

### condition

> `readonly` **condition**: `string`

Defined in: [audit/src/mcdc-engine.ts:106](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/mcdc-engine.ts#L106)

The full source text of the atomic CONDITION this mutant pins (== `originalText`).

***

### decision

> `readonly` **decision**: `string`

Defined in: [audit/src/mcdc-engine.ts:104](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/mcdc-engine.ts#L104)

The full source text of the enclosing DECISION (for the self-explaining finding).

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

### force

> `readonly` **force**: [`ConditionForce`](../type-aliases/ConditionForce.md)

Defined in: [audit/src/mcdc-engine.ts:108](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/mcdc-engine.ts#L108)

The force direction this mutant pins the condition to.

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

> `readonly` **operator**: [`ConditionForce`](../type-aliases/ConditionForce.md)

Defined in: [audit/src/mcdc-engine.ts:102](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/mcdc-engine.ts#L102)

The force operator (the typed [ConditionForce](../type-aliases/ConditionForce.md) discriminant — the MC/DC analogue of a mutation operator).

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
