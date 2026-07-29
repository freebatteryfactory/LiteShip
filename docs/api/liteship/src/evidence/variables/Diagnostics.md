[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/evidence](../README.md) / Diagnostics

# Variable: Diagnostics

> `const` **Diagnostics**: `object`

Defined in: core/dist/evidence/diagnostics.d.ts:60

Diagnostics facade — runtime boundaries call [Diagnostics.warn](#warn) / [Diagnostics.error](#error)
instead of `console.*` so hosts can redirect or capture every diagnostic via [Diagnostics.setSink](#setsink).

## Type Declaration

### clearOnce

> `readonly` **clearOnce**: *typeof* `clearOnce`

Clear the deduplication set used by [Diagnostics.warnOnce](#warnonce).

### createBufferSink

> `readonly` **createBufferSink**: *typeof* `createBufferSink`

Build an in-memory sink that collects events into an array — useful for tests.

### error

> `readonly` **error**: *typeof* `error`

Emit an `error`-level [DiagnosticEvent](../interfaces/DiagnosticEvent.md) to the current sink.

### errorRegistered

> `readonly` **errorRegistered**: *typeof* `errorRegistered`

Emit an error whose stable code must be enrolled in DIAGNOSTIC_REGISTRY.

### reset

> `readonly` **reset**: *typeof* `reset`

Convenience for `resetSink()` + `clearOnce()` — mostly for test teardown.

### resetClock

> `readonly` **resetClock**: *typeof* `resetClock`

Restore the default `wallClock` timestamp source.

### resetSink

> `readonly` **resetSink**: *typeof* `resetSink`

Restore the default sink that writes through `console`.

### setClock

> `readonly` **setClock**: *typeof* `setClock`

Replace the clock the emission `timestamp` (a wall-clock TIMESTAMP) is read
from; returns the previous clock. Pass a `fixedClock`/`manualClock` for
deterministic, replayable diagnostic timestamps.

### setSink

> `readonly` **setSink**: *typeof* `setSink`

Replace the active sink (e.g. for tests or hosted environments).

### warn

> `readonly` **warn**: *typeof* `warn`

Emit a `warn`-level [DiagnosticEvent](../interfaces/DiagnosticEvent.md) to the current sink.

### warnOnce

> `readonly` **warnOnce**: *typeof* `warnOnce`

[Diagnostics.warn](#warn), but deduplicated by `source:code:message`.

### warnOnceRegistered

> `readonly` **warnOnceRegistered**: *typeof* `warnOnceRegistered`

Deduplicated registered warning.

### warnRegistered

> `readonly` **warnRegistered**: *typeof* `warnRegistered`

Emit a warning whose stable code must be enrolled in DIAGNOSTIC_REGISTRY.
