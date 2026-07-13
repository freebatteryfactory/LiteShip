# Architecture decision records

This directory contains Architecture Decision Records (ADRs) for LiteShip: the CZAP engine and the `@czap/*` hull they document. Each ADR captures one decision: its status, the context that forced the choice, the decision itself, its consequences, supporting evidence, and references.

ADRs are the source of truth for *why* a decision was made. The code is the source of truth for *what* the current implementation looks like.

Prose vocabulary: [../GLOSSARY.md](../../GLOSSARY.md).

## Index

| ADR | Title | Status |
|---|---|---|
| [0001](./0001-namespace-pattern.md) | Namespace object pattern + branded types | Accepted |
| [0002](./0002-zero-alloc.md) | Zero-allocation hot path discipline | Accepted |
| [0003](./0003-content-addressing.md) | Content addressing via FNV-1a + CBOR | Accepted |
| [0004](./0004-plan-coordinator.md) | Plan IR vs RuntimeCoordinator split | Accepted |
| [0005](./0005-effect-boundary.md) | Effect boundary rules | Accepted |
| [0006](./0006-compiler-dispatch.md) | Compiler dispatch tagged union | Accepted |
| [0007](./0007-adapter-vs-peer-framing.md) | Adapter vs peer framing (Remotion/Edge) | Accepted |
| [0008](./0008-capsule-assembly-catalog.md) | Capsule assembly catalog (7 arms + closure rule) | Accepted |
| [0009](./0009-ecs-scene-composition.md) | ECS as scene composition substrate | Accepted |
| [0010](./0010-spine-canonical-type-source.md) | Spine as canonical type source | Accepted |
| [0011](./0011-ship-capsule.md) | Ship capsule (addressed digest + release input manifest) | Accepted |
| [0012](./0012-devops-profile-boundary.md) | DevopsProfile boundary (reusable seam vs repo-local contracts) | Accepted |
| [0013](./0013-canonical-package.md) | `@czap/canonical` self-contained bytes kernel | Accepted |
| [0014](./0014-genui-catalog.md) | `@czap/genui` closed catalog renderer | Accepted |
| [0015](./0015-document-graph-ir.md) | Document graph IR + AI cast envelope | Accepted |
| [0016](./0016-signal-vocabulary.md) | Unified signal vocabulary (SignalSource source of truth) | Accepted |
| [0017](./0017-cache-content-version.md) | Conditional cache: content-version beyond the boundary address | Accepted |
| [0018](./0018-cap-axes-attribute-contract.md) | CAP_AXES capability-attribute contract | Accepted |
| [0019](./0019-factgate-evidence-bound-gates.md) | FactGate: evidence-bound gate definitions | Accepted |
| [0020](./0020-document-graph-runtime.md) | DocumentGraph runtime lifecycle | Accepted |
| [0021](./0021-scene-live-bridge.md) | Scene → live bridge (discrete crossing vs continuous tween) | Accepted |
| [0022](./0022-ai-apply-seam.md) | AI-apply seam: the un-bypassable validate→apply token witness | Accepted |
| [0023](./0023-gauntlet-rigor-engine.md) | The gauntlet: self-proving rigor engine + authority model | Accepted |
| [0024](./0024-fetch-layer-edge-adaptation.md) | Fetch layer: request-time adaptation in front of Astro | Accepted |
| [0025](./0025-workers-static-assets-boundary-css.md) | Workers Static Assets for boundary CSS | Accepted |
| [0026](./0026-dag-compaction.md) | Receipt-DAG compaction via checkpoint reclamation | Accepted |
| [0027](./0027-cell-value-dom-boundary.md) | Reactive primitives are value→wire, never value→DOM | Accepted |
| [0028](./0028-plain-element-directive-scanner.md) | DIRECTIVE_ATTRIBUTE_REGISTRY: directives boot on plain elements | Accepted |
| [0029](./0029-wgsl-uniform-buffer-layout.md) | WGSL uniform buffer layout is declaration-derived, not a fixed scalar block | Accepted |
| [0030](./0030-client-server-mutation-channel.md) | Client→server graph-mutation channel (the return leg) | Accepted |
| [0031](./0031-form-mutation-binding-primitive.md) | Mutation clients and form bindings are rigging, not components | Accepted |
| [0032](./0032-morph-opaque-subtrees.md) | Morph-opaque subtrees are diff-isolated, not trust-exempt | Accepted |
| [0033](./0033-standard-schema-interop.md) | DocumentGraphNodeSchema carries Standard Schema V1 | Accepted |
| 0034 | *(reserved — QUERY write-sink-unreachability gate; not yet written)* | Proposed |
| [0035](./0035-motion-is-intent-not-target.md) | Motion is an authored intent, not a projection target | Accepted |
| [0036](./0036-audit-findings-stream-contract.md) | `audit --findings` stdout/stderr stream contract | Accepted |
| [0037](./0037-audit-consumer-structure-suppression.md) | `audit --consumer` structure-pass suppression | Accepted |
| [0038](./0038-typedoc-monolith-canonical.md) | TypeDoc monolith build is canonical | Accepted |
| [0039](./0039-multi-transition-algebra.md) | A routing LABEL becomes a transition PROGRAM | Accepted |

## Template

See [_template.md](./_template.md) for the canonical ADR structure.
