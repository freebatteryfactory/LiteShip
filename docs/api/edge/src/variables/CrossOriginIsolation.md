[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [edge/src](../README.md) / CrossOriginIsolation

# Variable: CrossOriginIsolation

> `const` **CrossOriginIsolation**: `object`

Defined in: [edge/src/cross-origin.ts:82](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/cross-origin.ts#L82)

Cross-origin isolation header vocabulary.

The single source of truth for the COOP/COEP pair liteship emits so
`SharedArrayBuffer`-backed workers get cross-origin isolation. Both the emitter
(`@liteship/astro`) and the deployed-header validator (`liteship doctor --deployed`)
derive from here.

## Type Declaration

### embedderPolicies

> **embedderPolicies**: () => readonly (`"require-corp"` \| `"credentialless"`)[]

The COEP values that establish isolation (`require-corp`, `credentialless`).

Every COEP value that establishes cross-origin isolation (`require-corp`, `credentialless`).

#### Returns

readonly (`"require-corp"` \| `"credentialless"`)[]

### isolationHeaders

> **isolationHeaders**: (`coep`) => `Record`\<`string`, `string`\>

The COOP/COEP header pair liteship emits, in emit order.

The COOP/COEP header pair liteship emits for cross-origin isolation, in emit order
(COOP then COEP). `coep` selects the embedder policy; it defaults to
`require-corp`. Consumed by `@liteship/astro`'s `CROSS_ORIGIN_HEADERS` so the emitted
values derive from this one source.

#### Parameters

##### coep?

`"require-corp"` \| `"credentialless"`

#### Returns

`Record`\<`string`, `string`\>

### openerPolicy

> **openerPolicy**: () => `string`

The isolating COOP value (`same-origin`).

The COOP value that establishes cross-origin isolation (`same-origin`).

#### Returns

`string`

## Example

```ts
import { CrossOriginIsolation } from '@liteship/edge';

const response = new Response(body, { headers: CrossOriginIsolation.isolationHeaders() });
// → Cross-Origin-Opener-Policy: same-origin
// → Cross-Origin-Embedder-Policy: require-corp
```
