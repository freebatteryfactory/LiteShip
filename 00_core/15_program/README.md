# Residual Programs, Memory Plans, and Execution Images

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `15_program/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Define one readable residual program, one backend-neutral logical memory plan, backend-specific physical layouts, packed execution images, optional bytecode sections, source maps, feature closure, and kernel commands.

## Owns

- Versioned `ResidualProgram` envelopes.
- Source, node, dependency, operation, and output tables.
- Exact runtime feature and requirement closure in the program.
- Backend-neutral `MemoryPlan` with logical planes and bounds.
- Numeric contracts and capacity policies.
- Backend-specific `MemoryLayout` envelopes.
- Backend-specific `ExecutionImage` envelopes.
- Kernel commands, source maps, feature bits, and ABI versions.
- Optional bytecode attachment under the same program authority.

## Does not own

- Authored scene, collection, evidence, or operation meaning.
- Runtime execution.
- Wasm loading, worker lifecycle, GPU device creation, or native processes.
- One byte-identical physical layout forced onto every backend.
- Bytecode as the semantic source of truth.

## Semantic and physical forms

`ResidualProgram` is the canonical inspectable representation of unresolved execution meaning.

`MemoryPlan` describes logical planes, value kinds, capacities, lifetimes, bounds, and relationships independent of one physical backend.

`MemoryLayout` chooses offsets, widths, padding, alignment, and buffer placement for one backend.

`ExecutionImage` binds one residual program, one physical layout, one backend, and its kernel commands.

Every versioned carrier composes the root `Envelope` operator. Bodies cannot shadow `_tag` or `_version`, even with otherwise compatible broad field types such as `_tag: string` or `_version: number`, and unknown versions fail closed. System assurance later verifies the source-level use of the owner operator; structural equality alone cannot prove alias provenance.

## Numeric and capacity contracts

There is no universal float width. Each plane or kernel declares exact integer, `f32`, `f64`, fixed-point, or tolerance-bounded semantics.

Standard capacity policies are:

- exact;
- bounded paged growth;
- fixed ring;
- segmented spill.

Capacity exhaustion returns a typed replan, segment, or bound failure. It never triggers an unbounded surprise allocation inside a hot transaction.

## Bytecode policy

Readable residual tables are required. Bytecode is an optional packed instruction section only when size, startup, transfer, memory, or throughput measurements justify it.

A likely useful form is a mixed image: dataflow tables plus kernel commands plus optional register-oriented bytecode for scalar residual chains. Unknown opcodes fail closed and source maps bind every instruction to the residual program.

## Laws

- Readable program and packed images have one semantic source.
- A residual program carries the compiler's `SourceRelation`, required, with no surviving optional source-map field. It previously had an optional map and no authored revision at all, so there was nothing for a map to be correlated against.
- Every image names the exact source program address.
- Logical memory meaning is separate from backend physical alignment.
- Unknown format, layout, image, or opcode versions fail closed.
- Program inputs, outputs, operations, requirements, features, and planes use typed references rather than raw names.
- Packing is deterministic under one layout policy.
- Local indices never become semantic identities.
- Optional bytecode cannot add semantic operations unavailable in the residual program.

## Operation vocabulary

- `lower` derives `ResidualProgram`.
- `planMemory` derives `MemoryPlan`.
- `layout` selects a backend physical layout.
- `pack` derives an `ExecutionImage`.
- `validate` checks versions, bounds, offsets, feature closure, and source binding.
- `inspect` reports tables, planes, requirements, source maps, and backend eligibility.

## Proof obligations

- Compatible `_tag` and `_version` shadow fixtures fail only because the root `Envelope` reserved-key guard is active.
- Source assurance verifies every versioned carrier is declared through the root `Envelope` operator rather than a hand-written equivalent.
- Readable program/reference/packed equivalence.
- Deterministic packing.
- Unknown-version and unknown-opcode refusal.
- Capacity and offset validation.
- Rust/TypeScript/Wasm/GPU layout parity where a layout is shared.
- Program/image source binding.
- Runtime feature closure contains exactly the transitive features required.
- Optional bytecode/reference parity and measured benefit.

## Implementation boundary

Program realizations must preserve semantic instructions, logical memory, image identity, numeric contracts, and bytecode policy while physical encodings and capacities remain evidence-selected.

Selecting physical layouts and capacity parameters for actual workload classes is empirical benchmarking work. This home owns no bytecode: introducing one would be an explicit architecture reopening justified by measured need against the readable interpreter and packed image, not an unstated obligation.
