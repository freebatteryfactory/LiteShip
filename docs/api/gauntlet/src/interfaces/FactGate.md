[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / FactGate

# Interface: FactGate

Defined in: [gauntlet/src/gate.ts:1078](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L1078)

A FACT GATE — the "gate-as-data" variant (the FactGate PoC). It replaces the arbitrary
[Gate.run](Gate.md#run) closure with two data-shaped halves: a DECLARATION of which host-produced
FactPacks it consumes ([requires](#requires)) and a bounded, context-free [decide](#decide) over
exactly those facts. [defineFactGate](../functions/defineFactGate.md) synthesizes the [Gate.run](Gate.md#run) +
[Gate.evidenceDigest](Gate.md#evidencedigest) the engine dispatches, so a FactGate is structurally a
[Gate](Gate.md) (no engine/authority/cache changes) while its AUTHOR surface physically
cannot read undeclared evidence — there is no `run(context)` body to smuggle a read in.

## Extends

- [`Gate`](Gate.md)

## Properties

### access

> `readonly` **access**: [`GateAccessManifest`](GateAccessManifest.md)

Defined in: [gauntlet/src/gate.ts:1082](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L1082)

Declared GateContext access. Built-in compositions require this manifest;
downstream legacy gates may omit it and remain uncached/conservatively
covered, but cannot enter a manifest-qualified composition unnoticed.

#### Overrides

[`Gate`](Gate.md).[`access`](Gate.md#access)

***

### coverage?

> `readonly` `optional` **coverage?**: (`ir`) => readonly `string`[]

Defined in: [gauntlet/src/gate.ts:605](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L605)

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

#### Inherited from

[`Gate`](Gate.md).[`coverage`](Gate.md#coverage)

***

### decide

> `readonly` **decide**: (`facts`) => readonly [`Finding`](Finding.md)[]

Defined in: [gauntlet/src/gate.ts:1081](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L1081)

(FactGate only) The bounded, DATA-ONLY decision: maps the declared FactPack to
findings with NO [GateContext](GateContext.md) access. Set by [defineFactGate](../functions/defineFactGate.md); the
synthesized [run](Gate.md#run) is `decide(pickFacts(context, requires))`.

#### Parameters

##### facts

[`FactBundle`](FactBundle.md)

#### Returns

readonly [`Finding`](Finding.md)[]

#### Overrides

[`Gate`](Gate.md).[`decide`](Gate.md#decide)

***

### describe

> `readonly` **describe**: `string`

Defined in: [gauntlet/src/gate.ts:573](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L573)

One-line human description of what it checks.

#### Inherited from

[`Gate`](Gate.md).[`describe`](Gate.md#describe)

***

### evidenceDigest?

> `readonly` `optional` **evidenceDigest?**: (`context`) => `string` \| `undefined`

Defined in: [gauntlet/src/gate.ts:637](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L637)

OPTIONAL out-of-IR EVIDENCE digest (the verdict-cache soundness keystone). A
gate's [coverage](Gate.md#coverage) (or the default-to-all floor) captures only the bytes
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
[run](Gate.md#run) reads — built from the SAME context, via [stableEvidenceDigest](../functions/stableEvidenceDigest.md)
(a `(label, bytes)` fold) for file evidence or [stableSerialize](../functions/stableSerialize.md) for an
injected fact. The digest is folded into the cache key alongside the coverage
digest, so editing the out-of-IR evidence flips the key → MISS → re-run.

A gate that reads ONLY IR files returns `undefined` (or omits this field): the
key folds the inert no-evidence marker and the gate's caching is UNCHANGED. The
digest MUST cover EXACTLY the gate's out-of-IR reads — an under-fold is the same
too-narrow-coverage SOUNDNESS BUG [coverage](Gate.md#coverage) warns about (fold MORE when in
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

#### Inherited from

[`Gate`](Gate.md).[`evidenceDigest`](Gate.md#evidencedigest)

***

### extension?

> `readonly` `optional` **extension?**: [`ExtensionGateIdentity`](ExtensionGateIdentity.md)

Defined in: [gauntlet/src/gate.ts:569](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L569)

Required when `id` uses a non-LiteShip namespace; absent on built-in gates.

#### Inherited from

[`Gate`](Gate.md).[`extension`](Gate.md#extension)

***

### fixtures

> `readonly` **fixtures**: [`GateFixtures`](GateFixtures.md)

Defined in: [gauntlet/src/gate.ts:645](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L645)

The self-proof evidence — required, by construction.

#### Inherited from

[`Gate`](Gate.md).[`fixtures`](Gate.md#fixtures)

***

### form

> `readonly` **form**: `"fact"`

Defined in: [gauntlet/src/gate.ts:1079](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L1079)

The gate's EXECUTION FORM — the discriminant of the FactGate variant. Absent
(or `'hosted'`) is the default closure gate: an arbitrary [run](Gate.md#run) body that may
read anything on the [GateContext](GateContext.md). `'fact'` marks a FactGate: its
decision is DATA over a declared, host-produced FactPack, so it cannot read undeclared
evidence. Built by [defineFactGate](../functions/defineFactGate.md); never hand-set on a hosted gate.

#### Overrides

[`Gate`](Gate.md).[`form`](Gate.md#form)

***

### id

> `readonly` **id**: `string`

Defined in: [gauntlet/src/gate.ts:567](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L567)

Stable id; namespaces every [Finding](Finding.md) it emits (traceability).

#### Inherited from

[`Gate`](Gate.md).[`id`](Gate.md#id)

***

### level

> `readonly` **level**: [`AssuranceLevel`](../type-aliases/AssuranceLevel.md)

Defined in: [gauntlet/src/gate.ts:571](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L571)

The assurance level this gate operates at — aims its rigor.

#### Inherited from

[`Gate`](Gate.md).[`level`](Gate.md#level)

***

### requires

> `readonly` **requires**: readonly (`"skipSites"` \| `"activeSurfaceFacts"` \| `"featureEdges"` \| `"checkGovernance"`)[]

Defined in: [gauntlet/src/gate.ts:1080](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L1080)

(FactGate only) The fact channels this gate's decision DECLARES it consumes — the
data analogue of "what evidence does this gate read". The engine folds exactly these
channels into the cache key ([factBundleDigest](../functions/factBundleDigest.md)), so cache soundness is
STRUCTURAL (not a gate-authored [evidenceDigest](Gate.md#evidencedigest) you must remember to write).

#### Overrides

[`Gate`](Gate.md).[`requires`](Gate.md#requires)

***

### run

> `readonly` **run**: (`context`) => readonly [`Finding`](Finding.md)[]

Defined in: [gauntlet/src/gate.ts:575](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L575)

The fold: produce findings for `context`. Pure w.r.t. the context.

#### Parameters

##### context

[`GateContext`](GateContext.md)

#### Returns

readonly [`Finding`](Finding.md)[]

#### Inherited from

[`Gate`](Gate.md).[`run`](Gate.md#run)

***

### subjectCoverage?

> `readonly` `optional` **subjectCoverage?**: (`context`) => [`GateSubjectCoverage`](../type-aliases/GateSubjectCoverage.md)

Defined in: [gauntlet/src/gate.ts:586](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L586)

Enumerate the complete current-head subject population for a gate whose
claim is about discrete subjects (symbols, protocol methods, registry rows,
feature edges, ...). An opaque receipt is a qualification failure: a gate
cannot earn release authority over subjects it cannot enumerate.

Omit only when the gate is a predicate over its complete covered corpus and
therefore has no separate subject registry. This callback reads through the
same declared evidence surfaces as [run](Gate.md#run); it is not a second oracle.

#### Parameters

##### context

[`GateContext`](GateContext.md)

#### Returns

[`GateSubjectCoverage`](../type-aliases/GateSubjectCoverage.md)

#### Inherited from

[`Gate`](Gate.md).[`subjectCoverage`](Gate.md#subjectcoverage)
