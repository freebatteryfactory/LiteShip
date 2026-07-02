[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [edge/src](../README.md) / EdgeTier

# Variable: EdgeTier

> `const` **EdgeTier**: `object`

Defined in: [edge/src/edge-tier.ts:130](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/edge/src/edge-tier.ts#L130)

Edge tier detection namespace.

Pairs [ClientHints.parseClientHints](ClientHints.md#parseclienthints) with the pure tier-mapping
functions from `@czap/detect` so the edge and the browser produce the
same `capTier`/`motionTier`/`designTier` triple for a given device.

## Type Declaration

### detectTier

> **detectTier**: (`headers`) => [`EdgeTierResult`](../interfaces/EdgeTierResult.md)

Detect [EdgeTierResult](../interfaces/EdgeTierResult.md) from a `Headers`-like bag.

Detect capability tiers from HTTP headers using Client Hints parsing
and the same pure tier mapping functions used on the client.

#### Parameters

##### headers

[`ClientHintsHeaders`](../interfaces/ClientHintsHeaders.md) \| `Headers`

#### Returns

[`EdgeTierResult`](../interfaces/EdgeTierResult.md)

### tierDataAttributes

> **tierDataAttributes**: (`result`) => `string`

Render an `EdgeTierResult` into a `data-czap-*` attribute STRING for the root HTML element.

Generate the HTML data-attribute STRING for injection into the `<html>`
element. Serialized from [tierDataAttributesMap](#tierdataattributesmap), so the string and
spreadable-map forms can never disagree.

#### Parameters

##### result

[`EdgeTierResult`](../interfaces/EdgeTierResult.md)

#### Returns

`string`

#### Example

```
tierDataAttributes(result)
// => 'data-czap-tier="reactive" data-czap-motion="animations" data-czap-design="enhanced"'
```

### tierDataAttributesMap

> **tierDataAttributesMap**: (`result`) => `Readonly`\<`Record`\<`` `data-czap-${CapAxis}` ``, `string`\>\>

Structured, spreadable `data-czap-*` map for the root HTML element (auto-includes every CAP_AXES axis).

Structured `data-czap-*` attribute map for the root `<html>` element — the
spreadable form of [tierDataAttributes](#tierdataattributes).

Keyed by the FULL attribute name (`data-czap-<axis>`), built by iterating the
canonical CAP_AXES registry, so a newly-added capability axis appears
automatically. A consumer that spreads this map (`<html {...map}>`) can never
silently MISS an axis the way a hand-written attribute list does — the whole
point of exposing it alongside the pre-serialized string.

#### Parameters

##### result

[`EdgeTierResult`](../interfaces/EdgeTierResult.md)

#### Returns

`Readonly`\<`Record`\<`` `data-czap-${CapAxis}` ``, `string`\>\>

#### Example

```ts
// Astro: <html {...EdgeTier.tierDataAttributesMap(result)}>
tierDataAttributesMap(result)
// => { 'data-czap-tier': 'reactive', 'data-czap-motion': 'animations', 'data-czap-design': 'enhanced' }
```

### tierFromParsed

> **tierFromParsed**: (`caps`) => [`EdgeTierResult`](../interfaces/EdgeTierResult.md)

Map parsed Client Hints capabilities to an [EdgeTierResult](../interfaces/EdgeTierResult.md).

Map already-parsed [ExtendedDeviceCapabilities](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/detect/src/interfaces/ExtendedDeviceCapabilities.md) to the tier triple
using the same pure functions as the client runtime.

#### Parameters

##### caps

[`ExtendedDeviceCapabilities`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/detect/src/interfaces/ExtendedDeviceCapabilities.md)

#### Returns

[`EdgeTierResult`](../interfaces/EdgeTierResult.md)

## Example

```ts
import { EdgeTier } from '@czap/edge';

const result = EdgeTier.detectTier(request.headers);
const html = `<html ${EdgeTier.tierDataAttributes(result)}>`;
// `<html data-czap-tier="reactive" data-czap-motion="animations" data-czap-design="enhanced">`
```
