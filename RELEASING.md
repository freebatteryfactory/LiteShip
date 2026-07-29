# Releasing LiteShip (`@liteship/*`)

The release procedure is code, not prose: **[`.github/workflows/release.yml`](./.github/workflows/release.yml)**
is the authority for every step — certification, the pack-once immutable fleet, trusted
publishing, ShipCapsule attachment, and release notes. Read the workflow; it cannot drift
from itself.

The fleet is 25 publishable packages — the generated roster in
[`scripts/ci/publish-roster.json`](./scripts/ci/publish-roster.json) is the authority, and a
roster test pins this sentence to it.

To cut a release:

1. Get the ship commit green through the release-blocking gates (`pnpm run gauntlet:full`).
2. Tag it `vX.Y.Z` (matching every `package.json` version) and push the tag.
3. The workflow does the rest. Release notes come from the canonical `## [X.Y.Z]` block in
   [CHANGELOG.md](./CHANGELOG.md) via `pnpm run release:notes`.

Local publishing outside the workflow is not the paved road; if you must, `liteship ship`
is the single owner of the publish lifecycle — its own docs state the invariants
(pack-rewrites-`workspace:*`, npm ≥ 11.5.1 for OIDC, WASM staging).
