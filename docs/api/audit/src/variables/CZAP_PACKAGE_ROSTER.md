[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / CZAP\_PACKAGE\_ROSTER

# Variable: CZAP\_PACKAGE\_ROSTER

> `const` **CZAP\_PACKAGE\_ROSTER**: readonly `string`[]

Defined in: [audit/src/consumer.ts:46](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/consumer.ts#L46)

The canonical dependency-ordered roster of publishable `@czap/*` packages —
the SINGLE anchor every fleet drift-guard re-anchors to.

Scar S0.4 (docs/plan/scar-ledger.md — *one truth, many private parsers*): the
fleet roster was hand-copied into five places (liteship's `LITESHIP_PACKAGES`,
the cli package-metadata catalog, command's package-smoke `PACKAGES`, the
repo-truths `packageRoster()` accessor, and `.github/workflows/release.yml`),
each drifting independently. This export is the anchor those copies pin
against: `tests/support/repo-truths.ts` (`packageRoster()`) currently DERIVES
the fleet from the on-disk publishable set because this export did not exist —
that delegation note retires here.

Membership is exactly the on-disk non-private `@czap/*` set (proven by the
owner test against `packageRoster()`); the ORDER is authored — the runtime
dependency (install) order, identical to `scripts/gen-roster.ts`'s
`CANONICAL_ROSTER` and liteship's tarball-shipped `LITESHIP_PACKAGES` mirror
(ADR-0010 model: authored order, derived membership). The two non-`@czap`
publishable umbrellas (`create-liteship`, `liteship`) are NOT here — they
carry the whole fleet as deps and publish last; this is the scoped fleet only.
