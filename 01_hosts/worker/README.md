# Worker: The Isolated-Execution Host

Status: architecture specified across seven homes; implementation absent and unauthorized

Authority: This README for worker-wide meaning and proof obligations; `types.ts` for the topology; each numbered home's `README.md` and `types.ts` for local authority

Source home: `01_hosts/worker/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Make local computation, transfer of ownership, shared memory, bounded queues, and worker-local residual execution real inside one isolated realm — without creating a second semantic runtime. Worker realizes upstream meaning; it never reinterprets it.

## The realm contract

Worker models a **single-bootstrap isolated execution session**: an explicit parent boundary, one invocation bootstrap envelope, exact realm-local facilities, and admitted communication endpoints. The contract is not tied to one constructor name — a browser dedicated worker and a server worker thread satisfy it only through separate exact offers pinning their real facilities and lifecycle. Compatibility is never inferred because both are called workers. Shared workers, service workers, and worklets have materially different multi-client, network-interception, or realtime authority; they must earn separate profiles or future homes, and audio-worklet behavior already composes through web media's clock contract.

## Construction versus entry

The parent realm (web today, server later) owns the physical construction facility, and the target owns the generated module or URL artifact. This realm owns everything after entry: raw isolated-realm globals stay beneath `00_bootstrap`, the bootstrap envelope is admitted rather than trusted, and every capability above the boundary is a narrow admitted authority. Parent-requested termination is a fact this realm observes; graceful close is the one exit it authors.

## Topology

Seven numbered homes in dependency order, each one distinct physical authority:

| Home | Authority | Status |
| --- | --- | --- |
| `00_bootstrap` | Raw-global capture, envelope admission, placement pins | specified |
| `01_instance` | The live realm: lifecycle, readiness, crash, close | specified |
| `02_message` | Channels, endpoints, typed envelopes, bounded flow | specified |
| `03_transfer` | Copy/move/share custody, tickets, receipts, detachment | specified |
| `04_memory` | Shared buffers, addressed layouts, role-granted views | physical profiles deferred |
| `05_queue` | SPSC bounded queues, batches, stale rejection | physical profiles deferred |
| `06_execution` | Worker-local realization of the core executor | physical profiles deferred |

Conditional graphics and media homes are deliberately absent: no worker-physical graphics or codec authority has yet proven a distinct need. If one does, it arrives as a new home with its own denominator — never as a silent extension of an existing one.

## The capability composition

Six grounding slots enter the worker boundary — realm scope, bootstrap envelope, message facility, transfer facility, shared-memory facility, scheduling facility — each pinned to its allowed origin, exact custody, and exact identity. Five offers construct everything else — messaging authority, transfer authority, shared-memory authority, queue authority, execution host — each a `WorkerRealizationOffer` structurally unable to advertise another realm, a webgpu/server/host-native backend, or a settlement location outside local and live. Eleven pinned capability declarations in all. Channels, tickets, buffers, views, queues, and execution sessions are repeatable per-use resources from their providers with their own identity and lifecycle — never requirement holes. `WorkerCapabilityTopology` composes the exact population with population laws on both sides and carries its erased catalog, whose faithful derivation is a `system/assurance` obligation.

## Does not own

Residual-program meaning, compiler placement, settlement semantics, operation/schema/scene/stream/evidence-truth meaning — all core. Browser DOM, regions, events, sinks, and the Worker constructor — web. Request/response behavior — edge. Filesystem, processes, secrets, databases, native tools — server. Target-generated worker URLs, virtual modules, manifests, bundles — targets. And never: a copied compositor or evaluator embedded in a source string, a second `RuntimeExecutor` or `RuntimeCommit`, a broad worker-global context, or an isolation claim treated as a security authority — any privilege claim is stated by the selected realization and proved separately.

## Laws

- Raw realm globals beneath bootstrap; narrow admitted capabilities above it.
- One envelope enters; program, catalog, and generation arrive together or not at all.
- A transfer list changes lawful custody; a moved resource detaches its sender.
- A view is granted on one exact buffer with one exact role.
- One producer, one consumer per queue; stale batches are refused by generation.
- Every live worker resource is owned and disposed exactly once.
- The executor is core's; results leave as a `RuntimeCommit` on a named channel.

## Proof obligations

- No ambient realm read exists outside the bootstrap.
- Sender custody actually changes after a move; runtime detachment is honored.
- Physical layout bytes agree with the addressed layout contract; SPSC role exclusivity and atomic-order correctness hold.
- Every target-generated worker artifact enters through the canonical bootstrap.
- Parity against the reference backend on the shipping path; end-to-end cost counts startup, transfer, synchronization, commit, and disposal.

The first four are `system/assurance`; the last is the implementation-gate protocol. Batch sizes, capacities, padding, wait policy, startup thresholds, and crossovers are empirical lanes.

## Implementation boundary

The complete worker architecture is specified. Every implementation — worker spawn, message loop, ring buffer, transfer, execution — is absent and unauthorized until the whole repository architecture closes and Eassa explicitly authorizes implementation.

## Machine-checkable projection

```yaml
home:
  path: 01_hosts/worker
  title: "Worker: The Isolated-Execution Host"
  maturity: architecture-specified
  implementation: absent
  child_homes: 7
  runtime_exports: false
  dependency_authority: source-imports
  semantic_decisions:
  - single-bootstrap-isolated-session-contract
  - construction-is-parent-side-entry-is-realm-side
  - raw-globals-beneath-bootstrap
  - custody-modes-are-copy-move-share
  - one-producer-one-consumer-per-queue
  - executor-is-core-owned-results-leave-as-commits
  - no-worker-family-union-profiles-earn-themselves
  production_authority: false
```
