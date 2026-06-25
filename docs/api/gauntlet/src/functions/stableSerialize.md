[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / stableSerialize

# Function: stableSerialize()

> **stableSerialize**(`value`): `string`

Defined in: [gauntlet/src/verdict-cache.ts:258](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/verdict-cache.ts#L258)

A deterministic, recursively KEY-SORTED serialization of a plain-data value — the
fold a fact-reading [Gate.evidenceDigest](../interfaces/Gate.md#evidencedigest) uses to digest its host-injected
fact (whose source bytes — the lockfile, the ledger, the snapshot, the per-mutant
verdicts — are OUTSIDE the IR, so the coverage digest cannot capture them). Object
keys are emitted in SORTED order so two structurally-equal facts with different key
insertion order serialize identically (the canonical-order doctrine, done over flat
plain data without a CBOR dep). Arrays preserve order (an array's order is
semantic). PURE: no clock, no I/O, no crypto.

The injected facts are flat, JSON-shaped plain data (strings / numbers / booleans /
null / arrays / records — see each `*-facts.ts`), so this total recursion covers
them. A non-plain value (a function, a symbol) is not part of any facts shape and
folds to its `typeof` tag (it can never appear in a fact, but the fold stays total
rather than throwing).

## Parameters

### value

`unknown`

## Returns

`string`
