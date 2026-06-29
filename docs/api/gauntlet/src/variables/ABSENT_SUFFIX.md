[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / ABSENT\_SUFFIX

# Variable: ABSENT\_SUFFIX

> `const` **ABSENT\_SUFFIX**: `":absent"`

Defined in: [gauntlet/src/evidence-recorder.ts:97](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/evidence-recorder.ts#L97)

The marker suffix the recorder appends when a gate ACCESSES a fact channel and
finds it ABSENT (`undefined`) — a read that DEPENDS on the channel's ABSENCE. It is
DISTINCT from the bare channel name (a present read) AND from "never accessed" (the
channel not in the read-set at all), so the verdict key can fold absence-dependence:
a gate that branches on `supplyChain === undefined` keys apart from one that never
touches `supplyChain`, even though BOTH ran with `supplyChain` absent. Closes the
structural hole where reading-an-absent-channel recorded NOTHING.
