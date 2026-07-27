[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / COMMAND\_CAPABILITIES

# Variable: COMMAND\_CAPABILITIES

> `const` **COMMAND\_CAPABILITIES**: readonly \[`"clock"`, `"spawnCapture"`, `"hostVersion"`, `"manifestSource"`, `"manifestPath"`, `"runVitest"`, `"runAudit"`, `"runAuditFloor"`, `"runPackageSmoke"`, `"runCapsuleGate"`, `"runPlumb"`, `"runCheckInvariants"`, `"runGauntlet"`, `"fileExists"`, `"loadAssetBytes"`, `"runAudioProjection"`, `"loadSceneModule"`, `"cache"`, `"runSceneCompile"`, `"renderScene"`, `"readFileBytes"`, `"decodeShipCapsule"`, `"resolveApiSymbol"`, `"recomputeTarballAddress"`\]

Defined in: [command/src/registry.ts:488](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L488)

Complete runtime projection of the structural CommandContext capability set.
The type-level checks below make an omitted or invented key uncompilable.
