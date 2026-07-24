[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / DecodeViolation

# Interface: DecodeViolation

Defined in: [gauntlet/src/facts/fuzz-facts.ts:78](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/fuzz-facts.ts#L78)

The recorded detail of a decode-surface violation — enough to act on without
re-running the fuzzer. `cls` is the failure class; `source` is the reproducer
(a corpus seed id, or `generated@seed=0x…` for a generated input — the fuzz is
deterministic, so the source replays byte-exact); `detail` is the human WHY.

## Properties

### cls

> `readonly` **cls**: [`DecodeViolationClass`](../type-aliases/DecodeViolationClass.md)

Defined in: [gauntlet/src/facts/fuzz-facts.ts:80](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/fuzz-facts.ts#L80)

The cardinal failure class: a raw crash, a prototype pollution, or a misparse.

***

### detail

> `readonly` **detail**: `string`

Defined in: [gauntlet/src/facts/fuzz-facts.ts:84](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/fuzz-facts.ts#L84)

Human WHY — e.g. "decoder threw an UNTAGGED TypeError ('…')".

***

### source

> `readonly` **source**: `string`

Defined in: [gauntlet/src/facts/fuzz-facts.ts:82](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/fuzz-facts.ts#L82)

The reproducer — a corpus seed id or a seeded generated source.
