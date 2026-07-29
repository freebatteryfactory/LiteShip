[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/testing](../README.md) / HarnessContext

# Interface: HarnessContext

Defined in: core/dist/harness/pure-transform.d.ts:21

Optional metadata the compile-time driver passes to harness templates so
the generated test file can `import` the real capsule binding from its
source file. When `bindingImport` is undefined, the generator THROWS a tagged
`UnsupportedError` (wire-or-fail) rather than emitting a placeholder.

## Properties

### arbitraryDerivable?

> `readonly` `optional` **arbitraryDerivable?**: `boolean`

Defined in: core/dist/harness/pure-transform.d.ts:68

COMPILE-TIME probe result: whether `schemaToArbitrary(cap.input)`
resolves a usable arbitrary. The driver (`scripts/capsule-compile.ts`)
imports the real binding and runs the walker once, so the generated
file can be emitted in its FINAL form — a real `it(...)` block when
derivable, never a literal `it.skip(...)` placeholder that would ship
green while claiming coverage it doesn't have. `undefined` means the
driver did not probe (legacy / no binding), and the template falls
back to its self-reporting runtime branch.

***

### arbitraryImport?

> `readonly` `optional` **arbitraryImport?**: `string`

Defined in: core/dist/harness/pure-transform.d.ts:27

Import specifier for `schemaToArbitrary`, default to source path.

***

### bindingImport?

> `readonly` `optional` **bindingImport?**: `string`

Defined in: core/dist/harness/pure-transform.d.ts:23

ESM-style import specifier (with `.js` extension) for the test file.

***

### bindingName?

> `readonly` `optional` **bindingName?**: `string`

Defined in: core/dist/harness/pure-transform.d.ts:25

Exported binding name to import from `bindingImport`.

***

### cachedProjectionRealOnly?

> `readonly` `optional` **cachedProjectionRealOnly?**: `boolean`

Defined in: core/dist/harness/pure-transform.d.ts:48

COMPILE-TIME resolution for a `cachedProjection` whose binding the driver
has fully resolved: its `derive(bytes)` handler is present AND its
canonical byte fixture path is known to exist. When `true`, the harness
emits the FINAL real-only form — fixture-driven `cache-hit` / invalidation /
determinism / invariant probes with NO `it.skip` runtime-guard literals.
The random-source property test is OMITTED (not skipped): these capsules
take a Declaration-tagged `instanceOf(ArrayBuffer)` source schema that is
deliberately not arbitrary-derivable, so a random ArrayBuffer probe cannot
apply — the canonical `.wav` fixture is the source of truth instead.
`undefined`/`false` keeps the template on its self-reporting runtime branch.

***

### contentAddressImport?

> `readonly` `optional` **contentAddressImport?**: `string`

Defined in: core/dist/harness/pure-transform.d.ts:35

Import specifier (with `.js` extension) for the canonical
`contentAddressOf` primitive from `@liteship/core`'s content-address kernel.
The `cachedProjection` harness uses it as the cache KEY function for the
content-addressed `cache-hit` / invalidation probes — never a hand-rolled
hash. Defaults to the repo-relative source path when the driver omits it.

***

### contractRoundTrippable?

> `readonly` `optional` **contractRoundTrippable?**: `boolean`

Defined in: core/dist/harness/pure-transform.d.ts:95

