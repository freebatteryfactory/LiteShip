[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [gauntlet/src](../README.md) / Gate

# Interface: Gate

Defined in: [gauntlet/src/gate.ts:566](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L566)

A gate — the registered fitness function.

## Extended by

- [`FactGate`](FactGate.md)

## Properties

### access?

> `readonly` `optional` **access?**: [`GateAccessManifest`](GateAccessManifest.md)

Defined in: [gauntlet/src/gate.ts:644](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L644)

Declared GateContext access. Built-in compositions require this manifest;
downstream legacy gates may omit it and remain uncached/conservatively
covered, but cannot enter a manifest-qualified composition unnoticed.

***

### coverage?

> `readonly` `optional` **coverage?**: (`ir`) => readonly `string`[]

Defined in: [gauntlet/src/gate.ts:606](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L606)

OPTIONAL coverage declaration (Slice B, B2 — the content-addressed cache).
Returns the [FileId](../type-aliases/FileId.md)s whose CONTENT this gate's verdict depends on, so
the verdict cache can content-key the gate against exactly those files.

SOUNDNESS RAIL: when ABSENT, the cache conservatively assumes the gate covers
ALL files in the IR (the safe floor — any repo byte change invalidates the
cached verdict). Declaring `coverage` is an OPT-IN narrowing that is sound ONLY
when the gate GENUINELY reads only the returned files: an INACCURATE
(too-narrow) coverage is a SOUNDNESS BUG — it would serve a stale cached
verdict when an uncovered dependency changed. Narrow only when the gate folds
over a provably-closed subset (e.g. only files carrying a given fact). The
default-to-all floor never has that hazard; prefer it unless the narrowing is
demonstrably exact.

Pure: derives the FileId set from the IR alone (no I/O, no clock). Only
consulted on the cache path; a run with no cache never calls it.

#### Parameters

##### ir

[`RepoIR`](RepoIR.md)

#### Returns

readonly `string`[]

***

### decide?

> `readonly` `optional` **decide?**: (`facts`) => readonly [`Finding`](Finding.md)[]

Defined in: [gauntlet/src/gate.ts:667](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L667)

(FactGate only) The bounded, DATA-ONLY decision: maps the declared FactPack to
findings with NO [GateContext](GateContext.md) access. Set by [defineFactGate](../functions/defineFactGate.md); the
synthesized [run](#run) is `decide(pickFacts(context, requires))`.

#### Parameters

##### facts

[`FactBundle`](FactBundle.md)

#### Returns

readonly [`Finding`](Finding.md)[]

***

### describe

> `readonly` **describe**: `string`

Defined in: [gauntlet/src/gate.ts:574](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L574)

One-line human description of what it checks.

***

### evidenceDigest?

> `readonly` `optional` **evidenceDigest?**: (`context`) => `string` \| `undefined`

Defined in: [gauntlet/src/gate.ts:638](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L638)

OPTIONAL out-of-IR EVIDENCE digest (the verdict-cache soundness keystone). A
gate's [coverage](#coverage) (or the default-to-all floor) captures only the bytes
IN THE IR (package source built from `auditSourceGlobs`). A gate that reads
evidence OUTSIDE the IR — the confirmer test corpus via [GateContext.allFiles](GateContext.md#allfiles)
(under `tests/`), a `benchmarks/*.json` registry / `tests/bench/*.bench.ts` via
[GateContext.readFile](GateContext.md#readfile), a ledger/snapshot, or the CONTENT of an injected
fact ([GateContext.mutation](GateContext.md#mutation) / [GateContext.supplyChain](GateContext.md#supplychain) / … whose
source bytes are an external artifact) — has evidence the coverage digest CANNOT
see. Without folding it, the cache would serve a STALE verdict when that out-of-IR
evidence changed while IR source stayed byte-identical (the soundness bug this
field cures).

Return a deterministic content digest of the EXACT out-of-IR bytes this gate's
[run](#run) reads — built from the SAME context, via [stableEvidenceDigest](../functions/stableEvidenceDigest.md)
(a `(label, bytes)` fold) for file evidence or [stableSerialize](../functions/stableSerialize.md) for an
injected fact. The digest is folded into the cache key alongside the coverage
digest, so editing the out-of-IR evidence flips the key → MISS → re-run.

A gate that reads ONLY IR files returns `undefined` (or omits this field): the
key folds the inert no-evidence marker and the gate's caching is UNCHANGED. The
digest MUST cover EXACTLY the gate's out-of-IR reads — an under-fold is the same
too-narrow-coverage SOUNDNESS BUG [coverage](#coverage) warns about (fold MORE when in
doubt: a needless MISS, never a stale serve).

Pure w.r.t. the context (no clock, no ambient I/O beyond the context's own
`readFile`/`allFiles`/injected facts). Only consulted on the cache path; a run
with no cache never calls it. The context passed is the SAME scoped context
`run` receives — `allFiles()`/`readFile` pass through level-scoping verbatim, so
the evidence the digest folds matches the evidence `run` reads.

#### Parameters

##### context

[`GateContext`](GateContext.md)

#### Returns

`string` \| `undefined`

***

### extension?

> `readonly` `optional` **extension?**: [`ExtensionGateIdentity`](ExtensionGateIdentity.md)

Defined in: [gauntlet/src/gate.ts:570](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L570)

Required when `id` uses a non-LiteShip namespace; absent on built-in gates.

***

### fixtures

> `readonly` **fixtures**: [`GateFixtures`](GateFixtures.md)

Defined in: [gauntlet/src/gate.ts:646](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L646)

The self-proof evidence — required, by construction.

***

### form?

> `readonly` `optional` **form?**: `"hosted"` \| `"fact"`

Defined in: [gauntlet/src/gate.ts:654](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L654)

The gate's EXECUTION FORM — the discriminant of the [FactGate](FactGate.md) variant. Absent
(or `'hosted'`) is the default closure gate: an arbitrary [run](#run) body that may
read anything on the [GateContext](GateContext.md). `'fact'` marks a [FactGate](FactGate.md): its
decision is DATA over a declared, host-produced FactPack, so it cannot read undeclared
evidence. Built by [defineFactGate](../functions/defineFactGate.md); never hand-set on a hosted gate.

***

### id

> `readonly` **id**: `string`

Defined in: [gauntlet/src/gate.ts:568](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L568)

Stable id; namespaces every [Finding](Finding.md) it emits (traceability).

***

### level

> `readonly` **level**: [`AssuranceLevel`](../type-aliases/AssuranceLevel.md)

Defined in: [gauntlet/src/gate.ts:572](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L572)

The assurance level this gate operates at — aims its rigor.

***

### requires?

> `readonly` `optional` **requires?**: readonly (`"skipSites"` \| `"activeSurfaceFacts"` \| `"featureEdges"` \| `"checkGovernance"`)[]

Defined in: [gauntlet/src/gate.ts:661](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L661)

(FactGate only) The fact channels this gate's decision DECLARES it consumes — the
data analogue of "what evidence does this gate read". The engine folds exactly these
channels into the cache key ([factBundleDigest](../functions/factBundleDigest.md)), so cache soundness is
STRUCTURAL (not a gate-authored [evidenceDigest](#evidencedigest) you must remember to write).

***

### run

> `readonly` **run**: (`context`) => readonly [`Finding`](Finding.md)[]

Defined in: [gauntlet/src/gate.ts:576](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L576)

The fold: produce findings for `context`. Pure w.r.t. the context.

#### Parameters

##### context

[`GateContext`](GateContext.md)

#### Returns

readonly [`Finding`](Finding.md)[]

***

### subjectCoverage?

> `readonly` `optional` **subjectCoverage?**: (`context`) => [`GateSubjectCoverage`](../type-aliases/GateSubjectCoverage.md)

Defined in: [gauntlet/src/gate.ts:587](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L587)

Enumerate the complete current-head subject population for a gate whose
claim is about discrete subjects (symbols, protocol methods, registry rows,
feature edges, ...). An opaque receipt is a qualification failure: a gate
cannot earn release authority over subjects it cannot enumerate.

Omit only when the gate is a predicate over its complete covered corpus and
therefore has no separate subject registry. This callback reads through the
same declared evidence surfaces as [run](#run); it is not a second oracle.

#### Parameters

##### context

[`GateContext`](GateContext.md)

#### Returns

[`GateSubjectCoverage`](../type-aliases/GateSubjectCoverage.md)
