[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [web/src](../README.md) / registerStreamRecoverySubstrate

# Function: registerStreamRecoverySubstrate()

> **registerStreamRecoverySubstrate**(`artifactId`, `substrate`): () => `void`

Defined in: [web/src/stream/recovery-substrate.ts:91](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery-substrate.ts#L91)

Register the gap-replay substrate for a streamed artifact. Returns a disposer.
Re-registering an artifact id that is still registered throws — two substrates
for one artifact means one of them silently loses, and that must be loud.

## Parameters

### artifactId

`string`

### substrate

[`StreamRecoverySubstrate`](../interfaces/StreamRecoverySubstrate.md)

## Returns

() => `void`
