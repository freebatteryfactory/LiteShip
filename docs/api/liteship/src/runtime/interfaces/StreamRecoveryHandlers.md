[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/runtime](../README.md) / StreamRecoveryHandlers

# Interface: StreamRecoveryHandlers

Defined in: web/dist/stream/recovery.d.ts:17

Host callbacks for applying a recovered snapshot.

## Properties

### applyDiscreteSignal

> `readonly` **applyDiscreteSignal**: (`payload`) => `void`

Defined in: web/dist/stream/recovery.d.ts:24

SNAPSHOT-FLOOR discrete signal application: raw, pre-filtered discrete
payloads from the HTML snapshot re-sync (the permanent floor). These are NOT
attestation-checked transitions, so the payload is deliberately `unknown`.

#### Parameters

##### payload

`unknown`

#### Returns

`void`

***

### applyHtml

> `readonly` **applyHtml**: (`html`) => `Promise`\<`void`\>

Defined in: web/dist/stream/recovery.d.ts:18

#### Parameters

##### html

`string`

#### Returns

`Promise`\<`void`\>

***

### applyTransition?

> `readonly` `optional` **applyTransition?**: (`transition`) => `void`

Defined in: web/dist/stream/recovery.d.ts:33

TYPED gap-replay seam: reflect an attestation-checked
[DiscreteStateTransition](../../motion/interfaces/DiscreteStateTransition.md) into the host (e.g. dispatch to the DOM).
The typed parameter is the uncompilable seam (Law 16) — a continuous cell /
raw signal is not a `DiscreteStateTransition`, so it cannot be passed here.
Optional: absent, the crossing still hydrates the cell store; only the host
DOM reflection is skipped (the latent, producer-less state).

#### Parameters

##### transition

[`DiscreteStateTransition`](../../motion/interfaces/DiscreteStateTransition.md)

#### Returns

`void`
