[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / collectBoundaryManifest

# Function: collectBoundaryManifest()

> **collectBoundaryManifest**(`projectRoot`, `options?`): `Promise`\<`Readonly`\<`Record`\<`string`, `BoundaryManifestEntry`\>\>\>

Defined in: [vite/src/boundary-manifest.ts:187](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/boundary-manifest.ts#L187)

Derive the `BoundaryManifest` for a project.

Walks `projectRoot` (skipping `node_modules`, build output, and VCS
directories) for boundary definition modules and `@quantize` CSS
blocks, then emits one entry per exported boundary: its minted
`ContentAddress` and precompiled per-tier outputs. Boundaries with no
`@quantize` block get an entry with empty `outputsByTier` -- the id is
still the sanctioned way for hosts to derive cache configuration.

## Parameters

### projectRoot

`string`

Absolute path of the project to scan.

### options?

[`CollectBoundaryManifestOptions`](../interfaces/CollectBoundaryManifestOptions.md)

Optional `boundaryDir` override (mirror of `dirs.boundary`).

## Returns

`Promise`\<`Readonly`\<`Record`\<`string`, `BoundaryManifestEntry`\>\>\>

The derived manifest (empty object when nothing is found).

## Example

```ts
import { collectBoundaryManifest } from '@czap/vite';

const manifest = await collectBoundaryManifest('/path/to/app');
// manifest.viewport.id === 'fnv1a:…' (Boundary.make's address)
// manifest.viewport.outputsByTier['transitions:standard'].css
```
