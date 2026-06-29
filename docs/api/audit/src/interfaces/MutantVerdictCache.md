[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / MutantVerdictCache

# Interface: MutantVerdictCache

Defined in: [audit/src/mutation-verdict.ts:183](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L183)

The injected verdict store — the B2 content-addressed cache for mutant verdicts,
mirroring `@czap/gauntlet`'s `GateVerdictCache`. Keys on the mutant's content
address bound to its covering-tests digest + the toolchain digest. `read` returns
`null` on any MISS (absent / unreadable / stale) — every uncertain case re-runs,
never serves a stale verdict (a stale "killed" hiding a now-surviving mutant would
be a LIE, the worst failure class). In-memory for the meta-proof; fs-backed in the
host.

## Methods

### read()

> **read**(`key`): `"killed"` \| `"survived"` \| `"no-coverage"` \| `"equivalent"` \| `null`

Defined in: [audit/src/mutation-verdict.ts:185](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L185)

The cached verdict tag for `key`, or `null` on a MISS (re-run).

#### Parameters

##### key

`string`

#### Returns

`"killed"` \| `"survived"` \| `"no-coverage"` \| `"equivalent"` \| `null`

***

### write()

> **write**(`key`, `tag`): `void`

Defined in: [audit/src/mutation-verdict.ts:187](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L187)

Record the verdict tag produced for `key`.

#### Parameters

##### key

`string`

##### tag

`"killed"` \| `"survived"` \| `"no-coverage"` \| `"equivalent"`

#### Returns

`void`
