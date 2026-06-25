[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / StandardsIntegrityFacts

# Interface: StandardsIntegrityFacts

Defined in: [gauntlet/src/standards-facts.ts:362](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/standards-facts.ts#L362)

The full DECIDED diff the gate folds: every classified change, partitioned by the
host's owner-sign-off application. The host has ALREADY applied the standards
waivers (matched a `weaken` to a non-expired, class-matching sign-off), so the
gate just reports.

## Properties

### committedAddress

> `readonly` **committedAddress**: `string`

Defined in: [gauntlet/src/standards-facts.ts:386](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/standards-facts.ts#L386)

The committed snapshot's address + the live surface's address (the drift keystone, carried for the report).

***

### expiredSignoffs

> `readonly` **expiredSignoffs**: readonly `object`[]

Defined in: [gauntlet/src/standards-facts.ts:384](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/standards-facts.ts#L384)

EXPIRED sign-offs — a sign-off whose expiry is past the injected date (the weakening re-reds).

***

### forbiddenSignoffs

> `readonly` **forbiddenSignoffs**: readonly `object`[]

Defined in: [gauntlet/src/standards-facts.ts:378](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/standards-facts.ts#L378)

FORBIDDEN sign-offs — a standards waiver that tried to authorize an
always-blocking weakening (the skip/placeholder floor). VOID: it errors AND the
weakening it tried to cover stays in [unsignedWeakenings](#unsignedweakenings).

***

### liveAddress

> `readonly` **liveAddress**: `string`

Defined in: [gauntlet/src/standards-facts.ts:387](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/standards-facts.ts#L387)

***

### signedWeakenings

> `readonly` **signedWeakenings**: readonly [`StandardsChange`](StandardsChange.md) & `object`[]

Defined in: [gauntlet/src/standards-facts.ts:366](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/standards-facts.ts#L366)

Signed weakenings — allowed + recorded (the honest escape). Reported as an audit advisory.

***

### unregeneratedStrengthens

> `readonly` **unregeneratedStrengthens**: readonly [`StandardsChange`](StandardsChange.md)[]

Defined in: [gauntlet/src/standards-facts.ts:372](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/standards-facts.ts#L372)

Un-regenerated STRENGTHENS / NEUTRAL drift — the snapshot is stale but in a
SAFE direction. A normal "regenerate intentionally" finding (warning), NOT
blocking-as-weakening.

***

### unsignedWeakenings

> `readonly` **unsignedWeakenings**: readonly [`StandardsChange`](StandardsChange.md)[]

Defined in: [gauntlet/src/standards-facts.ts:364](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/standards-facts.ts#L364)

Unsigned WEAKENINGS — the raccoon caught. Each is a BLOCKING finding.
