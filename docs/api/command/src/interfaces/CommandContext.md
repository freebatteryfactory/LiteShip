[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / CommandContext

# Interface: CommandContext

Defined in: [command/src/registry.ts:47](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L47)

Injected I/O surface for command handlers. Handlers receive their Node-coupled
dependencies here rather than reaching for globals, so the registry/handler
boundary stays declarative. Extended as handlers migrate into this package.

## Properties

### cache?

> `readonly` `optional` **cache?**: `CommandCache`

Defined in: [command/src/registry.ts:218](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L218)

Content-addressed receipt cache (adapter-backed; fs on the CLI side).

***

### clock?

> `readonly` `optional` **clock?**: [`Clock`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/interfaces/Clock.md)

Defined in: [command/src/registry.ts:57](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L57)

MONOTONIC clock for measuring command DURATIONS (e.g. compile `durationMs`).
Defaults to `@liteship/core`'s `systemClock` (`performance.now`) at the call site.
Injected so a deterministic replay/test can thread a `manualClock`. This is a
DURATION boundary — never feed its reading into a `new Date()` / ISO stamp /
HLC (those are TIMESTAMPS and use the wall clock).

***

### cwd?

> `readonly` `optional` **cwd?**: `string`

Defined in: [command/src/registry.ts:49](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L49)

Working directory for path resolution; defaults to `process.cwd()` at the adapter.

***

### decodeShipCapsule?

> `readonly` `optional` **decodeShipCapsule?**: (`bytes`) => `Promise`\<\{ `id`: `ContentAddress`; `ok`: `true`; `tarballManifestAddress`: \{ `display_id`: `string`; `integrity_digest`: `string`; \}; \} \| \{ `error`: `string`; `ok`: `false`; \}\>

Defined in: [command/src/registry.ts:245](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L245)

Decode a ShipCapsule from CBOR bytes (adapter runs the Effect). Returns the
capsule id + its claimed tarball-manifest address, or a decode error string.

#### Parameters

##### bytes

`Uint8Array`

#### Returns

`Promise`\<\{ `id`: `ContentAddress`; `ok`: `true`; `tarballManifestAddress`: \{ `display_id`: `string`; `integrity_digest`: `string`; \}; \} \| \{ `error`: `string`; `ok`: `false`; \}\>

***

### fileExists?

> `readonly` `optional` **fileExists?**: (`path`) => `boolean`

Defined in: [command/src/registry.ts:190](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L190)

Does a file exist? Adapter-backed (fs). Keeps handlers free of `node:fs`.

#### Parameters

##### path

`string`

#### Returns

`boolean`

***

### hostVersion?

> `readonly` `optional` **hostVersion?**: () => `string`

Defined in: [command/src/registry.ts:72](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L72)

The host adapter's own liteship version (its package version). Supplied by the
adapter because the version is a fact about the host, not this package.

#### Returns

`string`

***

### loadAssetBytes?

> `readonly` `optional` **loadAssetBytes?**: (`assetId`, `source?`) => `ArrayBuffer` \| `null`

Defined in: [command/src/registry.ts:195](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L195)

Load an asset's raw audio bytes (the adapter resolves source conventions +
reads the file). Null when no source file is found.

#### Parameters

##### assetId

`string`

##### source?

`string`

#### Returns

`ArrayBuffer` \| `null`

***

### loadSceneModule?

> `readonly` `optional` **loadSceneModule?**: (`scenePath`) => `Promise`\<`Record`\<`string`, `unknown`\> \| `null`\>

Defined in: [command/src/registry.ts:216](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L216)

Dynamically load a user scene module (the adapter owns the dynamic import,
keeping @liteship/command free of it — relevant to the A1-T3 dynamic-import
audit). Null when the module can't be loaded.

#### Parameters

##### scenePath

`string`

#### Returns

`Promise`\<`Record`\<`string`, `unknown`\> \| `null`\>

***

### manifestPath?

> `readonly` `optional` **manifestPath?**: () => `string`

Defined in: [command/src/registry.ts:85](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L85)

