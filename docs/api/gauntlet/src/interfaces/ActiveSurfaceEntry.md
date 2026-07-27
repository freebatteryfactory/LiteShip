[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / ActiveSurfaceEntry

# Interface: ActiveSurfaceEntry

Defined in: [gauntlet/src/facts/active-surface-facts.ts:19](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/active-surface-facts.ts#L19)

One active modeled surface and the field-read verdict the oracle computed.
Obligations derive from the node-family union + status — never a hand-maintained
string registry in gauntlet.

## Properties

### active

> `readonly` **active**: `boolean`

Defined in: [gauntlet/src/facts/active-surface-facts.ts:27](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/active-surface-facts.ts#L27)

Whether this surface is live in the repo (constructed / imported / sealed).

***

### family

> `readonly` **family**: `string`

Defined in: [gauntlet/src/facts/active-surface-facts.ts:21](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/active-surface-facts.ts#L21)

Document-graph node family — e.g. `'transition'`.

***

### promotion

> `readonly` **promotion**: [`ActiveSurfacePromotion`](../type-aliases/ActiveSurfacePromotion.md)

Defined in: [gauntlet/src/facts/active-surface-facts.ts:37](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/active-surface-facts.ts#L37)

Severity floor for unread fields. Now `'blocking'` for the live TransitionNode path —
#130 landed the `interpretTransition` reader, so the gate self-proves green at blocking.
(`'advisory'` remains available; self-proof fixtures also exercise `'blocking'`.)

***

### readerFiles

> `readonly` **readerFiles**: readonly `string`[]

Defined in: [gauntlet/src/facts/active-surface-facts.ts:29](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/active-surface-facts.ts#L29)

Reader paths the oracle scanned (interpreter / lowerer / runtime).

***

### readFields

> `readonly` **readFields**: readonly `string`[]

Defined in: [gauntlet/src/facts/active-surface-facts.ts:25](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/active-surface-facts.ts#L25)

Fields the oracle observed a reader path accessing.

***

### requiredFields

> `readonly` **requiredFields**: readonly `string`[]

Defined in: [gauntlet/src/facts/active-surface-facts.ts:23](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/active-surface-facts.ts#L23)

Load-bearing fields that MUST be read when this surface is active.

***

### unreadFields

> `readonly` **unreadFields**: readonly `string`[]

Defined in: [gauntlet/src/facts/active-surface-facts.ts:31](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/active-surface-facts.ts#L31)

Required fields with no observed read — empty when inactive or fully wired.
