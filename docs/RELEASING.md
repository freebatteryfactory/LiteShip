# Releasing LiteShip (`@czap/*`)

Operator vocabulary: [GLOSSARY.md](./GLOSSARY.md). LiteShip (product), CZAP (engine), `@czap/*` (packages). CLI and commands stay `czap`.

Operator checklist for public npm and GitHub releases. Run destructive git steps locally.

## Preconditions

- Release-blocking gates (for example `pnpm run gauntlet:full`) are green on the ship commit.
- Run `pnpm run package:smoke` on the ship commit. This packs every publishable
  `@czap/*` scope, installs the tarballs in a throwaway consumer, verifies export
  imports, runs the CLI, and fails if a packed manifest still contains
  `workspace:*`.
- Publish with pnpm workspace tooling only. Plain `npm publish` does not rewrite
  `workspace:*` specs for downstream consumers.
- Run `pnpm run release:notes` so `RELEASE_NOTES_v0.1.0.md` matches the canonical `## [0.1.0]` block in `CHANGELOG.md`. Do not paste the full changelog into GitHub Releases.

## Extract release notes

```bash
pnpm run release:notes
```

Create the GitHub release:

```bash
gh release create v0.1.0 --title "v0.1.0" --notes-file RELEASE_NOTES_v0.1.0.md
```

## Publish packages

Publish via `czap ship`, which mints a `ShipCapsule` for every non-private `packages/*` workspace, then hands the matching tarballs to `pnpm publish` (ADR-0011). The default (no filter) is every publishable workspace package; the publish handoff passes one `--filter <pkg>` per minted package plus `-r` so pnpm publishes exactly the set we addressed.

Dry-run first so the receipts and `pnpm publish --dry-run` outputs are both observable without uploading:

```bash
pnpm run ship -- --dry-run
pnpm run ship
```

The dry-run still writes `<pkg>-<version>.shipcapsule.cbor` next to each `<pkg>-<version>.tgz` in the package directories. Inspect either with:

```bash
pnpm run verify -- <tarball> --capsule <cbor>
```

To publish a single package (e.g. a hotfix), pass its name or path: `pnpm run ship -- --filter @czap/cli`.

## Attach ShipCapsules to the GitHub Release

After publish, attach every capsule to the GitHub release so downstream consumers can verify their npm-downloaded tarballs against a non-npm-hosted receipt:

```bash
gh release upload v0.1.0 packages/*/czap-*-0.1.0.shipcapsule.cbor
```

The `.tgz` files in `packages/*/` after ship are intermediate (npm has the canonical copy). Clean them up once the release is final:

```bash
rm -f packages/*/czap-*-0.1.0.tgz
```

## Verifying a published package (consumer side)

Anyone with the published `.tgz` and the GitHub-attached `.shipcapsule.cbor` can verify locally:

```bash
npm pack @czap/core@0.1.0   # or download the .tgz from npm directly
gh release download v0.1.0 -p 'czap-core-0.1.0.shipcapsule.cbor'
npx @czap/cli verify czap-core-0.1.0.tgz --capsule czap-core-0.1.0.shipcapsule.cbor
```

Verdicts and exit codes:

| Verdict | Exit | Meaning |
|---|---|---|
| `Verified` | 0 | Tarball manifest matches the capsule. |
| `Mismatch` | 2 | Tarball differs from the capsule. |
| `Incomplete` | 3 | Capsule is malformed or non-canonical. |
| `Unknown` | 4 | No capsule supplied — verification declined, not refused. |

## Tag

```bash
git tag v0.1.0
git push origin v0.1.0
```

Use `git push --force-with-lease` only after a coordinated history rewrite.

## Pre-public history scrub

Untracking a file does not remove old blobs. See [HISTORY_SCRUB.md](./HISTORY_SCRUB.md) for discovery, backup, and `git filter-repo` steps.

## MCP and CLI

`@czap/cli` loads `@czap/mcp-server` only for the `czap mcp` subcommand (dynamic
`import()`); add `@czap/mcp-server` when you use MCP mode. Ship matching versions
whenever you publish either package.

## v0.1.1+ — releases from GitHub Actions

