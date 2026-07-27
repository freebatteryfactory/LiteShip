[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / RegisteredCheckFact

# Interface: RegisteredCheckFact

Defined in: [gauntlet/src/facts/check-governance-facts.ts:18](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/check-governance-facts.ts#L18)

One registered check: its id, the root script its `command` references, and whether that script exists.

## Properties

### id

> `readonly` **id**: `string`

Defined in: [gauntlet/src/facts/check-governance-facts.ts:20](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/check-governance-facts.ts#L20)

The check identity, `check/<slug>`.

***

### script

> `readonly` **script**: `string`

Defined in: [gauntlet/src/facts/check-governance-facts.ts:22](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/check-governance-facts.ts#L22)

The root `package.json` script the check's `command` invokes (extracted from the command line).

***

### scriptExists

> `readonly` **scriptExists**: `boolean`

Defined in: [gauntlet/src/facts/check-governance-facts.ts:24](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/check-governance-facts.ts#L24)

Whether `script` is a real key of `package.json`'s `scripts` — false ⇒ the command resolves to nothing.
