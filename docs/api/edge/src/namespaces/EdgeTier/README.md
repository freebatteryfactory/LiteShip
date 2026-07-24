[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [edge/src](../../README.md) / EdgeTier

# EdgeTier

Edge tier detection namespace.

Pairs [ClientHints.parseClientHints](../../variables/ClientHints.md#parseclienthints) with the pure tier-mapping
functions from `@liteship/detect` so the edge and the browser produce the
same `capTier`/`motionTier`/`designTier` triple for a given device.

## Example

```ts
import { EdgeTier } from '@liteship/edge';

const result = EdgeTier.detectTier(request.headers);
const html = `<html ${EdgeTier.tierDataAttributes(result)}>`;
// `<html data-liteship-tier="reactive" data-liteship-motion="animations" data-liteship-design="enhanced">`
```

## Type Aliases

- [Result](type-aliases/Result.md)
