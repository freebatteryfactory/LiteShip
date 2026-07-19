[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / StreamRecoveryHandlers

# Interface: StreamRecoveryHandlers

Defined in: [web/src/stream/recovery.ts:30](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery.ts#L30)

Host callbacks for applying a recovered snapshot.

## Properties

### applyDiscreteSignal

> `readonly` **applyDiscreteSignal**: (`payload`) => `void`

Defined in: [web/src/stream/recovery.ts:37](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery.ts#L37)

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

Defined in: [web/src/stream/recovery.ts:31](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery.ts#L31)

#### Parameters

##### html

`string`

#### Returns

`Promise`\<`void`\>

***

### applyTransition?

> `readonly` `optional` **applyTransition?**: (`transition`) => `void`

Defined in: [web/src/stream/recovery.ts:46](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/recovery.ts#L46)

TYPED gap-replay seam: reflect an attestation-checked
[DiscreteStateTransition](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/state-transition.ts) into the host (e.g. dispatch to the DOM).
The typed parameter is the uncompilable seam (Law 16) — a continuous cell /
raw signal is not a `DiscreteStateTransition`, so it cannot be passed here.
Optional: absent, the crossing still hydrates the cell store; only the host
DOM reflection is skipped (the latent, producer-less state).

#### Parameters

##### transition

[`DiscreteStateTransition`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/state-transition.ts)

#### Returns

`void`
