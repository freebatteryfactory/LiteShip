[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / AUDIT\_WARNING\_FLOOR

# Variable: AUDIT\_WARNING\_FLOOR

> `const` **AUDIT\_WARNING\_FLOOR**: readonly `string`[] = `[]`

Defined in: [command/src/commands/audit-floor-registry.ts:27](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/audit-floor-registry.ts#L27)

Sorted multiset of `rule@file` keys for pinned advisory warnings.

Empty since the 0.1.5 advisory-cleanup wave (ROADMAP epic #2): the doctor
fallback paths were reworked to surface read/parse failures as structured
check details, ship.ts's emit-then-return-1 exit-code contract is cleared
by the detector's error-binding rule, and the two deliberate fail-closed
defaults (html-trust CSP fallback, doctor --fix workspace guard) carry
allowlist reasons and classify as suppressed. Any new warning is a
regression against a zero floor.
