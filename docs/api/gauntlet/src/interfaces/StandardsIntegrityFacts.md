[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [gauntlet/src](../README.md) / StandardsIntegrityFacts

# Interface: StandardsIntegrityFacts

Defined in: [gauntlet/src/facts/standards-facts.ts:383](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/standards-facts.ts#L383)

The full DECIDED diff the gate folds: every classified change, partitioned by the
host's owner-sign-off application. The host has ALREADY applied the standards
waivers (matched a `weaken` to a non-expired, class-matching sign-off), so the
gate just reports.

## Properties

### committedAddress

> `readonly` **committedAddress**: `string`

Defined in: [gauntlet/src/facts/standards-facts.ts:407](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/standards-facts.ts#L407)

The committed snapshot's address + the live surface's address (the drift keystone, carried for the report).

***

### expiredSignoffs

> `readonly` **expiredSignoffs**: readonly `object`[]

Defined in: [gauntlet/src/facts/standards-facts.ts:405](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/standards-facts.ts#L405)

EXPIRED sign-offs — a sign-off whose expiry is past the injected date (the weakening re-reds).

***

### forbiddenSignoffs

> `readonly` **forbiddenSignoffs**: readonly `object`[]

Defined in: [gauntlet/src/facts/standards-facts.ts:399](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/standards-facts.ts#L399)

FORBIDDEN sign-offs — a standards waiver that tried to authorize an
always-blocking weakening (the skip/placeholder floor). VOID: it errors AND the
weakening it tried to cover stays in [unsignedWeakenings](#unsignedweakenings).

***

### liveAddress

> `readonly` **liveAddress**: `string`

Defined in: [gauntlet/src/facts/standards-facts.ts:408](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/standards-facts.ts#L408)

***

### signedWeakenings

> `readonly` **signedWeakenings**: readonly [`StandardsChange`](StandardsChange.md) & `object`[]

Defined in: [gauntlet/src/facts/standards-facts.ts:387](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/standards-facts.ts#L387)

Signed weakenings — allowed + recorded (the honest escape). Reported as an audit advisory.

***

### unregeneratedStrengthens

> `readonly` **unregeneratedStrengthens**: readonly [`StandardsChange`](StandardsChange.md)[]

Defined in: [gauntlet/src/facts/standards-facts.ts:393](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/standards-facts.ts#L393)

Un-regenerated STRENGTHENS / NEUTRAL drift — the snapshot is stale but in a
SAFE direction. A normal "regenerate intentionally" finding (warning), NOT
blocking-as-weakening.

***

### unsignedWeakenings

> `readonly` **unsignedWeakenings**: readonly [`StandardsChange`](StandardsChange.md)[]

Defined in: [gauntlet/src/facts/standards-facts.ts:385](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/standards-facts.ts#L385)

Unsigned WEAKENINGS — the raccoon caught. Each is a BLOCKING finding.
