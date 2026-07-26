[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/runtime](../README.md) / SlotRegistry

# Variable: SlotRegistry

> `const` **SlotRegistry**: `object`

Defined in: web/dist/slot/registry.d.ts:135

Slot registry namespace.

Maps `SlotPath` identifiers (from `data-liteship-slot` attributes) to DOM
elements for efficient lookup and patching. Provides DOM scanning,
`MutationObserver`-based auto-registration, and path lookup utilities.

## Type Declaration

### create

> `readonly` **create**: *typeof* `create`

### findElement

> `readonly` **findElement**: *typeof* `findElement`

### getPath

> `readonly` **getPath**: *typeof* `getPath`

### observe

> `readonly` **observe**: *typeof* `observe`

### scanDOM

> `readonly` **scanDOM**: *typeof* `scanDOM`

## Example

```ts
import { SlotRegistry } from '@liteship/web';

const registry = SlotRegistry.create();
SlotRegistry.scanDOM(registry, document.body);

const entries = registry.entries();
for (const [path, entry] of entries) {
  console.log(path, entry.element.tagName);
}

const el = SlotRegistry.findElement(SlotAddressing.brand('/hero'));
const path = el ? SlotRegistry.getPath(el) : null;
```