The resolved capsule-manifest path the adapter looked at (the path behind
[manifestSource](#manifestsource)). Used by manifest-missing teaching errors to name
their subject; absent in pure/test contexts, where the errors degrade to
path-less wording.

#### Returns

`string`

***

### manifestSource?

> `readonly` `optional` **manifestSource?**: () => `string` \| `null`

Defined in: [command/src/registry.ts:78](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L78)

Raw capsule-manifest JSON text, or null when absent. The adapter resolves
the path (honoring LITESHIP_CAPSULE_MANIFEST) and reads it; the handler parses.
Keeps path/env policy on the adapter side.

#### Returns

`string` \| `null`

***

### readFileBytes?

> `readonly` `optional` **readFileBytes?**: (`path`) => `Uint8Array`\<`ArrayBufferLike`\> \| `null`

Defined in: [command/src/registry.ts:240](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L240)

Read a file's raw bytes (adapter-backed; fs). Null when absent/unreadable.

#### Parameters

##### path

`string`

#### Returns

`Uint8Array`\<`ArrayBufferLike`\> \| `null`

***

### recomputeTarballAddress?

> `readonly` `optional` **recomputeTarballAddress?**: (`bytes`) => `Promise`\<\{ `display_id`: `string`; `integrity_digest`: `string`; `ok`: `true`; \} \| \{ `error`: `string`; `ok`: `false`; \}\>

Defined in: [command/src/registry.ts:267](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L267)

Recompute a tarball's manifest address (adapter runs the Effect).

#### Parameters

##### bytes

`Uint8Array`

#### Returns

`Promise`\<\{ `display_id`: `string`; `integrity_digest`: `string`; `ok`: `true`; \} \| \{ `error`: `string`; `ok`: `false`; \}\>

***

### renderScene?

> `readonly` `optional` **renderScene?**: (`params`) => `Promise`\<\{ `elapsedMs`: `number`; `frameCount`: `number`; \}\>

Defined in: [command/src/registry.ts:230](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L230)

Render a scene to the output path via the host's compositor + ffmpeg
pipeline, returning frame metrics. Adapter-backed (Compositor/VideoRenderer
+ ffmpeg spawn); keeps the render backend out of @liteship/command.

#### Parameters

##### params

###### durationMs

`number`

###### fps

`number`

###### height?

`number`

Render height in pixels; the host defaults to 720 when absent.

###### output

`string`

###### width?

`number`

Render width in pixels; the host defaults to 1280 when absent.

#### Returns

`Promise`\<\{ `elapsedMs`: `number`; `frameCount`: `number`; \}\>

***

### resolveApiSymbol?

> `readonly` `optional` **resolveApiSymbol?**: (`symbol`) => [`ApiSymbolResolution`](ApiSymbolResolution.md) \| `null`

Defined in: [command/src/registry.ts:265](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L265)

Resolve an exported symbol → its owning package + source file + one-paragraph
TSDoc summary — the CLI-side api-index the `explain` command uses for its
SYMBOL arm. Adapter-backed by `@liteship/cli`'s `buildApiSymbolResolver`
(a source scan over `packages/*​/src`, cross-referenced against
`PACKAGE_METADATA_CATALOG`), INJECTED here so `@liteship/command` — and
therefore `@liteship/mcp-server` — never takes a build edge on the CLI's
repo-scanning index. Only `@liteship/cli` provides it; over MCP the capability
is absent and `explain <symbol>` degrades to an `unresolved` result (the
DIAGNOSTIC-CODE arm is data-only and works everywhere). Returns `null` when the
symbol is declared in no scanned package source.

#### Parameters

##### symbol

`string`

#### Returns

[`ApiSymbolResolution`](ApiSymbolResolution.md) \| `null`

***

### runAudioProjection?

> `readonly` `optional` **runAudioProjection?**: (`bytes`, `projection`, `assetId?`) => `Promise`\<`number`\>

Defined in: [command/src/registry.ts:206](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L206)

Run an audio projection over decoded bytes and return the marker count.
Adapter-backed by @liteship/assets — injected (not imported) so @liteship/command
does not yet take a domain-package build edge. (Heavy-tier decision: whether
command should depend on assets/scene directly, or keep injecting.)

`assetId` (supplied by the asset.analyze handler) lets the adapter honor
the asset's OWN decoder (`AssetDecl.decoder`, resolved through the asset
registry) instead of hardwiring the audio built-in.

#### Parameters

##### bytes

`ArrayBuffer`

##### projection

`"beat"` \| `"onset"` \| `"waveform"`

##### assetId?

`string`

#### Returns

`Promise`\<`number`\>

***

### runAudit?

> `readonly` `optional` **runAudit?**: (`input`) => `Promise`\<[`AuditEngineSummary`](AuditEngineSummary.md)\>

Defined in: [command/src/registry.ts:101](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L101)

Run the profile-driven audit engine (structure/integrity/surface) and return
a structured summary. Adapter-backed by `@liteship/audit`, which is INJECTED here
(not imported) so `@liteship/command` — and therefore `@liteship/mcp-server` — never
takes a build edge on the TypeScript-compiler/fast-glob audit engine. Only
`@liteship/cli` provides it; `audit` is not MCP-exposed, so the capability is
absent in the MCP context and the handler degrades to a structured failure.

#### Parameters

##### input

###### consumer?

`boolean`

###### includeFindings?

`boolean`

###### profilePath?

`string`

#### Returns

`Promise`\<[`AuditEngineSummary`](AuditEngineSummary.md)\>

***

### runAuditFloor?

> `readonly` `optional` **runAuditFloor?**: () => `Promise`\<[`AuditFloorSummary`](AuditFloorSummary.md)\>

Defined in: [command/src/registry.ts:116](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L116)

Run the audit-floor gate over the repo at `cwd`: run the artifact-independent
three-pass audit engine, collect the `rule@file` warning inventory, and diff
it against the pinned `AUDIT_WARNING_FLOOR`. Drift (added/removed warnings or
ANY error) fails the gate. Returns a structured verdict — no process.exit, no
stdout. Like [runAudit](#runaudit), it is backed by the heavy `@liteship/audit` engine,
so it is NOT provisioned in the shared host factory: only `@liteship/cli` injects
it. `audit-floor` is therefore not MCP-exposed — over MCP the capability is
absent and the handler degrades to a structured failure (capabilityUnavailable).

#### Returns

`Promise`\<[`AuditFloorSummary`](AuditFloorSummary.md)\>

***

### runCapsuleGate?

> `readonly` `optional` **runCapsuleGate?**: () => `Promise`\<[`CapsuleGateSummary`](CapsuleGateSummary.md)\>

Defined in: [command/src/registry.ts:146](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L146)

Run the capsule-corpus gate over the repo at `cwd`: read the capsule
manifest, assert every capsule's generated test+bench files exist, classify
each generated bench's honesty (real | placeholder | typed-not-applicable),
confirm mtime-suspect capsules are NOT stale by regenerating into a temp dir
and byte-comparing, then run the whole `tests/generated/` suite. Returns a
structured verdict — no process.exit, no stdout. Like [runPackageSmoke](#runpackagesmoke)
(and unlike the pure `node:fs` scans `runPlumb` / `runCheckInvariants`), the
freshness confirmation spawns `capsule:compile` and the final pass spawns
`vitest` — a terminal-streaming SUBPROCESS orchestrator. So it is NOT
provisioned in the shared host factory: only `@liteship/cli` injects it, and the
command is NOT MCP-exposed — over MCP it degrades to a structured
`capabilityUnavailable`.

#### Returns

`Promise`\<[`CapsuleGateSummary`](CapsuleGateSummary.md)\>

***

### runCheckInvariants?

> `readonly` `optional` **runCheckInvariants?**: () => `Promise`\<[`CheckInvariantsSummary`](CheckInvariantsSummary.md)\>

Defined in: [command/src/registry.ts:169](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L169)

Run the fast-lane invariant gate over the repo at `cwd`: scan `packages/**`
source for banned patterns (require / module.exports / `var` / non-sanctioned
default export / hand-parsed signal axis) and check every committed text file
matches the `.gitattributes` eol policy. Returns a structured verdict — no
process.exit, no stdout. Backed by `node:fs` + a `git ls-files --eol` probe,
so like `runPlumb` (and unlike the heavy `@liteship/audit` `runAudit` engine) it is
provisioned in the shared host factory (`createNodeCommandContext`) and is
therefore available to BOTH the CLI and the MCP host — an agent can call
`check-invariants` over MCP and read the grouped violation list.

#### Returns

`Promise`\<[`CheckInvariantsSummary`](CheckInvariantsSummary.md)\>

***

### runGauntlet?

> `readonly` `optional` **runGauntlet?**: (`globs?`) => `Promise`\<[`GauntletResult`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/engine.ts)\>

Defined in: [command/src/registry.ts:188](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L188)

Run the PURE gauntlet engine fold (`litelaunchGauntlet`) over the repo at
`cwd`, IN-PROCESS — no subprocess, no terminal streaming. Binds the built-in
LiteShip gates, the committed assurance map, and the committed waivers, runs
the authority ratchet, and returns the structured [GauntletResult](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/engine.ts)
(findings + per-gate outcomes + a single blocking verdict). This is the
tasks-vs-gates distinction made real: `check.gates` is the fixture-qualified gate
FOLD, whereas the CLI-owned `gauntlet` command spawns the full
`gauntlet:full` orchestrator. Backed by `@liteship/gauntlet`'s `node:fs` glob,
so — like `runPlumb` / `runCheckInvariants`, and unlike the heavy `@liteship/audit`
engine — it is provisioned in the shared host factory
(`createNodeCommandContext`) and is therefore available to BOTH the CLI and
the MCP host: an agent can call `check.gates` over MCP and read the Finding[] work-list.

`globs` scopes the file set (defaults to every package's source). The
adapter owns the waiver-expiry `now` — a WALL-CLOCK epoch Date, never a
monotonic reading — because waiver expiry is a calendar-date comparison.

#### Parameters

##### globs?

readonly `string`[]

#### Returns

`Promise`\<[`GauntletResult`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/engine.ts)\>

***

### runPackageSmoke?

> `readonly` `optional` **runPackageSmoke?**: () => `Promise`\<[`PackageSmokeSummary`](PackageSmokeSummary.md)\>

Defined in: [command/src/registry.ts:131](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L131)

Run the package-smoke release gate over the repo at `cwd`: `pnpm pack` every
publishable `@liteship/*` scope, install the tarballs into an isolated consumer
fixture, assert no `workspace:` protocol leaked into the packed manifests, and
import-smoke every declared module specifier (plus the `liteship` binstub).
Returns a structured pass/fail verdict — no process.exit, no stdout. Unlike
the `node:fs` scan gates (`runPlumb` / `runCheckInvariants`, host-provisioned
and MCP-exposed), this gate is a terminal-streaming SUBPROCESS orchestrator —
it spawns `pnpm pack` per package, `pnpm install`, `tar`, and `node` (minutes
of runtime, mutating a scratch tree under `os.tmpdir()`), in the same category
as `gauntlet`/`ship`. So like `runAuditFloor` it is NOT provisioned in the
shared host factory: only `@liteship/cli` injects it, and the command is NOT
MCP-exposed — over MCP it degrades to a structured `capabilityUnavailable`.

#### Returns

`Promise`\<[`PackageSmokeSummary`](PackageSmokeSummary.md)\>

***

### runPlumb?

> `readonly` `optional` **runPlumb?**: () => `Promise`\<[`PlumbGateSummary`](PlumbGateSummary.md)\>

Defined in: [command/src/registry.ts:157](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L157)

Run the plumb-completeness gate over the repo at `cwd`: scan
`tests/generated/` for `*.skip` placeholders (each is a blocking lie about
coverage) and check every published package carries a `PACKAGE_PLUMB`
classification. Returns a structured verdict — no process.exit, no stdout.
Backed by `node:fs` directory scanning, so unlike `runAudit` (the heavy
`@liteship/audit` engine) it is provisioned in the shared host factory
(`createNodeCommandContext`) and is therefore available to BOTH the CLI and
the MCP host — an agent can call `plumb` over MCP and read the work-list.

#### Returns

`Promise`\<[`PlumbGateSummary`](PlumbGateSummary.md)\>

***

### runSceneCompile?

> `readonly` `optional` **runSceneCompile?**: (`sceneModule`) => `Promise`\<`void`\>

Defined in: [command/src/registry.ts:224](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L224)

Execute a loaded scene module's compile function (the adapter runs it,
including any Effect). Keeps the `effect` runtime + arbitrary-user-code
execution out of @liteship/command. Throws on compile failure.

#### Parameters

##### sceneModule

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<`void`\>

***

### runVitest?

> `readonly` `optional` **runVitest?**: (`testFiles`) => `Promise`\<\{ `exitCode`: `number`; `stderrTail`: `string`; \}\>

Defined in: [command/src/registry.ts:90](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L90)

Run a capsule's generated test files and report the outcome. Adapters back
this with their vitest runner; handlers stay free of spawn.

#### Parameters

##### testFiles

readonly `string`[]

#### Returns

`Promise`\<\{ `exitCode`: `number`; `stderrTail`: `string`; \}\>

***

### spawnCapture?

> `readonly` `optional` **spawnCapture?**: (`command`, `args`) => `Promise`\<\{ `exitCode`: `number`; `stdout`: `string`; \}\>

Defined in: [command/src/registry.ts:64](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L64)

Capture a subprocess's stdout + exit code. Adapters back this with their
own spawn helper (e.g. @liteship/cli's `spawnArgvCapture`); handlers stay free
of `node:child_process`. Absent in pure/test contexts — handlers must
degrade gracefully (treat as "not available").

#### Parameters

##### command

`string`

##### args

readonly `string`[]

#### Returns

`Promise`\<\{ `exitCode`: `number`; `stdout`: `string`; \}\>
