[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / Diagnostics

# Variable: Diagnostics

> `const` **Diagnostics**: `object`

Defined in: [core/src/diagnostics.ts:182](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/diagnostics.ts#L182)

Diagnostics facade — runtime boundaries call [Diagnostics.warn](#warn) / [Diagnostics.error](#error)
instead of `console.*` so hosts can redirect or capture every diagnostic via [Diagnostics.setSink](#setsink).

## Type Declaration

### clearOnce

> **clearOnce**: () => `void`

Clear the deduplication set used by [Diagnostics.warnOnce](#warnonce).

#### Returns

`void`

### createBufferSink

> **createBufferSink**: () => `object`

Build an in-memory sink that collects events into an array — useful for tests.

#### Returns

`object`

##### events

> `readonly` **events**: [`DiagnosticEvent`](../interfaces/DiagnosticEvent.md)[]

##### sink

> `readonly` **sink**: [`DiagnosticsSink`](../interfaces/DiagnosticsSink.md)

### error

> **error**: (`payload`) => [`DiagnosticEvent`](../interfaces/DiagnosticEvent.md)

Emit an `error`-level [DiagnosticEvent](../interfaces/DiagnosticEvent.md) to the current sink.

#### Parameters

##### payload

[`DiagnosticPayload`](../interfaces/DiagnosticPayload.md)

#### Returns

[`DiagnosticEvent`](../interfaces/DiagnosticEvent.md)

### reset

> **reset**: () => `void`

Convenience for `resetSink()` + `clearOnce()` — mostly for test teardown.

#### Returns

`void`

### resetClock

> **resetClock**: () => `void`

Restore the default [wallClock](wallClock.md) timestamp source.

#### Returns

`void`

### resetSink

> **resetSink**: () => `void`

Restore the default sink that writes through `console`.

#### Returns

`void`

### setClock

> **setClock**: (`clock`) => [`Clock`](../interfaces/Clock.md)

Replace the clock the emission `timestamp` (a wall-clock TIMESTAMP) is read
from; returns the previous clock. Pass a `fixedClock`/`manualClock` for
deterministic, replayable diagnostic timestamps.

#### Parameters

##### clock

[`Clock`](../interfaces/Clock.md)

#### Returns

[`Clock`](../interfaces/Clock.md)

### setSink

> **setSink**: (`sink`) => [`DiagnosticsSink`](../interfaces/DiagnosticsSink.md)

Replace the active sink (e.g. for tests or hosted environments).

#### Parameters

##### sink

[`DiagnosticsSink`](../interfaces/DiagnosticsSink.md)

#### Returns

[`DiagnosticsSink`](../interfaces/DiagnosticsSink.md)

### warn

> **warn**: (`payload`) => [`DiagnosticEvent`](../interfaces/DiagnosticEvent.md)

Emit a `warn`-level [DiagnosticEvent](../interfaces/DiagnosticEvent.md) to the current sink.

#### Parameters

##### payload

[`DiagnosticPayload`](../interfaces/DiagnosticPayload.md)

#### Returns

[`DiagnosticEvent`](../interfaces/DiagnosticEvent.md)

### warnOnce

> **warnOnce**: (`payload`) => [`DiagnosticEvent`](../interfaces/DiagnosticEvent.md) \| `null`

[Diagnostics.warn](#warn), but deduplicated by `source:code:message`.

#### Parameters

##### payload

[`DiagnosticPayload`](../interfaces/DiagnosticPayload.md)

#### Returns

[`DiagnosticEvent`](../interfaces/DiagnosticEvent.md) \| `null`
