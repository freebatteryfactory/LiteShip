# Architecture decision records

This directory contains Architecture Decision Records (ADRs) for LiteShip: the CZAP engine and the `@czap/*` hull they document. Each ADR captures one decision: its status, the context that forced the choice, the decision itself, its consequences, supporting evidence, and references.

ADRs are the source of truth for *why* a decision was made. The code is the source of truth for *what* the current implementation looks like.

Prose vocabulary: [../GLOSSARY.md](../GLOSSARY.md).

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

## Template

See [_template.md](./_template.md) for the canonical ADR structure.
