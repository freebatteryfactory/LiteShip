[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / MutantCore

# Interface: MutantCore

Defined in: [audit/src/mutation-engine.ts:142](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-engine.ts#L142)

The OPERATOR-AGNOSTIC core of a content-addressed mutant — every field a runner
consumes to splice + evaluate a mutant, WITHOUT the `operator` discriminant. Extracted
so the deterministic splice ([applyMutant](../functions/applyMutant.md)) and the kill/survive verdict
(`evaluateMutant`) operate on ANY span-located mutant — the classic [Mutant](Mutant.md)
(operator ∈ [MutationOperatorId](../type-aliases/MutationOperatorId.md)) AND the MC/DC `ConditionMutant` (operator ∈ the
condition-force union) — without widening the classic operator catalogue or forking the
runner. The `id` is the content address; `line`/`column` are 1-based (human display);
`start`/`end` are absolute offsets (the splice the runner applies).

## Extended by

- [`Mutant`](Mutant.md)
- [`ConditionMutant`](ConditionMutant.md)

## Properties

### column

> `readonly` **column**: `number`

Defined in: [audit/src/mutation-engine.ts:150](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-engine.ts#L150)

1-based column of the mutated span.

***

### end

> `readonly` **end**: `number`

Defined in: [audit/src/mutation-engine.ts:154](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-engine.ts#L154)

Absolute end offset of the mutated span (exclusive).

***

### file

> `readonly` **file**: `string`

Defined in: [audit/src/mutation-engine.ts:146](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-engine.ts#L146)

The repo-relative source file the mutant lives in.

***

### id

> `readonly` **id**: `IntegrityDigest`

Defined in: [audit/src/mutation-engine.ts:144](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-engine.ts#L144)

Stable content address — `addressedDigestOf(...).integrity_digest`.

***

### line

> `readonly` **line**: `number`

Defined in: [audit/src/mutation-engine.ts:148](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-engine.ts#L148)

1-based line of the mutated span.

***

### mutatedText

> `readonly` **mutatedText**: `string`

Defined in: [audit/src/mutation-engine.ts:158](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-engine.ts#L158)

The text the span is replaced with.

***

### originalText

> `readonly` **originalText**: `string`

Defined in: [audit/src/mutation-engine.ts:156](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-engine.ts#L156)

The exact original text of the span.

***

### start

> `readonly` **start**: `number`

Defined in: [audit/src/mutation-engine.ts:152](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-engine.ts#L152)

Absolute start offset of the mutated span (inclusive).
