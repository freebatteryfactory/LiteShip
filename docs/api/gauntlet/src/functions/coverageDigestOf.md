[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / coverageDigestOf

# Function: coverageDigestOf()

> **coverageDigestOf**(`coveredFiles`, `ir`): `string`

Defined in: [gauntlet/src/verdict-cache.ts:173](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/verdict-cache.ts#L173)

The deterministic COVERAGE DIGEST — a stable string fold over the
`(FileId, contentDigest)` pairs of a gate's covered files, SORTED by FileId so
the digest is order-independent (the canonical-key-order doctrine, done without
a hash dep). The `contentDigest`s are ALREADY blake3 addresses the host minted
over each file's volatile-stripped bytes (design §1) — the engine does NOT
re-hash bytes; it only concatenates digests stably. A covered file's byte
change → a new `contentDigest` → a new fold → a new key → a cache MISS.

SOUNDNESS RAIL — a covered FileId that is ABSENT from the IR (a gate declares it
covers a file the IR doesn't contain, or a text-only gate with no IR at all)
yields the sentinel [MISSING\_DIGEST\_SENTINEL](../variables/MISSING_DIGEST_SENTINEL.md) for that file. Because the
sentinel is INERT (never a real content address) and is folded in like any
digest, an uncoverable file produces a STABLE key that can never match a key
built when the file IS present with real content — but the engine ALSO refuses
to cache at all in the no-IR / uncoverable case (see [runGates](runGates.md)); this
sentinel is the defence-in-depth second line, not the primary guard.

## Parameters

### coveredFiles

readonly `string`[]

### ir

[`RepoIR`](../interfaces/RepoIR.md) \| `undefined`

## Returns

`string`
