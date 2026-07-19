[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / tokenBufferCapsule

# Variable: tokenBufferCapsule

> `const` **tokenBufferCapsule**: [`CapsuleDef`](../interfaces/CapsuleDef.md)\<`"stateMachine"`, \{ `_tag`: `"push"`; `token`: `string`; \} \| \{ `_tag`: `"flush"`; \} \| \{ `_tag`: `"reset"`; \}, \{ `phase`: `"idle"` \| `"buffering"` \| `"draining"`; `tokens`: readonly `string`[]; `totalBytes`: `number`; \}, `unknown`\>

Defined in: [core/src/authoring/capsules/token-buffer.ts:88](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/capsules/token-buffer.ts#L88)

Declared capsule for TokenBuffer. Registered in the module-level
catalog at import time; walked by the factory compiler.
