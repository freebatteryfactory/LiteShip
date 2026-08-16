# Astro Island Preparation

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `02_targets/astro/04_island/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Translate authored activation into the web host's existing island contract, and carry the ancestry of the entry artifact that brings an island into a page.

## Owns

- The island entry: the authored activation, web's join, the produced artifact carrying it, and the exact configuration revision.
- Refusal when ancestry cannot be resolved or an activation cannot be mounted.

## Does not own

- The activation decision. Settlement is compiler meaning.
- The physical act of activation. `01_hosts/web/11_island` owns the join, the retained-update window, region membership, and the activation authority.
- Artifact identity or ancestry grammar. Ancestry lives on the produced artifact's predecessors.

## The failure this home is shaped around

A stale content-address lookup must not fall through to a degraded render with no diagnostic. Required ancestry makes that lookup failure a refusal rather than a quiet render.

Ancestry here is a required member, and its absence is a refusal rather than a quiet render.

## Laws

- The join is web's authority, not a local twin — `Equal` is invariant, so a structurally identical local declaration fails.
- This child prepares but does not activate: no `activate`, no authority, no instance, and an entry is not an activation authority.
- An island entry pins its exact configuration revision.
- An island entry binds a produced artifact and restates no artifact facts.
- Unresolved ancestry is refused out loud, with a non-empty diagnostic tuple.

## Proof obligations

- That an entry's predecessors genuinely reach the residual program.
- That a stale ancestry lookup can never render an island silently.

Assurance-and-implementation territory.

## Implementation boundary

A realization must satisfy the laws and proof obligations above through this home's declared authorities.
