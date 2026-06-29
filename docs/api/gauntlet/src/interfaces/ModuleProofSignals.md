[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / ModuleProofSignals

# Interface: ModuleProofSignals

Defined in: [gauntlet/src/ambition-proof.ts:69](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/ambition-proof.ts#L69)

The per-module already-decided proof signals the HOST measured (booleans + a score).

## Properties

### hasBench

> `readonly` **hasBench**: `boolean`

Defined in: [gauntlet/src/ambition-proof.ts:75](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/ambition-proof.ts#L75)

A declared/registered bench references the module.

***

### hasEnrolledInvariant

> `readonly` **hasEnrolledInvariant**: `boolean`

Defined in: [gauntlet/src/ambition-proof.ts:77](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/ambition-proof.ts#L77)

An enrolled traceability invariant traces to the module.

***

### hasPropertyTest

> `readonly` **hasPropertyTest**: `boolean`

Defined in: [gauntlet/src/ambition-proof.ts:73](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/ambition-proof.ts#L73)

A fast-check PROPERTY test references the module.

***

### hasTestFile

> `readonly` **hasTestFile**: `boolean`

Defined in: [gauntlet/src/ambition-proof.ts:71](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/ambition-proof.ts#L71)

A governed test file references the module (the host scanned the corpus).

***

### mutationScore

> `readonly` **mutationScore**: `number` \| `null`

Defined in: [gauntlet/src/ambition-proof.ts:79](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/ambition-proof.ts#L79)

The module's committed mutation score in `[0, 1]`, or null when unmeasured.
