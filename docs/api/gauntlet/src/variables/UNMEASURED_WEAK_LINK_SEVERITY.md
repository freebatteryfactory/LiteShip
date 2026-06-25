[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / UNMEASURED\_WEAK\_LINK\_SEVERITY

# Variable: UNMEASURED\_WEAK\_LINK\_SEVERITY

> `const` **UNMEASURED\_WEAK\_LINK\_SEVERITY**: [`Severity`](../type-aliases/Severity.md) = `'advisory'`

Defined in: [gauntlet/src/gates/proof-propagation.ts:189](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/gates/proof-propagation.ts#L189)

The severity a weak-link finding earns when the capping dependency is itself
UNMEASURED (a measurement-coverage gap, not a proven-weak link) — a quiet `advisory`
at every level (redlinable). A measured-and-weak link keeps the full
[PROOF\_SEVERITY\_BY\_LEVEL](PROOF_SEVERITY_BY_LEVEL.md) blocking severity. This is what keeps the cannon
aimed: the gate does not block a trust-spine module merely because the host has not
yet measured one of its dependencies — it surfaces that as a worklist to GO MEASURE
the dep, distinct from a dep that IS measured and IS weak (the real composition risk).
