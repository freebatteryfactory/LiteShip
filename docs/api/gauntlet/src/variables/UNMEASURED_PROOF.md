[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / UNMEASURED\_PROOF

# Variable: UNMEASURED\_PROOF

> `const` **UNMEASURED\_PROOF**: `0`

Defined in: [gauntlet/src/proof-facts.ts:95](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/proof-facts.ts#L95)

The proof scalar the gate assigns a module the host did NOT measure — the WEAKEST
link (`0`, fully unproven). This is the SOUND direction for a risk signal: an
unmeasured dependency must drag an effective proof DOWN, never silently leave it
untouched (which would let a critical module inherit a clean global proof through
a hole the host never looked at). A host that measures every IR module never hits
this floor; it is the defence-in-depth value for a dependency outside the measured
set.
