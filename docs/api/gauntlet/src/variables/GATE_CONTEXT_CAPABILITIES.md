[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [gauntlet/src](../README.md) / GATE\_CONTEXT\_CAPABILITIES

# Variable: GATE\_CONTEXT\_CAPABILITIES

> `const` **GATE\_CONTEXT\_CAPABILITIES**: readonly \[`"skipDetector"`, `"earlyReturnDetector"`, `"codeOnly"`, `"diagnosticEmitterDetector"`\]

Defined in: [gauntlet/src/gate.ts:472](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L472)

Host-injected parser capabilities that refine lean gate fallbacks. These are
executable toolchain inputs, not per-run fact channels. The tuple exists so
scoping, recording, and adversarial tests share one vocabulary.
