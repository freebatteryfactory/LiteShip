[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / allFileIds

# Function: allFileIds()

> **allFileIds**(`ir`): readonly `string`[]

Defined in: [gauntlet/src/verdict-cache.ts:214](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/verdict-cache.ts#L214)

The conservative DEFAULT coverage when a [Gate](../interfaces/Gate.md) declares none: EVERY file
in the IR. This is the SAFE FLOOR (design §4) for IN-IR evidence — a gate with no
declared coverage is assumed to depend on every IR file, so any change to a file
IN THE IR invalidates its cached verdict. Narrowing this (a gate declaring
`coverage`) is an OPT-IN optimization that is sound ONLY if the gate genuinely
reads only those files; an INACCURATE (too-narrow) coverage is a SOUNDNESS BUG (it
would `cache-hit` when an uncovered IR dependency changed). The default-to-all
floor never has that hazard.

SCOPE — and the limit this floor does NOT cover. The IR is PACKAGE SOURCE ONLY
(built from `auditSourceGlobs`); "EVERY file in the IR" is therefore every package
SOURCE file, NOT every repo byte. A gate that reads evidence OUTSIDE the IR (a
confirmer test under `tests/`, a `benchmarks/*.json` registry, a ledger/snapshot,
or an injected fact derived from an external artifact) is NOT covered by this
floor — its out-of-IR evidence is captured separately by [Gate.evidenceDigest](../interfaces/Gate.md#evidencedigest)
(folded into the key alongside this coverage digest). The two are complementary:
the coverage floor guards in-IR bytes; the evidence digest guards out-of-IR bytes.
Neither alone is sufficient for an out-of-IR-reading gate.

## Parameters

### ir

[`RepoIR`](../interfaces/RepoIR.md)

## Returns

readonly `string`[]
