[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / Resumption

# Variable: Resumption

> `const` **Resumption**: `object`

Defined in: [web/src/stream/resumption.ts:411](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/stream/resumption.ts#L411)

SSE resumption protocol namespace.

Handles connection resumption using `lastEventId`. Persists resumption
state to `sessionStorage`, compares event IDs to determine if replay
is possible, and falls back to full snapshot when the gap is too large.

## Type Declaration

### canResume

> **canResume**: (`lastEventId`, `serverOldestId`) => `boolean`

Re-export of the Effect-free gap-size check from `./resumption-pure.js`.

Check if resumption is possible by comparing event IDs.

#### Parameters

##### lastEventId

`string`

##### serverOldestId

`string`

#### Returns

`boolean`

### clearState

> **clearState**: (`artifactId`) => `void`

Clear resumption state from sessionStorage.

#### Parameters

##### artifactId

`string`

The artifact ID whose state should be cleared

#### Returns

`void`

#### Example

```ts
import { Resumption } from '@czap/web';

Resumption.clearState('article-123');
```

### fetchSnapshot

> **fetchSnapshot**: (`artifactId`, `config?`) => `Promise`\<\{ `html`: `string`; `lastEventId`: `string`; `signals`: `unknown`; `type`: `"snapshot"`; \}\>

Request a snapshot when resumption is not possible.

#### Parameters

##### artifactId

`string`

##### config?

`Partial`\<`Pick`\<[`ResumptionConfig`](../interfaces/ResumptionConfig.md), `"snapshotUrl"` \| `"endpointPolicy"` \| `"timeout"`\>\>

#### Returns

`Promise`\<\{ `html`: `string`; `lastEventId`: `string`; `signals`: `unknown`; `type`: `"snapshot"`; \}\>

### loadState

> **loadState**: (`artifactId`) => [`ResumptionState`](../interfaces/ResumptionState.md) \| `null`

Load resumption state from sessionStorage.

#### Parameters

##### artifactId

`string`

The artifact ID to load state for

#### Returns

[`ResumptionState`](../interfaces/ResumptionState.md) \| `null`

The saved state, or null if none exists

#### Example

```ts
import { Resumption } from '@czap/web';

const state = Resumption.loadState('article-123');
if (state) {
  console.log(state.lastEventId); // 'evt-42'
}
```

### parseEventId

> **parseEventId**: (`eventId`) => `object`

Re-export of the Effect-free event-id parser from `./resumption-pure.js`.

Parse an event ID to extract sequence number and other components.

Primary: canonical HLC wire format (`HLC.encode` — colon-separated hex).
Legacy: numeric ("123"), prefixed ("evt-123"), dash-decimal resumption ids.

#### Parameters

##### eventId

`string`

#### Returns

`object`

##### nodeId?

> `optional` **nodeId?**: `string`

##### raw

> **raw**: `string`

##### sequence

> **sequence**: `number`

##### timestamp?

> `optional` **timestamp?**: `number`

### resume

> **resume**: (`artifactId`, `currentEventId`, `config?`) => `Promise`\<[`ResumeResponse`](../type-aliases/ResumeResponse.md)\>

Resume from a disconnection, choosing between event replay (small gap)
and full snapshot (large gap or no prior state).

#### Parameters

##### artifactId

`string`

The artifact to resume

##### currentEventId

`string`

The latest event ID from the reconnected stream

##### config?

`Partial`\<[`ResumptionConfig`](../interfaces/ResumptionConfig.md)\>

Optional partial config overriding defaults

#### Returns

`Promise`\<[`ResumeResponse`](../type-aliases/ResumeResponse.md)\>

A promise of a [ResumeResponse](../type-aliases/ResumeResponse.md); rejects with an
         `IoError`/`ParseError`/`ValidationError` on failure

#### Example

```ts
import { Resumption } from '@czap/web';

const response = await Resumption.resume('article-123', 'evt-50', { maxGapSize: 100 });
// response.type => 'replay' | 'snapshot'
```

### saveState

> **saveState**: (`state`, `clock`) => `void`

Save resumption state to sessionStorage.

#### Parameters

##### state

[`ResumptionStateInput`](../type-aliases/ResumptionStateInput.md)

The resumption state to persist; `timestamp` defaults to the clock's `now()`

##### clock?

[`Clock`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/interfaces/Clock.md) = `wallClock`

Time source for the default timestamp; defaults to `wallClock`
               (epoch ms — the persisted timestamp is a real point in time, read
               back as epoch, not the monotonic systemClock). Pass a
               `fixedClock`/`manualClock` to make the persisted artifact deterministic.

#### Returns

`void`

#### Example

```ts
import { Resumption } from '@czap/web';

Resumption.saveState({
  artifactId: 'article-123',
  lastEventId: 'evt-42',
  lastSequence: 42,
});
```

## Example

```ts
import { Resumption } from '@czap/web';

// Save state on each SSE message (timestamp defaults to systemClock.now())
Resumption.saveState({ artifactId: 'doc-1', lastEventId: 'evt-99', lastSequence: 99 });

// On reconnect, resume from where we left off
const response = await Resumption.resume('doc-1', 'evt-105');
// response.type => 'replay' (patches) or 'snapshot' (full state)
```
