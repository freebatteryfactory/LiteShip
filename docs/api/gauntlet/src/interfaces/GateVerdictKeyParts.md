[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / GateVerdictKeyParts

# Interface: GateVerdictKeyParts

Defined in: [gauntlet/src/verdict-cache.ts:72](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/verdict-cache.ts#L72)

The parts [gateVerdictKey](../functions/gateVerdictKey.md) composes — every input that affects a raw verdict.

## Properties

### coverageDigest

> `readonly` **coverageDigest**: `string`

Defined in: [gauntlet/src/verdict-cache.ts:83](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/verdict-cache.ts#L83)

The deterministic digest of the gate's covered `(FileId, contentDigest)` pairs.

***

### env

> `readonly` **env**: `Readonly`\<`Record`\<`string`, `string`\>\>

Defined in: [gauntlet/src/verdict-cache.ts:97](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/verdict-cache.ts#L97)

The environment fingerprint (node / platform / arch / pm) — host-supplied.

***

### evidenceDigest?

> `readonly` `optional` **evidenceDigest?**: `string`

Defined in: [gauntlet/src/verdict-cache.ts:95](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/verdict-cache.ts#L95)

The OPTIONAL digest of the gate's OUT-OF-IR evidence (see
[Gate.evidenceDigest](Gate.md#evidencedigest)) — the confirmer test corpus, the `benchmarks/*.json`
registries, the ledgers/snapshots, or the CONTENT of a host-injected fact. A gate
that reads only IR files omits it (`undefined`): the key folds the empty marker
[NO\_EVIDENCE\_MARKER](../variables/NO_EVIDENCE_MARKER.md), so a pure-IR gate's key is UNCHANGED from before the
out-of-IR-evidence fix (back-compat). A gate that reads out-of-IR bytes returns a
stable content fold of exactly those bytes — editing them flips this segment →
MISS → re-run (the soundness keystone for the claim-vs-reality + injected-fact
families).

***

### gateId

> `readonly` **gateId**: `string`

Defined in: [gauntlet/src/verdict-cache.ts:81](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/verdict-cache.ts#L81)

The gate whose verdict this keys — two gates over the same files key apart.

***

### toolchainDigest

> `readonly` **toolchainDigest**: `string`

Defined in: [gauntlet/src/verdict-cache.ts:79](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/verdict-cache.ts#L79)

The host's hash over the gauntlet's BUILT gate logic (its dist bytes + the
package version + the env fingerprint). CHANGES when a gate's logic changes —
the anti-lie keystone (a gate edit invalidates every cached verdict even when
the covered files are byte-identical).
