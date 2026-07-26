[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/astro](../README.md) / LLMSessionShape

# Interface: LLMSessionShape

Defined in: astro/dist/runtime/llm-session.d.ts:33

Controller surface of an LLM session. Tracks runtime state, ingests
chunks from a stream adapter, and releases resources on
[LLMSessionShape.dispose](#dispose).

## Properties

### state

> `readonly` **state**: `RuntimeSessionState`

Defined in: astro/dist/runtime/llm-session.d.ts:35

Current session state (`idle` / `active` / `reconnecting` / `disposed`).

## Methods

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

> **dispose**(): `void`

Defined in: astro/dist/runtime/llm-session.d.ts:51

Terminate the session and release pooled runtimes.

#### Returns

`void`

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
