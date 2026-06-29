[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / RunGatesOptions

# Interface: RunGatesOptions

Defined in: [gauntlet/src/engine.ts:50](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/engine.ts#L50)

Options for [runGates](../functions/runGates.md) — all optional, all back-compatible.

## Properties

### assuranceMap?

> `readonly` `optional` **assuranceMap?**: readonly [`LevelRule`](LevelRule.md)[]

Defined in: [gauntlet/src/engine.ts:55](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/engine.ts#L55)

The assurance map used to SCOPE each gate to files at-or-above its level.
Omit to run every gate over ALL files (back-compat — no level scoping).

***

### cache?

> `readonly` `optional` **cache?**: [`GateVerdictCache`](GateVerdictCache.md)

Defined in: [gauntlet/src/engine.ts:85](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/engine.ts#L85)

The INJECTED content-addressed verdict cache (Slice B, B2). When present
ALONGSIDE [toolchainDigest](#toolchaindigest), each gate's RAW `gate.run` output is cached
against the content digest of its covered files; an unchanged digest serves
the cached raw findings and SKIPS the expensive `gate.run`. Omit it (the lean
`czap check` / MCP path, or any caller that wants a full run) and the engine
behaves EXACTLY as before — a full run, no caching. The cache NEVER changes a
verdict; it only avoids recomputing a provably-identical one. See
[GateVerdictCache](GateVerdictCache.md) for the soundness model.

***

### effectiveLevels?

> `readonly` `optional` **effectiveLevels?**: `ReadonlyMap`\<`string`, [`AssuranceLevel`](../type-aliases/AssuranceLevel.md)\>

Defined in: [gauntlet/src/engine.ts:70](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/engine.ts#L70)

The PROPAGATED effective assurance levels (Slice B, B3.4) — a file's level
after import-graph propagation (`propagateAssuranceLevels`), so a file PULLED
INTO an L4 path is scoped + reported as L4 regardless of its folder ("AUTHORITY
decides assurance, not folder names"). Present ONLY on the IR-present (`--ir`)
path, where the host has the import graph to compute it.

When present it is the SOURCE OF TRUTH for level-scoping (a file's effective
level instead of recomputing the glob-only [levelOf](../functions/levelOf.md)) AND it ELEVATES a
finding's level to the effective level of its location when that is higher (so
a divergence on a file pulled into L4 is reported AT L4, not just the gate's
base level). When ABSENT (the lean path) behaviour is UNCHANGED — glob levels
via [assuranceMap](#assurancemap), no finding elevation. Never lowers a level (max only).

***

### env?

> `readonly` `optional` **env?**: `Readonly`\<`Record`\<`string`, `string`\>\>

Defined in: [gauntlet/src/engine.ts:100](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/engine.ts#L100)

The environment fingerprint folded into every cache key (node / platform /
arch / pm), so a verdict cached under one toolchain is never served to
another. Defaults to an empty fingerprint (the host supplies the real one);
only consulted on the cache path.

***

### now?

> `readonly` `optional` **now?**: `Date`

Defined in: [gauntlet/src/engine.ts:74](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/engine.ts#L74)

Injected clock for waiver-expiry evaluation. Defaults to the epoch (no expiry) — NEVER `Date.now()`.

***

### toolchainDigest?

> `readonly` `optional` **toolchainDigest?**: `string`

Defined in: [gauntlet/src/engine.ts:93](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/engine.ts#L93)

The host's TOOLCHAIN DIGEST — a hash that CHANGES when the gauntlet's gate
logic changes (a gate edit → rebuilt dist → new digest). REQUIRED for caching
(passing [cache](#cache) without it is treated as no cache): it is the anti-lie
keystone that invalidates every cached verdict when gate LOGIC changes, even
when the covered files are byte-identical. Host-computed (the CLI), never here.

***

### waivers?

> `readonly` `optional` **waivers?**: readonly [`Waiver`](Waiver.md)[]

Defined in: [gauntlet/src/engine.ts:72](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/engine.ts#L72)

Waivers applied to every gate's findings (matched → suppressed).