The v0.1.0 publish above was a manual local run because the packages didn't
exist on npm yet (npm requires a package to exist before you can configure a
trusted publisher). From v0.1.1 onward, releases run through
`.github/workflows/release.yml`.

v0.1.x authenticated via the `NPM_TOKEN` repo secret — a granular access
token with `bypass_2fa: true`, installed into `~/.npmrc` before the
`czap ship` step. That token has been revoked. **v0.2 onward uses OIDC
trusted publishing**: the workflow carries `id-token: write`, pnpm
(>= 10.13; we pin 10.32) exchanges the GitHub Actions OIDC token for a
short-lived publish credential at publish time, and `czap ship` runs
with `--provenance` so every tarball links back to its workflow run.
There are no publish tokens anywhere — nothing to rotate, leak, or
revoke. The one remaining prerequisite is configuring a trusted
publisher per package, form values below.

### One-time trusted-publisher setup (per package, REQUIRED before v0.2)

For each of the 19 publishable packages (18 `@czap/*` + `liteship`), open
`https://www.npmjs.com/package/<name>/access` (e.g.
`https://www.npmjs.com/package/@czap/core/access`,
`https://www.npmjs.com/package/liteship/access`) and add a trusted publisher
with these exact values:

| Field | Value |
|---|---|
| Publisher | GitHub Actions |
| Organization or user | `heyoub` |
| Repository | `LiteShip` |
| Workflow filename | `release.yml` |
| Environment name | (leave blank) |

A package without a trusted publisher fails its publish with an auth
error; configure it and re-run the workflow — `czap ship` treats
already-published versions as idempotent success (`ShipSkippedReceipt`),
so partial-batch re-runs are safe. Once configured, future releases need
zero auth setup, and the dead `NPM_TOKEN` secret can be deleted from the
repo settings.

### Cutting a release

1. Bump versions in every `packages/*/package.json` to the new minor (e.g. `0.1.1`).
   Also bump the `@czap/*` dependency ranges in
   `packages/create-liteship/templates/default/package.json` — the template is
   scaffolder *data* (plain `^x.y.z` strings, not workspace specs), so the
   workspace bump does not touch it automatically.
2. Update `CHANGELOG.md` with the new release block.
3. Commit, open a PR, merge to `main`.
4. Locally on `main`:
   ```bash
   git tag -a v0.1.1 -m "v0.1.1"
   git push origin v0.1.1
   ```
5. The `Release (OIDC trusted publishing)` workflow auto-fires on the tag.
   It runs the release-certification gate (`build` / `typecheck` / `lint` /
   `test` / `package:smoke`), then idempotently ships every publishable
   package with `--provenance`, then creates the GitHub Release and
   attaches the ShipCapsules.

### Hotfix or partial publish

`workflow_dispatch` lets you run the release flow manually from the Actions
tab. Toggle `dry-run: true` to mint capsules without uploading.

### Why the release gate is slim

The release-certification job in `release.yml` runs the publishability
subset — `build` / `typecheck` / `lint` / `test` / `package:smoke` — not
`pnpm run gauntlet:full`. The full gauntlet (bench, e2e, stream-stress,
flake, redteam, bench-gate / trend / reality, runtime-seams audit, coverage
merge, flex:verify) runs on every PR and on `main` via
`.github/workflows/ci.yml`. By the time a `v*.*.*` tag is pushed, `main`
has already cleared that bar — re-running it on the tag added ~20 minutes
of CI time without adding signal, and the timing-sensitive lanes flaked
intermittently in the GHA runner under different load than the local box.
The original v0.1.1 release ate six failed runs before this split landed.
The release pipeline's job is the narrower question: *are the tarballs
publishable right now*. Whole-system regression is `ci.yml`'s job and runs
on the merge that produced the tag, not on the tag itself.

### Why provenance (future, v0.2)

`npm publish --provenance` writes a signed attestation linking the published
artifact to the GitHub Actions run that built it. Consumers (and Sentinel,
later) can verify the attestation chain end-to-end: npm signature → GHA
identity → repo commit → ShipCapsule. The TanStack worm's lesson stuck:
provenance alone isn't sufficient (the worm carried valid provenance over a
hijacked pipeline), but provenance + an independently-verifiable
content-addressed receipt (ShipCapsule on the GitHub Release) closes the
"signed poison" gap.
