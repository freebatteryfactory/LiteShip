# ADR-0044 — LiteShip brand consolidation (one brand, `@czap` retired)

**Status:** Accepted
**Date:** 2026-07-19

## Context

The project carried three names for one thing. **LiteShip** was the product and
distribution name; **CZAP** (Content-Zoned Adaptive Projection) was the engine
name used in architecture prose and ADRs; **`@czap/*`** was the npm scope every
package published under, and `data-czap-*` / `CZAP_*` were the wire prefix and
identifier stems threaded through the runtime.

Three brands for one artifact is an ontology tax. Every contributor — and every
reader of the docs — had to learn which of the three names applied in which
register, and keep the mapping straight in prose, in imports, in wire attributes,
and in environment variables. The split bought nothing: there is no separable
"engine" product shipped apart from LiteShip, no consumer who installs `@czap/*`
without adopting LiteShip, and no surface where the CZAP name did work the
LiteShip name could not. The user's ruling was radical ergonomics — collapse the
three into one, accept the one-time churn, and let the structure carry a single
name.

The retirement is cheap precisely because it happens now: the packages are
pre-1.0 with zero external consumers, so there is no published-API compatibility
obligation and no downstream install to break.

## Decision

Consolidate to **one brand: LiteShip** — product, distribution, engine, and
architecture all share the single name. Rename wholesale, with **no compatibility
aliases** (old spellings die):

- **npm scope:** `@czap/*` → `@liteship/*` across every package name, dependency
  key, and import specifier.
- **Wire protocol:** the `data-czap-*` DOM attribute prefix → `data-liteship-*`;
  `czap:<name>` event / id strings → `liteship:<name>`.
- **Identifiers:** `CZAP_*` env vars, window globals, and exported consts →
  `LITESHIP_*`; `Czap*` / `czap*` identifier fragments → `Liteship*` / `liteship*`.
- **CLI + config:** the `czap` bin → `liteship`; `czap.config.ts` →
  `liteship.config.ts`; the `.czap/` scratch dir → `.liteship/`.
- **Module / CSS / diagnostic namespaces:** `virtual:czap/*` → `virtual:liteship/*`;
  the `--czap-*` CSS custom-property prefix → `--liteship-*`; `czap/*` diagnostic
  source ids → `liteship/*`; the `crates/czap-compute` Rust crate →
  `crates/liteship-compute`.

The `@czap` scope, the `data-czap-*` prefix, and `CZAP_*` identifiers are retired
wholesale. The three-layer naming table in the glossary collapses to two layers
(**LiteShip** and the `@liteship/*` npm namespace); the "CZAP" engine-name entry
is deleted from both `GLOSSARY.md` and the `liteship glossary` catalog.

## Consequences

- One name to learn and one register to keep straight: LiteShip in prose, ADRs,
  and product surface; `@liteship/*` in install lines and imports.
- A **permanent brand-residue gate** (`tests/unit/meta/brand-residue.test.ts`)
  scans the repo for any `/czap/i` residue and reds on a reintroduction, so the
  old brand cannot creep back in through a new file or a copy-pasted snippet.
- Historical records are preserved, not rewritten: the immutable ADRs under
  `docs/adr/**` and the planning records under `docs/plan/**` keep their original
  `@czap` spellings as the audit trail; the frozen `traceability/effect-shed-receipt.json`
  and `CHANGELOG.md` likewise. These paths are the explicit allowlist of the
  residue gate.
- Exactly one sanctioned present-tense sentence records the retirement in
  `ARCHITECTURE.md`; the residue gate matches it literally and fails if it is
  duplicated anywhere else.
- The rename is a one-time cost with no runtime behavior change: content addresses
  that fold brand strings (test vectors, MCP projection digests) re-pin to their
  new values through their sanctioned update paths, but no algorithm changed.

## Evidence

- `tests/unit/meta/brand-residue.test.ts` — the permanent gate; green at zero
  residue outside the allowlist.
- `ARCHITECTURE.md` — the single sanctioned historical sentence.
- `GLOSSARY.md` two-layer naming table + `packages/command/src/commands/glossary.ts`
  `GLOSSARY_ENTRIES` (the deleted CZAP entry, lockstep with the drift test).
- `scripts/gen-roster.ts` / `scripts/ci/publish-roster.json` — the `@liteship/*`
  package roster, regenerated.

## Rejected alternatives

- **Keep CZAP as the engine name, rename only the npm scope.** Rejected: it leaves
  two of the three names standing and preserves the register-mapping tax the
  consolidation exists to remove.
- **Ship `@czap/*` → `@liteship/*` compatibility aliases (deprecated re-exports).**
  Rejected: pre-1.0 with zero external consumers, an alias layer is pure carrying
  cost with no consumer to protect; the whole point is that old spellings die.
- **Do the rename mechanically but leave "CZAP engine" in narrative prose.**
  Rejected: a half-consolidated brand is worse than either whole — readers still
  meet CZAP in the docs while it is gone from the code. One brand means one brand.

## References

- `tests/unit/meta/brand-residue.test.ts` — the residue gate.
- ADR-0001 — the `@…/*` namespace object pattern the scope rename preserves.
- `ARCHITECTURE.md` — the sanctioned retirement sentence.
- `GLOSSARY.md`, `packages/command/src/commands/glossary.ts` — the naming layers.
