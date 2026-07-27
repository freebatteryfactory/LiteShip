[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/runtime](../README.md) / Resumption

# Variable: Resumption

> `const` **Resumption**: `object`

Defined in: web/dist/stream/resumption.d.ts:113

SSE resumption protocol namespace.

Handles connection resumption using `lastEventId`. Persists resumption
state to `sessionStorage`, compares event IDs to determine if replay
is possible, and falls back to full snapshot when the gap is too large.

## Type Declaration

### canResume

> `readonly` **canResume**: *typeof* `_canResume`

### clearState

> `readonly` **clearState**: *typeof* `clearState`

### fetchSnapshot

> `readonly` **fetchSnapshot**: *typeof* `fetchSnapshot`

### loadState

> `readonly` **loadState**: *typeof* `loadState`

### parseEventId

> `readonly` **parseEventId**: *typeof* `_parseEventId`

### resume

> `readonly` **resume**: *typeof* `resume`

### saveState

> `readonly` **saveState**: *typeof* `saveState`

## Example

```ts
import { Resumption } from '@liteship/web';

// Save state on each SSE message (timestamp defaults to systemClock.now())
Resumption.saveState({ artifactId: 'doc-1', lastEventId: 'evt-99', lastSequence: 99 });

// On reconnect, resume from where we left off
const response = await Resumption.resume('doc-1', 'evt-105');
// response.type => 'replay' (patches) or 'snapshot' (full state)
```
