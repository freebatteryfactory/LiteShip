[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/astro](../README.md) / LLMSession

# Interface: LLMSession

Defined in: astro/dist/runtime/llm-session.d.ts:33

Controller surface of an LLM session. Tracks runtime state, ingests
chunks from a stream adapter, and releases resources on
[LLMSession.dispose](../../reactive/interfaces/AsyncOwnedResource.md#dispose).

## Extends

- [`AsyncOwnedResource`](../../reactive/interfaces/AsyncOwnedResource.md)

## Properties

### lifetime

> `readonly` **lifetime**: [`Lifetime`](../../reactive/type-aliases/Lifetime.md)

Defined in: core/dist/reactive/lifetime.d.ts:108

The owning disposal handle — for advanced/debug composition only.

#### Inherited from

[`AsyncOwnedResource`](../../reactive/interfaces/AsyncOwnedResource.md).[`lifetime`](../../reactive/interfaces/AsyncOwnedResource.md#lifetime)

***

### state

> `readonly` **state**: `RuntimeSessionState`

Defined in: astro/dist/runtime/llm-session.d.ts:35

Current session state (`idle` / `active` / `reconnecting` / `disposed`).

## Methods

### \[asyncDispose\]()

> **\[asyncDispose\]**(): `Promise`\<`void`\>

Defined in: core/dist/reactive/lifetime.d.ts:112

Well-known disposer so the resource works with an `await using` declaration.

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`AsyncOwnedResource`](../../reactive/interfaces/AsyncOwnedResource.md).[`[asyncDispose]`](../../reactive/interfaces/AsyncOwnedResource.md#asyncdispose)

***

### activate()

> **activate**(): `void`

Defined in: astro/dist/runtime/llm-session.d.ts:37

Transition from idle to active.

#### Returns

`void`

***

### beginReconnect()

> **beginReconnect**(): `void`

Defined in: astro/dist/runtime/llm-session.d.ts:39

Enter the reconnecting state so incoming chunks are gated.

#### Returns

`void`

***

### dispose()

> **dispose**(): `Promise`\<`void`\>

Defined in: core/dist/reactive/lifetime.d.ts:110

Tear down exactly once; the returned promise settles when async finalizers settle. Idempotent.

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`AsyncOwnedResource`](../../reactive/interfaces/AsyncOwnedResource.md).[`dispose`](../../reactive/interfaces/AsyncOwnedResource.md#dispose)

***

### ingest()

> **ingest**(`chunk`): `"continue"` \| `"done"`

Defined in: astro/dist/runtime/llm-session.d.ts:41

Consume one chunk; returns `done` on stream end.

#### Parameters

##### chunk

[`LLMChunk`](../../runtime/interfaces/LLMChunk.md)

#### Returns

`"continue"` \| `"done"`

***

### rememberEnvelope()

> **rememberEnvelope**(`envelope`): `void`

Defined in: astro/dist/runtime/llm-session.d.ts:47

Remember a server-emitted receipt envelope for later replay.

#### Parameters

##### envelope

[`ReceiptEnvelope`](../../evidence/interfaces/ReceiptEnvelope.md)

#### Returns

`void`

***

### replayGap()

> **replayGap**(): `object`

Defined in: astro/dist/runtime/llm-session.d.ts:43

Replay receipts after a gap; returns the chosen strategy type.

#### Returns

`object`

##### type

> `readonly` **type**: `string`

***

### reset()

> **reset**(`target?`): `void`

Defined in: astro/dist/runtime/llm-session.d.ts:49

Reset accumulated state; optionally re-bind the target element.

#### Parameters

##### target?

`HTMLElement`

#### Returns

`void`
