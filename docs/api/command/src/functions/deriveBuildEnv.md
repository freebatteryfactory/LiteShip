[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / deriveBuildEnv

# Function: deriveBuildEnv()

> **deriveBuildEnv**(`input`): `ShipCapsuleBuildEnv`

Defined in: [command/src/commands/ship-planning.ts:76](https://github.com/heyoub/LiteShip/blob/main/packages/command/src/commands/ship-planning.ts#L76)

Validate + assemble a ShipCapsule.BuildEnv. The OS/arch come from the caller
(the CLI reads process.*); only linux/darwin/win32 and x64/arm64 are modeled
in v0.1.0 — anything else is a hard failure, never a silent cast.

## Parameters

### input

#### arch

`string`

#### nodeVersion

`string`

#### os

`string`

#### pmVersion

`string`

## Returns

`ShipCapsuleBuildEnv`
