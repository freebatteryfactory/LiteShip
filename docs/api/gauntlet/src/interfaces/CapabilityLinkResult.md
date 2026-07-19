[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / CapabilityLinkResult

# Interface: CapabilityLinkResult

Defined in: [gauntlet/src/facts/capability-link-facts.ts:20](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/capability-link-facts.ts#L20)

One sanctioned-skip link result — the guard's resolved capability derivation vs what it declares.

## Properties

### declaredCapability

> `readonly` **declaredCapability**: `string`

Defined in: [gauntlet/src/facts/capability-link-facts.ts:26](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/capability-link-facts.ts#L26)

The capability id the skip's `SANCTIONED_SKIPS` entry DECLARES (e.g. `ffmpeg-absent`).

***

### file

> `readonly` **file**: `string`

Defined in: [gauntlet/src/facts/capability-link-facts.ts:22](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/capability-link-facts.ts#L22)

Repo-relative file of the sanctioned skip.

***

### guardText

> `readonly` **guardText**: `string`

Defined in: [gauntlet/src/facts/capability-link-facts.ts:32](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/capability-link-facts.ts#L32)

The guard source text (for the finding's self-explanation); empty when no guard was found.

***

### line

> `readonly` **line**: `number`

Defined in: [gauntlet/src/facts/capability-link-facts.ts:24](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/capability-link-facts.ts#L24)

1-based line of the skip.

***

### linked

> `readonly` **linked**: `boolean`

Defined in: [gauntlet/src/facts/capability-link-facts.ts:30](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/capability-link-facts.ts#L30)

True iff the declared capability is among the derived ones — the guard genuinely gates on it.

***

### linkedCapabilities

> `readonly` **linkedCapabilities**: readonly `string`[]

Defined in: [gauntlet/src/facts/capability-link-facts.ts:28](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/capability-link-facts.ts#L28)

The capability ids the guard's dataflow actually DERIVES FROM (via the canonical probe symbols).
