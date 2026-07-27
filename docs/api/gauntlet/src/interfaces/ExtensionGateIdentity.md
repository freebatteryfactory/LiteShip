[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / ExtensionGateIdentity

# Interface: ExtensionGateIdentity

Defined in: [gauntlet/src/gate.ts:475](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L475)

Ownership metadata required for a downstream gate namespace.

## Properties

### namespace

> `readonly` **namespace**: `string`

Defined in: [gauntlet/src/gate.ts:477](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L477)

First path segment of the gate id (for example `acme` in `acme/no-todo`).

***

### owner

> `readonly` **owner**: `string`

Defined in: [gauntlet/src/gate.ts:479](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L479)

Stable package, team, or project identity responsible for the extension.
