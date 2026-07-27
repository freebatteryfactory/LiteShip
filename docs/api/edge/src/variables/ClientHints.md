[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [edge/src](../README.md) / ClientHints

# Variable: ClientHints

> `const` **ClientHints**: `object`

Defined in: [edge/src/client-hints.ts:428](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/client-hints.ts#L428)

Client Hints namespace.

Parses HTTP Client Hints headers into the same
[ExtendedDeviceCapabilities](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/detect/src/interfaces/ExtendedDeviceCapabilities.md) structure used by `@liteship/detect`,
enabling server-side / edge-side tier mapping without browser APIs.
Also generates the `Accept-CH` and `Critical-CH` response headers needed
to request hints from the browser.

## Type Declaration

### acceptCHHeader

> **acceptCHHeader**: () => `string`

Produce the `Accept-CH` response header value listing all useful hints.

Generate the `Accept-CH` header value for requesting all useful Client Hints
on subsequent requests.

#### Returns

`string`

A comma-separated list of Client Hint header names

#### Example

```ts
import { ClientHints } from '@liteship/edge';

const response = new Response('OK', {
  headers: { 'Accept-CH': ClientHints.acceptCHHeader() },
});
```

### criticalCHHeader

> **criticalCHHeader**: () => `string`

Produce the `Critical-CH` response header value listing boot-required hints.

Generate the `Critical-CH` header value for hints needed on the very first
request (triggers a browser retry if missing).

#### Returns

`string`

A comma-separated list of critical Client Hint header names

#### Example

```ts
import { ClientHints } from '@liteship/edge';

const response = new Response('OK', {
  headers: {
    'Accept-CH': ClientHints.acceptCHHeader(),
    'Critical-CH': ClientHints.criticalCHHeader(),
  },
});
```

### parseClientHints

> **parseClientHints**: (`headers`) => [`ExtendedDeviceCapabilities`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/detect/src/interfaces/ExtendedDeviceCapabilities.md)

Parse Client Hints headers into [ExtendedDeviceCapabilities](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/detect/src/interfaces/ExtendedDeviceCapabilities.md).

Values-only projection of the canonical richer [parseEvidence](#parseevidence) producer.

Use this for conservative rendering. Use `parseEvidence` when a consumer
needs to distinguish observed inputs from inferred fallbacks.

#### Parameters

##### headers

[`ClientHintsHeaders`](../interfaces/ClientHintsHeaders.md) \| `Headers`

#### Returns

[`ExtendedDeviceCapabilities`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/detect/src/interfaces/ExtendedDeviceCapabilities.md)

### parseEvidence

> **parseEvidence**: (`headers`) => [`ClientHintsEvidence`](../interfaces/ClientHintsEvidence.md)

Parse Client Hints once into complete values and input-level provenance.

#### Parameters

##### headers

[`ClientHintsHeaders`](../interfaces/ClientHintsHeaders.md) \| `Headers`

#### Returns

[`ClientHintsEvidence`](../interfaces/ClientHintsEvidence.md)

### responsiveMediaCapabilities

> **responsiveMediaCapabilities**: (`headersOrCaps`) => [`ResponsiveMediaCapabilities`](../../../liteship/src/media/interfaces/ResponsiveMediaCapabilities.md)

Derive Save-Data/DPR capabilities for responsive-media projection (#125).

Derive Save-Data / DPR capabilities for responsive-media projection (#125).
Hosts that already parsed caps can also call this with the result of
[parseClientHints](#parseclienthints).

#### Parameters

##### headersOrCaps

[`ClientHintsHeaders`](../interfaces/ClientHintsHeaders.md) \| [`ExtendedDeviceCapabilities`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/detect/src/interfaces/ExtendedDeviceCapabilities.md) \| `Headers`

#### Returns

[`ResponsiveMediaCapabilities`](../../../liteship/src/media/interfaces/ResponsiveMediaCapabilities.md)

### responsiveMediaVaryHeader

> **responsiveMediaVaryHeader**: () => `string`

Produce the `Vary` value for responsive-media representations (#125).

`Vary` inputs that shape responsive-media projection (DPR + Save-Data).
CDN caches must vary on these or they can serve the wrong srcset (#125).

#### Returns

`string`

### varyCHHeader

> **varyCHHeader**: () => `string`

Produce the `Vary` response header value for tier-varying HTML (#122).

Produce the `Vary` response header value listing every Client Hint (and
network hint) that shapes tier-specific HTML. CDN caches must vary on these
inputs or they can serve the wrong tier's representation (#122).

#### Returns

`string`

## Example

```ts
import { ClientHints } from '@liteship/edge';

// In an edge handler:
const caps = ClientHints.parseClientHints(request.headers);
const response = new Response(body, {
  headers: {
    'Accept-CH': ClientHints.acceptCHHeader(),
    'Critical-CH': ClientHints.criticalCHHeader(),
  },
});
```
