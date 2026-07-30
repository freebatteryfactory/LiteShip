[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/runtime](../README.md) / registerStreamRecoverySubstrate

# Function: registerStreamRecoverySubstrate()

> **registerStreamRecoverySubstrate**(`artifactId`, `substrate`): () => `void`

Defined in: web/dist/stream/recovery-substrate.d.ts:51

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
