[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / InvariantState

# Type Alias: InvariantState

> **InvariantState** = [`InvariantProven`](../interfaces/InvariantProven.md) \| [`InvariantUntraced`](../interfaces/InvariantUntraced.md) \| [`InvariantWaived`](../interfaces/InvariantWaived.md) \| [`InvariantExpired`](../interfaces/InvariantExpired.md)

Defined in: [gauntlet/src/traceability-facts.ts:46](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/traceability-facts.ts#L46)

The lifecycle state of one invariant — a `_tag` union, the deterministic fold's
output. The host's pure state machine assigns exactly one of these per declared
invariant; the gate folds on the `_tag`.

- `proven`: a claimed proving test EXISTS and carries a matching `PROVES` header.
  (`DECLARED → TRACED → PROVEN` — the happy path. No finding.)
- `untraced`: declared, but no proof AND no waiver covers it. → a finding at the
  invariant's level (hard-fail for L3/L4).
- `waived`: a non-expired, owner-signed waiver covers a not-yet-traced invariant.
  No finding (an honest, time-boxed deferral with teeth).
- `expired`: a waiver covered it but its expiry is past the injected wall-clock
  date — the debt came due. → a finding (the waiver lost its teeth).
