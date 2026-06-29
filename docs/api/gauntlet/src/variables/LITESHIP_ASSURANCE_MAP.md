[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / LITESHIP\_ASSURANCE\_MAP

# Variable: LITESHIP\_ASSURANCE\_MAP

> `const` **LITESHIP\_ASSURANCE\_MAP**: readonly [`LevelRule`](../interfaces/LevelRule.md)[]

Defined in: [gauntlet/src/assurance-map.ts:75](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/assurance-map.ts#L75)

LiteShip's default assurance map — ORDERED, most-specific FIRST, first match
wins, default `L1`. Owner-redlinable: the levels here are the criticality
judgement, encoded once.

**The governing principle (owner redline): AUTHORITY decides assurance, not
folder names.** A file that can BLOCK a release, WAIVE a finding, RATCHET a
floor, GENERATE code/artifacts, VERIFY integrity, DISPATCH a tool, or BRIDGE
agent authority is part of the safety case and is high-assurance even when it
lives in a tools-shaped folder — "a grader cannot be low-assurance just
because it lives in a tools folder; that's how the nervous system gets drunk
and approves its own fake IDs." Cosmetic tooling (reports, scaffolds, shell
wrappers, previews) stays L0/L1, where ambient nondeterminism is legitimate.

- **L4** — "if this lies, downstream trusts bad reality": the canonical/identity
  kernel (canonical/*, content-address + integrity-digest brands), the core
  trust spine (receipt/hlc/plan/dag/validated-output/assembly + the mixed
  brands file, conservatively whole until the Slice-C brand split), AND the
  gauntlet's own judgment core (engine/authority/waiver/gate/assurance-map/
  finding/assurance) — the grader that decides the cut IS the safety case.
- **L3** — deterministic runtime/projection/cache AND authority-bearing tooling:
  the core determinism paths (signal/zap/evaluate/gen-frame/speculative/
  token-buffer/blend/animation/boundary + ai-cast as a deterministic proposer),
  quantizer, web capture+stream, worker, astro runtime; the artifact-producing
  cores (stage dual-export/ffmpeg-encoder, remotion composition); the gauntlet
  I/O glue (runner/node-context) + its gates; the audit authority (structure/
  policy/devops-profile/integrity); the external-input + tool-dispatch +
  state-mutating boundaries (mcp http/stdio/dispatch, command dispatcher, cli
  dispatch + the mutating/verifying cli executors); and the gate/generate/
  verify SCRIPTS (the ones that exit-nonzero to fail a cut or emit artifacts).
- **L2** — public API + serialized contracts + typed external boundaries:
  index/contract/capsule, scene contract, edge manifest, the mcp protocol +
  resource descriptors, the command catalog/registry + command surfaces, the
  cli projector commands.
- **L0/L1** — cosmetic tooling: report/format/scaffold/clean/test-harness
  scripts, transport/shell wrappers, previews/examples; default L1.

NOTE (granularity): the map is file-glob granular at the AUTHORITY ENTRYPOINTS.
Helper modules a gate-script imports (scripts/lib, scripts/support) are not yet
individually raised — Slice B's call-graph-aware repo-IR will propagate level
along the call edges; until then the entrypoint level is the agreed mechanism.
