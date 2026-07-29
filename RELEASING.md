# Releasing LiteShip (`@liteship/*`)

The release procedure is code, not prose: **[`.github/workflows/release.yml`](./.github/workflows/release.yml)**
is the authority for every step — certification, the pack-once immutable fleet, trusted
publishing, ShipCapsule attachment, and release notes. Read the workflow; it cannot drift
from itself. What lives in this file is only what the workflow **cannot** do: external
npm-side configuration, and the local fallback's prerequisites.

The fleet is 25 publishable packages — the generated roster in
[`scripts/ci/publish-roster.json`](./scripts/ci/publish-roster.json) is the authority, and a
roster test pins this sentence to it.

To cut a release:

1. Get the ship commit green through the release-blocking gates (`pnpm run gauntlet:full`).
2. Tag it `vX.Y.Z` (matching every `package.json` version) and push the tag.
3. The workflow does the rest. Release notes come from the canonical `## [X.Y.Z]` block in
   [CHANGELOG.md](./CHANGELOG.md) via `pnpm run release:notes`.

## One-time trusted-publisher setup (per package — npm-side, the workflow cannot do this)

Publishing authenticates via OIDC trusted publishing: the workflow carries
`id-token: write` and the npm CLI (≥ 11.5.1) exchanges the GitHub Actions OIDC token for a
short-lived publish credential. There is no `NPM_TOKEN` secret. That exchange only works if
each package's npm settings name this repo as a trusted publisher.

For every publishable package (each `@liteship/*` scope on the roster, plus `liteship` and
`create-liteship`), open `https://www.npmjs.com/package/<name>/access` and add a trusted
publisher with these exact values:

| Field | Value |
|---|---|
| Publisher | GitHub Actions |
| Organization or user | `freebatteryfactory` |
| Repository | `LiteShip` |
| Workflow filename | `release.yml` |
| Environment name | (leave blank) |

A package without a trusted publisher fails its publish with an auth error; configure it
and re-run the workflow — `liteship ship` treats already-published versions as idempotent
success, so partial-batch re-runs are safe. A **new** package added to the roster needs
this setup before its first release.

## Local release fallback (not the paved road)

`liteship ship` is the single owner of the publish lifecycle — its own docs state the
invariants (publish the tarball never the directory; npm ≥ 11.5.1 for the OIDC exchange).
Two prerequisites before running it locally:

1. `pnpm run build` — ship packs what `dist/` carries.
2. `pnpm run build:wasm` — stages the `liteship-compute` kernel into `packages/core/dist/`
   (one-time: `rustup target add wasm32-unknown-unknown`). Without it a published
   `@liteship/core` would silently run the TypeScript fallback for every consumer —
   `liteship ship` now **refuses to pack a wasm-less core** rather than publish that
   degradation.
