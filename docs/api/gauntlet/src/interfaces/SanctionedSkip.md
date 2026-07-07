[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / SanctionedSkip

# Interface: SanctionedSkip

Defined in: [gauntlet/src/gates/skip-allowlist.ts:84](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/skip-allowlist.ts#L84)

One sanctioned skip — a `(file, site, capability, why)` record sanctioning a SPECIFIC
skip SITE, not a whole file.

The `file` is the repo-relative path the skip lives in; the `site` is the STABLE
discriminator of the exact sanctioned skip LINE within it (see [normalizeSiteLine](../functions/normalizeSiteLine.md)
— the whitespace-collapsed raw source line, line-number-independent). Only a skip whose
normalized line equals a declared `site` for its file is sanctioned; every other skip in
that file is BLOCKING. The `why` is the human justification of record, woven into the
standards surface.

## Properties

### capability

> `readonly` **capability**: `"ffmpeg-absent"` \| `"wasm-absent"` \| `"wasm-dist-staged"` \| `"shared-array-buffer-absent"` \| `"coverage-instrumentation"` \| `"astro-example-not-built"` \| `"offscreen-canvas-absent"` \| `"gpu-absent"` \| `"eacces-untestable-as-root"`

Defined in: [gauntlet/src/gates/skip-allowlist.ts:96](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/skip-allowlist.ts#L96)

The capability whose absence sanctions the skip.

***

### file

> `readonly` **file**: `string`

Defined in: [gauntlet/src/gates/skip-allowlist.ts:86](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/skip-allowlist.ts#L86)

Repo-relative path of the test file whose skip is sanctioned.

***

### site

> `readonly` **site**: `string`

Defined in: [gauntlet/src/gates/skip-allowlist.ts:94](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/skip-allowlist.ts#L94)

The SITE discriminator — the whitespace-collapsed raw source line the sanctioned
skip sits on (the capability-guard expression / test title survive there). Pins the
line's CONTENT, not its position, so re-ordering the file does not break it. Computed
via [normalizeSiteLine](../functions/normalizeSiteLine.md) from the exact sanctioned line; a guard test pins each
entry against the live source so a re-worded skip re-opens the sanction (strengthen).

***

### why

> `readonly` **why**: `string`

Defined in: [gauntlet/src/gates/skip-allowlist.ts:98](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/skip-allowlist.ts#L98)

The justification of record — why this skip is honest, not unfinished work.
