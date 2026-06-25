[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / gateVerdictKey

# Function: gateVerdictKey()

> **gateVerdictKey**(`parts`): `string`

Defined in: [gauntlet/src/verdict-cache.ts:126](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/verdict-cache.ts#L126)

Build the deterministic verdict-cache key from the four soundness inputs. PURE:
the same parts always yield the same key (determinism is itself a tested law).

The key is a plain STABLE STRING — NOT a crypto hash (the engine carries no
crypto dep; the host hashes the key into a short filename slug). It composes
the four segments with the RECORD separator, and folds the env
fingerprint by its SORTED keys so two structurally-equal env maps with
different insertion order key identically (the canonicalization the idempotency
CBOR layer gets for free, done here over a flat string map without a dep).

The `coverageDigest` is ALREADY a fold over the covered files (see
[coverageDigestOf](coverageDigestOf.md)); this composer just binds it to the gate, toolchain,
and env so a change in ANY of the four flips the key (→ MISS → re-run).

## Parameters

### parts

[`GateVerdictKeyParts`](../interfaces/GateVerdictKeyParts.md)

## Returns

`string`
