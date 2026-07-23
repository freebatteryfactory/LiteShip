# LiteShip — status and verification authority

LiteShip is a pre-1.0 multimedia-native adaptive UI compiler/runtime. The public paved road is the one-package `liteship` facade; the implementation remains a 25-package directional graph with explicit semantic owners.

This file intentionally does **not** publish a fixed test count, coverage percentage, benchmark verdict, or “currently green” sentence. Those facts become stale as soon as the source head moves. A status claim is current only when its artifact names the exact source SHA and the corresponding authority completed on that same frozen head.

## Product surface

The beginner model is:

```text
defineAdaptive(...) ─▶ attrs() + plan() ─▶ explain(value)
```

- `defineAdaptive` composes the real core, quantizer, and compiler owners.
- `attrs()` and `plan()` apply one definition to host markup and compiled CSS.
- `explain(value)` reports the selected state, threshold trace, style provenance, capability tier, and content identity.

The lower-level `Boundary`, `Style`, `Quantizer`, target compilers, document graph, receipts, motion programs, and host adapters remain available through curated subpaths. The facade compresses the required ontology; it does not remove capability or create a parallel semantic system.

Migration adapters live at `liteship/migrate`. They convert supported media queries, container queries, W3C DTCG tokens, Tailwind `@theme` blocks, and CSS custom properties into ordinary LiteShip definitions. Unsupported or lossy constructs produce stable diagnostics or refusal rather than silent widening.

## Evidence policy

Every authoritative result must carry or be associated with:

- the exact Git SHA;
- the command and profile that ran;
- the checks selected and omitted;
- bounded diagnostics for failures;
- cache provenance when a cached verdict is reused;
- the host/platform where platform behavior matters.

An older artifact is historical evidence, not proof of the current branch. A registration, unit fold, skipped journey, or all-skipped profile is not proof that a public route works. Release and consumer authorities fail closed when their required environment or journey did not execute.

## Check profiles

`liteship check` and `liteship check --profile quick` are the ordinary local/app authority. The other profiles make different claims; they are not aliases for “more green.”

| Profile | Claim |
| --- | --- |
| `quick` | The current project’s app-local configuration, host route, and build-facing surface are coherent. |
| `full` | The repository is globally coherent across its registered checks. |
| `release` | The supported package, artifact, platform, and release evidence is complete. |
| `consumer` | A fresh external consumer can install packed artifacts, resolve public subpaths, typecheck, build, and execute. |
| `environment` | The local toolchain and host satisfy LiteShip’s declared prerequisites. |

Useful projections:

```bash
liteship check --plan
liteship check --profile quick --json
liteship check --profile full --json
liteship check --profile release --json
liteship check --profile consumer --json
liteship check --profile environment --json
```

The check registry at [`packages/command/src/checks/registry.ts`](./packages/command/src/checks/registry.ts) is the source of profile membership, ownership, commands, inputs, platform support, timeouts, authority, and negative controls. CLI help, CI planning, and generated check documentation project from that registry rather than maintaining independent check lists.

## Contributor first run

```bash
pnpm install
pnpm verify
```

`pnpm verify` is the first-run aggregate: environment checks, build, tests, then the quick profile. It is not the final release authority.

Local focused work should run the smallest relevant unit/property/integration proof. The CI-grade gauntlet, browser matrix, packed journeys, and hermetic release proof are intentionally reserved for a frozen implementation head or CI. See [SKILL.md](./SKILL.md#operating-hazards-workstation-safety) before running heavyweight authorities on a workstation.

## Frozen-head release proof

No merge/release claim is complete until these authorities have run against one frozen SHA:

```bash
pnpm build
pnpm typecheck
pnpm lint
pnpm lint:structural
pnpm format:check

pnpm gauntlet:full
pnpm test:e2e
liteship check --profile release
liteship check --profile consumer
liteship package-smoke --hermetic
```

The final evidence record must state which browser and platform lanes completed, distinguish advisory artifact-byte reproducibility from blocking semantic/package closure, and name any approved standards change. Do not copy an earlier count or result forward.

## Standards evidence

The standards snapshot is updated only after implementation freeze:

1. Run the standards authority against the frozen SHA.
2. Classify every reported strengthening and weakening.
3. Obtain explicit owner approval for genuine weakenings.
4. Regenerate the snapshot once.
5. Rerun the final authorities on the same source head.

A renamed file, changed metric, or stale snapshot is not automatically a weakening. A real relaxation is not owner-approved merely because a tool can write its waiver.

## Generated repository truth

These surfaces are projections, not independent authored inventories:

- package roster, dependency order, capability ownership, publish order, package surfaces, and architecture DAG;
- root facade export budget;
- command and MCP catalogs;
- check/profile documentation and CI plan;
- generated agent package context;
- public API reference.

Their owning sources and regeneration routes are indexed in [DOCS.md](./DOCS.md). Hand-editing a generated block is drift, even when the hand edit happens to be correct today.

## Current limitations and obligations

The authoritative debt/defer record is [traceability/obligations.yaml](./traceability/obligations.yaml). Source markers must reference a registered obligation; this document does not mirror that live list.

Standing product boundaries:

- LiteShip owns adaptive rendering, not routing, authentication, persistence, general RPC, or application state management.
- WebCodecs and some capture paths remain browser-capability dependent; fallbacks and refusals must stay explicit.
- Byte-identical package artifact reproduction may remain advisory while semantic package closure and offline packed-consumer execution are blocking.
- Pre-1.0 source compatibility is not preserved by default. Persisted data, wire formats, and external protocols are preserved or migrated deliberately.

## Where to inspect

- [README.md](./README.md) — product front door and first feature
- [GETTING-STARTED.md](./GETTING-STARTED.md) — install, define, apply, inspect
- [AUTHORING-MODEL.md](./AUTHORING-MODEL.md) — paved road and lower-level authoring
- [ARCHITECTURE.md](./ARCHITECTURE.md) — package topology and semantic seams
- [PACKAGE-SURFACES.md](./PACKAGE-SURFACES.md) — curated package/subpath selection
- [CONTRIBUTING.md](./CONTRIBUTING.md) — contributor commands and workflows
- [RELEASING.md](./RELEASING.md) — release procedure
- [traceability/invariants.yaml](./traceability/invariants.yaml) — invariant ownership
- [traceability/obligations.yaml](./traceability/obligations.yaml) — explicit remaining obligations

For run-specific truth, inspect the current CI run and its artifacts for the frozen head. This document defines what evidence means; it does not pretend an unrun command has passed.
