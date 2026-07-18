[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / GateFixtures

# Interface: GateFixtures

Defined in: [gauntlet/src/gate.ts:383](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L383)

The three fixtures every gate ships — the authority ratchet's evidence.
- `red`: a known-BAD world the gate MUST flag (≥1 finding). No red → no
  blocking authority (a gate that cannot demonstrate catching its target is
  advisory forever).
- `green`: a known-GOOD world the gate MUST pass clean (0 findings) — pins
  the false-positive floor.
- `mutation`: an operator that mutates the gate's OWN logic; the harness
  asserts the mutated gate then FAILS red-or-green — proving the fixtures
  actually constrain the logic (tests with teeth, not theatre).

## Properties

### green

> `readonly` **green**: [`GateFixture`](GateFixture.md)

Defined in: [gauntlet/src/gate.ts:385](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L385)

***

### mutation

> `readonly` **mutation**: [`GateMutation`](GateMutation.md)

Defined in: [gauntlet/src/gate.ts:386](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L386)

***

### red

> `readonly` **red**: [`GateFixture`](GateFixture.md)

Defined in: [gauntlet/src/gate.ts:384](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L384)