COMPILE-TIME probe result (receiptedMutation): both the input AND output
schemas resolve a fast-check arbitrary, so the contract round-trip test
(encode→decode equality over each) can be emitted real. When false the
contract-shape check is non-emitted (a schema the walker can't sample
can't be round-tripped) rather than shipped as a green skip.

***

### decidePresent?

> `readonly` `optional` **decidePresent?**: `boolean`

Defined in: core/dist/harness/pure-transform.d.ts:127

COMPILE-TIME probe result (policyGate): the capsule exposes a typed `decide`
verdict handler. Paired with [arbitraryDerivable](#arbitraryderivable) (the SUBJECT schema)
this lets the policyGate harness emit a REAL allow/deny + reason-chain +
determinism traversal over sampled subjects; absent it the harness FAILS LOUD
(wire-or-fail) — a policyGate with no decision has nothing to drive.

***

### effectOutcomeReason?

> `readonly` `optional` **effectOutcomeReason?**: `string`

Defined in: core/dist/harness/pure-transform.d.ts:119

COMPILE-TIME probe result (receiptedMutation): the capsule declared the
TYPED `receiptKind: 'effect-outcome'` escape hatch — its receipt is the
outcome of an effect with no pure core to drive. Carries the capsule's
required `reason`. When set, the harness records this as a documented,
machine-readable EXEMPTION in the generated file (a waiver with teeth)
instead of the idempotency/audit/fault non-emission notes — never a skip.

***

### faultsDeclared?

> `readonly` `optional` **faultsDeclared?**: `boolean`

Defined in: core/dist/harness/pure-transform.d.ts:110

COMPILE-TIME probe result (receiptedMutation): the capsule declares one
or more reachable faults (`faults` table). Only then is the
fault-injection check emitted; a capsule with no declared faults has no
faults to prove reachable, so the check is non-emitted.

***

### fixturePath?

> `readonly` `optional` **fixturePath?**: `string`

Defined in: core/dist/harness/pure-transform.d.ts:57

Repo-root-relative path to a canonical source fixture (e.g. an asset
decl's `source`: `examples/scenes/intro-bed.wav`). When present,
`cachedProjection` harnesses emit fixture-based determinism/invariant
tests plus a REAL decode bench instead of a comment-only placeholder.
Resolved against `process.cwd()` at test runtime (vitest runs from the
repo root, matching the hosts' `loadAssetBytes` convention).

***

### handlersPresent?

> `readonly` `optional` **handlersPresent?**: `boolean`

Defined in: core/dist/harness/pure-transform.d.ts:76

COMPILE-TIME probe result: the kind-specific handler(s) the harness
drives are present on the real binding — `run` for `pureTransform`,
`step`+`initialState` for `stateMachine`. Paired with
[arbitraryDerivable](#arbitraryderivable) this lets the template emit only the branch
that will actually run, never an `it.skip` token.

***

### mutatePresent?

> `readonly` `optional` **mutatePresent?**: `boolean`

Defined in: core/dist/harness/pure-transform.d.ts:103

COMPILE-TIME probe result (receiptedMutation): the capsule exposes a
typed `mutate` invocation handler. Only then can the harness drive the
idempotency + audit-receipt checks for real; absent it, those two checks
are non-emitted (no runtime channel to invoke — nothing to compare or
inspect), which is justified non-emission, not a skip.

***

### preconditionMismatch?

> `readonly` `optional` **preconditionMismatch?**: `string`

Defined in: core/dist/harness/pure-transform.d.ts:87

COMPILE-TIME probe result: the schema is derivable and handlers are
present, yet the handler REJECTS structurally-conformant samples
because its true input domain is narrower than the declared schema
(e.g. a CBOR decoder typed `instanceOf(Uint8Array)` that throws on
non-canonical bytes). When set the harness emits ONE honest skip
carrying this reason rather than a false-RED test driven by inputs the
handler can't accept. This is a NON-SCHEMA cause — the fix lives in the
capsule's input schema, not the arbitrary walker.

***

### runtimeDriver?

> `readonly` `optional` **runtimeDriver?**: `object`

Defined in: core/dist/harness/pure-transform.d.ts:166

COMPILE-TIME resolution (stateMachine): a runtime-backed state machine whose
step semantics live in a BUILDER + tick handle rather than declared
`step`/`initialState` fields. Resolved by `scripts/capsule-compile.ts` from
its state-machine-driver registry — the stateMachine analogue of
[sceneDriver](#scenedriver). The builder takes a pure compiled descriptor and
returns a handle exposing `tick(dtMs)` (the transition), `currentFrame()`,
and the build-time output fields the capsule's invariants read
(`systemsRegistered`, `entitySpawnCount`). When present the harness emits a
REAL traversal: it builds the handle, checks every declared invariant over
the built output, ticks it across a random `dtMs` sequence, and proves
determinism by rebuild+replay. A capsule with neither `step`/`initialState`
NOR a registered runtime driver stays on the self-reporting skip branch.

#### builderImport

> `readonly` **builderImport**: `string`

Import specifier (with `.js`) for the builder namespace.

#### builderName

> `readonly` **builderName**: `string`

Exported builder NAMESPACE name (e.g. `SceneRuntime`) with a `build(descriptor)` method.

#### capsuleImport

> `readonly` **capsuleImport**: `string`

Import specifier (with `.js`) for the capsule binding.

#### capsuleName

> `readonly` **capsuleName**: `string`

Capsule binding name (for the invariants + premise guard).

#### compileImport

> `readonly` **compileImport**: `string`

Import specifier (with `.js`) for the compile fn.

#### compileName

> `readonly` **compileName**: `string`

Exported `() => CompiledDescriptor` (pure data) in the capsule's source module.

#### outputFields

> `readonly` **outputFields**: readonly `string`[]

Names of the numeric handle fields the capsule's invariants read off the
built output — copied off the handle into the `output` the invariants
receive. Source of truth: the capsule's invariant `check(_, output)` body.

***

### sceneDriver?

> `readonly` `optional` **sceneDriver?**: `object`

Defined in: core/dist/harness/pure-transform.d.ts:141

COMPILE-TIME resolution (sceneComposition): the concrete, `compileScene`-able
scene the harness drives through its ECS runtime, plus the import specifiers
and declared track-kind facts the generated checks need. Resolved by
`scripts/capsule-compile.ts` from its scene-driver registry — the
sceneComposition analogue of the cachedProjection fixture resolution. When
present the harness emits the 3 real UNIT-lane checks + the real BENCH-lane
budget; when absent the capsule has no tickable scene and every check is a
typed `not-applicable` exemption (never an it.skip). Typed as the
structural `SceneDriver` shape (see `scene-composition.ts`); kept as an
inline interface here to avoid a circular import between the harness
modules.

#### capsuleImport

> `readonly` **capsuleImport**: `string`

#### capsuleName

> `readonly` **capsuleName**: `string`

#### compileImport

> `readonly` **compileImport**: `string`

#### compileName

> `readonly` **compileName**: `string`

#### contentAddressImport

> `readonly` **contentAddressImport**: `string`

#### hasAudio

> `readonly` **hasAudio**: `boolean`

#### hasVideo

> `readonly` **hasVideo**: `boolean`

#### partsImport

> `readonly` **partsImport**: `string`

#### runtimeImport

> `readonly` **runtimeImport**: `string`

***

### sceneDriverNotApplicableReason?

> `readonly` `optional` **sceneDriverNotApplicableReason?**: `string`

Defined in: core/dist/harness/pure-transform.d.ts:193

COMPILE-TIME reason (sceneComposition): when no [sceneDriver](#scenedriver) was
resolved, the specific reason this capsule has no tickable scene (e.g. it is
a pre-runtime beat transform with no tracks). Surfaced into the generated
file's typed exemption note. When omitted a generic not-applicable reason is
used.

***

### siteAdapter?

> `readonly` `optional` **siteAdapter?**: `object`

Defined in: core/dist/harness/pure-transform.d.ts:204

COMPILE-TIME resolution (siteAdapter): everything the two lane-aware checks
need. Resolved by `scripts/capsule-compile.ts` — the siteAdapter analogue of
[sceneDriver](#scenedriver). The round-trip half is always real (a pure, schema-driven
`native -> CanonicalCbor -> native` content-address equality); the
host-capability half is either a real integration driver (a per-site host
probe registry) or a typed `declared-integration` coverage link. Typed inline
to avoid a circular import between the harness modules; the structural
`SiteAdapterDriver` shape lives in `site-adapter.ts`.

#### arbitraryImport

> `readonly` **arbitraryImport**: `string`

Import specifier (with `.js`) for `schemaToArbitrary`.

#### bindingImportFromIntegration

> `readonly` **bindingImportFromIntegration**: `string`

Import specifier (with `.js`) for the capsule binding, resolved relative to
the INTEGRATION file's directory (`tests/generated/integration/`), which is
one level deeper than the unit file — so its `bindingImport` differs.

#### canonicalCborImport

> `readonly` **canonicalCborImport**: `string`

Import specifier (with `.js`) for `CanonicalCbor`.

#### cborDecodeImport

> `readonly` **cborDecodeImport**: `string`

Import specifier (with `.js`) for the canonical CBOR `decode`.

#### contentAddressImport

> `readonly` **contentAddressImport**: `string`

Import specifier (with `.js`) for `contentAddressOf`.

#### hostCapability

> `readonly` **hostCapability**: `object`

Resolved host-capability disposition. The owner's rule is NO MOCKS ON THE
HOST PATH, so there is no in-process-double driver variant: the host
capability is proved by REAL-host lanes that already exist (the
`declared-integration` waiver-WITH-TEETH), or — when a declared site has no
real-host lane — recorded as an honest tracked GAP, never papered over with
a simulated host.

`declared-integration` carries one coverage LINK per covered site (a named
real-host suite FILE that exists AND references the adapter — the generated
`it()` asserts both, so the link fails RED if the proof rots), plus the GAP
set: declared sites with no real-host lane, each naming exactly what is
missing. A capsule with any gap is the honest `declared-integration-GAP`
disposition the owner must see — not a green pass.

##### hostCapability.coverage

> `readonly` **coverage**: readonly `object`[]

Coverage links: each names a REAL-host suite (repo-relative path) plus the
declared sites it proves and the runtime lane (`pnpm run` script) that
exercises it for real. The generated `it()` asserts the suite file exists
and references the adapter binding — teeth, so a deleted/renamed suite goes
RED rather than silently lying.

##### hostCapability.gaps

> `readonly` **gaps**: readonly `object`[]

Declared sites with NO real-host lane covering them — tracked gaps, NEVER
fabricated links. Each names exactly which real-host lane is missing.

##### hostCapability.kind

> `readonly` **kind**: `"declared-integration"`

#### roundTripSchema

> `readonly` **roundTripSchema**: `"input"` \| `"output"`

Which of the adapter's schemas the round-trip samples (`'input'` when its
input schema is arbitrary-derivable and concrete, else `'output'`). The
round trip proves CanonicalCbor encode/decode preserves that schema's
structure via the canonical `contentAddressOf`.
