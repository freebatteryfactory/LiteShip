[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / crdtLawsGate

# Variable: crdtLawsGate

> `const` **crdtLawsGate**: [`Gate`](../interfaces/Gate.md)

Defined in: [gauntlet/src/gates/crdt-laws.ts:174](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/crdt-laws.ts#L174)

The CRDT-law-coverage gate — self-proves via the authority ratchet. RED: a repo
MISSING a law family's pinning file. GREEN: both families present + every marker
pinned. MUTATION: a gate that only checks file PRESENCE (ignores the markers)
passes a stub file that pins NO law — the marker-aware red fixture then goes green
under the mutant, killing it.
