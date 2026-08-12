# Server Native Tools

Status: specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `01_hosts/server/07_tool/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Own native-tool provider authority: exact tool profiles with versions and determinism evidence, tool-correlated typed invocations, declared sandbox scope, cancellation, receipts, and lifecycle.

## Owns

- Content-addressed executable, configuration, and environment identity for one admitted profile.
- The tool profile: exact identity, version, determinism arm.
- Tool-correlated invocation: invoking tool A provably yields an execution of A, carrying the actual input value beside its typed contracts and a declared sandbox — never ambient scope — and yielding an actual result: a produced value with its receipt, or a failure.
- The deployment-admitted tool roster grounding.

## Does not own

- Any tool's semantic domain — what ffmpeg means to media is media's business; that it runs sandboxed with a typed contract is this home's. Process mechanics — composed from `01_process` by requirement row.

## Laws

- A tool profile names its bytes, its configuration, and its environment. The predecessor carried a name, a version string, and a two-arm determinism algebra whose arms were both empty — nothing could tell a pinned static build from whatever was on the PATH.
- Reproducibility is the core evidence grammar over this profile's own reference. There is no local determinism type.
- An invocation cannot claim another tool; invocation is tool-correlated.
- An invocation carries contracts and a declared sandbox.
- An execution is receipted and owned.

## Proof obligations

- Sandbox scopes are honored; determinism claims hold at runtime.

`system/assurance`; spawn-versus-pool crossover is empirical.

## Machine-checkable projection

```yaml
home:
  path: 01_hosts/server/07_tool
  title: "Server Native Tools"
  maturity: specified
  implementation: absent
  runtime_exports: false
  dependency_authority: source-imports
  semantic_decisions:
  - a-profile-names-its-bytes-not-just-its-name
  - reproducibility-comes-from-the-core-grammar
  - tool-correlated-invocations
  - declared-sandbox-never-ambient
  - physical-contract-not-semantic-domain
  production_authority: false
```
