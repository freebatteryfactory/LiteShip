# `traceability/` — the requirements-traceability ledger (DO-178B-style)

> **Owner-redlinable location.** This directory is a single-purpose, discoverable
> requirements artifact — NOT loose repo-root junk and NOT under `docs/` (docs are
> owner-gated). It holds exactly two human-editable YAML files that a deterministic
> state machine consumes. If you want it moved, this README is the one place that
> names the location; redline here and the host reader (`packages/cli/src/lib/traceability.ts`)
> follows.

Every **system INVARIANT** the avionics tier upholds (a LAW — determinism, CRDT
convergence, content-address identity, assurance propagation, hermeticity) must be
**traced to a proving test** (or covered by an owner-signed **waiver-with-teeth**).
An untraced invariant — or one whose waiver has **expired** — is a HARD finding
(blocking at L3/L4). This is the test-honesty / bidirectional-traceability protocol:
a LAW with no proof is a hole in the safety case.

## The two files

- **`invariants.yaml`** — the requirements register. Each entry DECLARES one
  invariant: `{ id, law, level, category }`. These are SYSTEM LAWS, distinct from the
  code-style banned-pattern rules in `@czap/command`'s `INVARIANTS` (`NO_DEFAULT_EXPORT`
  &c.). Only enroll an invariant that has a REAL proving test — never fabricate a law.

- **`testing-ledger.yaml`** — the trace. Each entry maps an invariant `id` to EITHER
  one-or-more proving-test refs (`tests: [file::test-name]`) OR a `waiver`
  (`{ owner, justification, expiry }`). A waiver covers a not-yet-traced invariant;
  an expired waiver is a finding. A waiver can NEVER cover an always-blocking rule.

## How the trace is verified (the head-probe LAW)

The trace is **computed from the LIVE test headers, not hardcoded**. Each proving
test carries a `// PROVES: INV-X[, INV-Y]` header near the top. The deterministic
state machine (`packages/cli/src/lib/traceability.ts`) scans the test corpus for
these headers and folds the lifecycle:

```
DECLARED  (in invariants.yaml)
   → TRACED  (testing-ledger.yaml claims a proving test)
   → PROVEN  (the claimed test EXISTS and carries a matching PROVES header)
UNTRACED  (declared, no proof, no waiver)            → finding
WAIVED    (a non-expired waiver covers it)
   → EXPIRED  (the waiver's expiry < the wall-clock date) → finding
```

A **divergence** — a test that `PROVES` an INV absent from the ledger, or a ledger
INV whose claimed test lacks the matching header — is itself a finding (the ledger
and the tests must agree). The resolved ledger is **content-addressed** so drift is
detectable, and the **wall-clock** date for expiry is INJECTED (the two-clock law:
expiry is a calendar comparison, never `systemClock`).

The host computes these `TraceabilityFacts` and injects them into the lean
`@czap/gauntlet` engine; the `traceability-bridge` gate only FOLDS them — the same
host-injection pattern as the IR / supply-chain / mutation / simulation facts.
