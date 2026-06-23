[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / IntegrityDecision

# Type Alias: IntegrityDecision

> **IntegrityDecision** = \{ `proceed`: `true`; \} \| \{ `proceed`: `false`; `reason`: `"mismatch"` \| `"absent-required"`; \}

Defined in: [web/src/security/shader-integrity.ts:311](https://github.com/heyoub/LiteShip/blob/main/packages/web/src/security/shader-integrity.ts#L311)

The secure-by-default refusal decision: given the resolved integrity result and
the policy mode, should the runtime REFUSE to compile? Returns a discriminated
decision so the caller can emit a precise diagnostic.

  • a `'mismatch'` ALWAYS refuses (a tampered shader, regardless of mode);
  • an `'absent'` refuses under `'required-for-external'` (secure default) and
    is allowed under `'lenient'`;
  • a `'verified'` always proceeds.
