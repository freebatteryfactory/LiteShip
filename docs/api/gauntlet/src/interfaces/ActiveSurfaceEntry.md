[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / ActiveSurfaceEntry

# Interface: ActiveSurfaceEntry

Defined in: [gauntlet/src/active-surface-facts.ts:18](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/active-surface-facts.ts#L18)

One active modeled surface and the field-read verdict the oracle computed.
Obligations derive from the node-family union + status — never a hand-maintained
string registry in gauntlet.

## Properties

### active

> `readonly` **active**: `boolean`

Defined in: [gauntlet/src/active-surface-facts.ts:26](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/active-surface-facts.ts#L26)

Whether this surface is live in the repo (constructed / imported / sealed).

***

### family

> `readonly` **family**: `string`

Defined in: [gauntlet/src/active-surface-facts.ts:20](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/active-surface-facts.ts#L20)

Document-graph node family — e.g. `'transition'`.

***

### promotion

> `readonly` **promotion**: [`ActiveSurfacePromotion`](../type-aliases/ActiveSurfacePromotion.md)

Defined in: [gauntlet/src/active-surface-facts.ts:35](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/active-surface-facts.ts#L35)

Severity floor for unread fields. `'advisory'` for the live TransitionNode orphan
until #130 lands the real interpreter; `'blocking'` in self-proof fixtures.

***

### readerFiles

> `readonly` **readerFiles**: readonly `string`[]

Defined in: [gauntlet/src/active-surface-facts.ts:28](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/active-surface-facts.ts#L28)

Reader paths the oracle scanned (interpreter / lowerer / runtime).

***

### readFields

> `readonly` **readFields**: readonly `string`[]

Defined in: [gauntlet/src/active-surface-facts.ts:24](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/active-surface-facts.ts#L24)

Fields the oracle observed a reader path accessing.

***

### requiredFields

> `readonly` **requiredFields**: readonly `string`[]

Defined in: [gauntlet/src/active-surface-facts.ts:22](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/active-surface-facts.ts#L22)

Load-bearing fields that MUST be read when this surface is active.

***

### unreadFields

> `readonly` **unreadFields**: readonly `string`[]

Defined in: [gauntlet/src/active-surface-facts.ts:30](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/active-surface-facts.ts#L30)

Required fields with no observed read — empty when inactive or fully wired.
