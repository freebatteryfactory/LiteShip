# Astro Development Evidence

Status: specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `02_targets/astro/06_development/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Own development-time inspection — watched sources, generated declarations, the codegen location — with no production authority whatsoever.

## Owns

- Admitted source paths, and the watched sources whose change invalidates evidence.
- Generated declarations: addressed, bound to a configuration revision, and naming the sources they derive from.
- Development evidence across three altitudes: fresh, stale, unavailable.

## Does not own

- Any production authority. A development output is not a produced artifact and cannot fill a slot.
- Arbitrary filesystem access. Paths are admitted, not raw.
- Server-only configuration disclosure into browser output.

## Laws

- Development output is not a produced artifact, in either direction, and carries no producer, slot, or artifact member.
- A generated declaration pins its exact configuration revision.
- A watched source is an admitted path, never a bare string.
- Stale is neither fresh nor absent: three distinct arms, and only `fresh` carries a declaration.

## Proof obligations

- That a generated declaration is regenerated when any source it names changes.
- That development evidence never outlives the dev server that produced it.

Assurance-and-implementation territory.

## Implementation boundary

Specified. No code exists or is authorized.
