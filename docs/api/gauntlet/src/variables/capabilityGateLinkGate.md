[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / capabilityGateLinkGate

# Variable: capabilityGateLinkGate

> `const` **capabilityGateLinkGate**: [`Gate`](../interfaces/Gate.md)

Defined in: [gauntlet/src/gates/capability-gate-link.ts:129](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/gates/capability-gate-link.ts#L129)

The qualified gate — fixtures included, so it self-proves via the ratchet.

- RED: an `if (Math.random())` guard declaring `ffmpeg-absent` → a blocking `error` finding.
- GREEN: a guard that derives from the ffmpeg probe → ZERO findings (a genuine gate).
- MUTATION: a gate that treats EVERY result as linked (ignores `linked`) folds no finding — it leaves
  the red's unlinked skip unflagged, so the mutant fails the red.
