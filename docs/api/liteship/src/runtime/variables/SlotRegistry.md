[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/runtime](../README.md) / SlotRegistry

# Variable: SlotRegistry

> **SlotRegistry**: `object`

Defined in: web/dist/slot/registry.d.ts:11

Slot registry namespace.

Maps `SlotPath` identifiers (from `data-liteship-slot` attributes) to DOM
elements for efficient lookup and patching. Provides DOM scanning,
`MutationObserver`-based auto-registration, and path lookup utilities.

## Type Declaration

### create

> `readonly` **create**: () => [`SlotRegistry`](../interfaces/SlotRegistry.md)

Create a new slot registry that maps slot paths to DOM elements.

#### Returns

[`SlotRegistry`](../interfaces/SlotRegistry.md)

A new SlotRegistry instance

#### Example

```ts
import { SlotRegistry, SlotAddressing } from '@liteship/web';

const heroPath = SlotAddressing.brand('/hero');
const registry = SlotRegistry.create();
registry.register({ path: heroPath, element: document.querySelector('#hero')! });
const entry = registry.get(heroPath);
console.log(entry?.mode); // 'partial' (default; mounted defaults to true)
```

### findElement

> `readonly` **findElement**: (`path`) => `Element` \| `null`

Find the DOM element for a slot path via `querySelector`.

#### Parameters

##### path

[`SlotPath`](../type-aliases/SlotPath.md)

The slot path to search for

#### Returns

`Element` \| `null`

The matching Element, or null

#### Example

```ts
import { SlotRegistry, SlotAddressing } from '@liteship/web';

const el = SlotRegistry.findElement(SlotAddressing.brand('/sidebar'));
// el => <div data-liteship-slot="/sidebar"> or null
```

### getPath

> `readonly` **getPath**: (`element`) => [`SlotPath`](../type-aliases/SlotPath.md) \| `null`

Get the slot path from a DOM element's `data-liteship-slot` attribute.

#### Parameters

##### element

`Element`

The DOM element to inspect

#### Returns

[`SlotPath`](../type-aliases/SlotPath.md) \| `null`

The slot path, or null if the element is not a slot

#### Example

```ts
import { SlotRegistry } from '@liteship/web';

const el = document.querySelector('[data-liteship-slot]')!;
const path = SlotRegistry.getPath(el);
// path => '/hero' or null if not a slot element
```

### observe

> `readonly` **observe**: (`registry`, `root`) => [`Disposer`](../../reactive/type-aliases/Disposer.md)

Scan `root` for pre-existing slots, then create a `MutationObserver` that
automatically registers/unregisters slots as DOM elements with
`data-liteship-slot` are added or removed. Returns a [Disposer](../../reactive/type-aliases/Disposer.md) that
disconnects the observer; register it on a `Lifetime` (or call it directly)
to own the teardown.

A separate [scanDOM](#scandom) call before `observe` is no longer required
(and stays harmless: `register` is idempotent per path+element+mode).

#### Parameters

##### registry

[`SlotRegistry`](../interfaces/SlotRegistry.md)

The slot registry to keep in sync

##### root

`Element`

The DOM root to scan and observe

#### Returns

[`Disposer`](../../reactive/type-aliases/Disposer.md)

A [Disposer](../../reactive/type-aliases/Disposer.md) that disconnects the `MutationObserver`

#### Example

```ts
import { SlotRegistry } from '@liteship/web';
import { Lifetime } from '@liteship/core';

const registry = SlotRegistry.create();
const lifetime = Lifetime.make();
lifetime.add(SlotRegistry.observe(registry, document.body));
// Pre-existing slots are registered; new slots auto-register on DOM changes.
// lifetime.dispose() disconnects the observer.
```

### scanDOM

> `readonly` **scanDOM**: (`registry`, `root`, `defaultMode?`) => `void`

Scan the DOM subtree for elements with `data-liteship-slot` attributes and
register them in the given registry.

#### Parameters

##### registry

[`SlotRegistry`](../interfaces/SlotRegistry.md)

The slot registry to populate

##### root

`Element`

The DOM root element to scan

##### defaultMode?

[`IslandMode`](../type-aliases/IslandMode.md)

Default island mode for discovered slots (defaults to 'partial')

#### Returns

`void`

#### Example

```ts
import { SlotRegistry } from '@liteship/web';

const registry = SlotRegistry.create();
SlotRegistry.scanDOM(registry, document.body);
// All elements with data-liteship-slot="/..." are now registered
```

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
