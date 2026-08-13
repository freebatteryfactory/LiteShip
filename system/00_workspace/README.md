# Workspace: Repository and Project Context

Status: architecture specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `system/00_workspace/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Answer, for every other system home, what repository this is: which revision, which top-level roots, which source homes physically exist, which toolchain is pinned, and whether the working tree matches the revision it claims.

## Owns

- Workspace identity and reference.
- Repository-relative paths and source-home names.
- The root census: how each top-level directory stands between declaration and observation.
- Source-home observation, recorded as digests.
- Source revision identity and working-tree state.
- Root metadata observation — the manifest, the pinned toolchain matrix, the compiler configuration, the lockfile.
- The workspace snapshot: one immutable coordinate for the whole repository.
- The filesystem and source-control capability holes, and the exact prerequisite row for taking a snapshot.

## Does not own

- Any compiler policy. The root owns the pinned compiler, its options, and the role matrix; `TypeScriptToolchainMatrix` is a root type and this home observes an instance of it.
- Package identity or the public export membrane. Also the root's.
- Concrete filesystem or source-control behaviour. Those are host capabilities, declared here as holes and supplied by `01_hosts/server`.
- Any judgement. A census entry saying a root is ungoverned is an observation; whether that is a defect is a gate's call in `01_assurance/01_gauntlet`.
- A second model of the repository, in any spelling.

## Observation, not authority

The governing word in this home is *observes*.

A snapshot points at the root manifest, the toolchain matrix, the physical directories, and the Git revision. It never restates their contents. The alternative was tried at scale and failed exactly the way this design predicts: a control plane grew its own picture of what the repository contained, nobody compared the two, and they disagreed for as long as it existed.

Concretely, that is why `RootMetadataObservation` holds an `Evidence<TypeScriptToolchainMatrix>` and a `compilerConfiguration` digest rather than a compiler version field. Two places that may state a version are the same defect as one place that lies.

## The root census is this session's lesson as a type

`RootCensusEntry` has three arms and one deliberate absence.

`governed` is declared and present. `reserved` is declared and not yet present — lawful, and the state `system/03_programs/` is in today; naming a home before authoring it is how the waterfall stays legible. `ungoverned` is present and declared nowhere, which is the state `verification/` and `scripts/` were in for their entire existence.

The failure that produced them was not a missing rule. `AGENTS.md` already forbade a `scripts/` directory, in prose, before either existed. The failure was that *undeclared* had no representation anywhere in the system, so the observation had nowhere to land and therefore landed nowhere. No report was ever wrong, because no report ever mentioned them.

There is no arm meaning **known and ignored**. An exemption would reintroduce precisely the state this algebra exists to expose, and an exemption list is how the previous arrangement justified itself. A law pins the arm count, so adding one is a compile error rather than a quiet widening.

## Coverage is not optional

`HomeCensusCoverage` and the `Evidence` wrapper on each observed file exist for one reason: a census that silently drops what it could not read reports a smaller repository than exists.

That is not a hypothetical. Reporting on the subset it managed to reach, and reading clean downstream, is the specific habit that let a fifty-one-entry control plane sit at the root of a repository whose entire thesis is that it describes itself.

An unreadable file is `unavailable` inside its own `Evidence`. An unenumerable directory is `partial` at the run level. Neither is ever an omission.

## Working-tree state is an algebra

`WorkingTreeState` is `clean | modified`, not a `dirty` boolean beside an optional path list.

`00_core/11_scene` already retired that shape and recorded why: a boolean beside optionals admits combinations that mean nothing — a clean tree carrying modified paths, a dirty tree carrying none. Both are representable in the boolean form and neither is a state.

The distinction is load-bearing rather than tidy. Assurance evidence acquired from a modified tree does not describe the revision it names, and a release qualified against it is qualified against nothing durable.

## The snapshot is a cut

`WorkspaceSnapshot` is to the repository what `SemanticCut` is to an addressed world, and the parallel is structural rather than poetic. Both name an exact subject, an exact revision, and the evidence population observed there. Both are exact over their identity, so two snapshots of different revisions cannot substitute. Both exist because a result reported without its coordinate cannot be reproduced or contradicted.

Every axis is a type parameter and every parameter is read by a member. A generic no member consumes is decoration that survives its own deletion — this repository has shipped that defect four times and now checks for it by hand in every exactness law.

## Laws

- A snapshot is exact over both its workspace and its revision, and the broad form does not substitute for an exact one.
- The census can represent a present-and-undeclared root, and cannot represent an exempt one.
- Working-tree state is a two-arm algebra with no `dirty` member, and its modified path population is non-empty.
- Observation requires both injected capabilities; the requirement row is an exact tuple and is not satisfiable empty.
- A source-home observation carries digests and never contents, source, or text.

## Proof obligations

Runtime and repository claims a type cannot express:

- That the recorded revision is the revision the digests were read from.
- That every physically present top-level directory appears in the census, so an ungoverned root cannot be omitted rather than reported.
- That a `clean` working tree was genuinely clean at read time, not merely clean when the check started.
- That repository-relative paths are resolved against the workspace root and no path escapes it.
- That no code path reads the filesystem or source control outside the declared capability holes.

## Implementation boundary

Architecture only. No implementation exists or is authorized.
