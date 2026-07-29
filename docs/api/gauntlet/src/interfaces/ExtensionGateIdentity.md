[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [gauntlet/src](../README.md) / ExtensionGateIdentity

# Interface: ExtensionGateIdentity

Defined in: [gauntlet/src/gate.ts:558](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L558)

Ownership metadata required for a downstream gate namespace.

## Properties

### namespace

> `readonly` **namespace**: `string`

Defined in: [gauntlet/src/gate.ts:560](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L560)

First path segment of the gate id (for example `acme` in `acme/no-todo`).

***

### owner

> `readonly` **owner**: `string`

Defined in: [gauntlet/src/gate.ts:562](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L562)

Stable package, team, or project identity responsible for the extension.
