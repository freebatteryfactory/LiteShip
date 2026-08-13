# Wires: Protocol and Invocation Projection

Status: umbrella architecture specified; children not yet authored; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `02_wires/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Carry an already-defined operation across a boundary and bring the answer back.

Core owns what an operation means. Hosts own the physical channel. Targets attach LiteShip to an ecosystem's build lifecycle. A wire owns the boundary itself: the translation in, the translation out, and the honest account of what can go wrong in between.

## Owns

- Wire identity and reference.
- The boundary refusal: why a request never became an invocation.
- The admission decision, exact over the operation it admits.
- The exchange: one complete boundary crossing, in three arms.
- Wire exposure, including what a wire deliberately withholds.
- The caller distinction, which carries no privilege.

## Does not own

- Operation meaning, schema meaning, policy, or authority. `00_core/07_operation` owns the definition, the invocation, the policy decision, the outcome, and the receipt; a wire projects them and declares no copies.
- The physical channel. Sockets, processes, streams, and stdio are host capabilities.
- A lifecycle taxonomy, a middleware stack, a context object, or a hook table.
- Any per-protocol payload. Those belong to the children, and the children do not exist yet.

## Three channels, because transports always collapse them

This is the claim the home exists to make.

Three genuinely different things can go wrong at a boundary:

1. **The request never became an invocation** — malformed input, or a name the catalog does not have.
2. **The invocation ran and the operation refused, failed, or was cancelled.**
3. **The operation ran and the answer did not get back.**

Every protocol in general use smears these together. That is why a 500 hides a 400, why a timeout is indistinguishable from a business refusal, and why a retry double-charges.

`01_hosts` already made this cut once and recorded why: a supplied boundary value that is malformed is neither a rejection saying no lawful plan exists, nor a failure saying a selected construction did not survive. It happened before planning ever saw the value, and it stays in its own algebra so neither compiler channel can absorb it. A wire boundary has the same shape one layer out.

### The third arm is the one that earns the algebra

`WireExchange` has `completed`, `refused`, and `undelivered`.

`refused` never reached an operation, so it carries no receipt. There is nothing to have a receipt of, and a law checks the absence.

**`undelivered` carries a receipt, because the operation ran.** This is not a failure of the operation and must never be reported as one. A caller that treats an undelivered answer as a failure and retries without the idempotency key executes it twice — and no amount of care at the call site recovers a distinction the type threw away. Core already owns `IdempotencyKey`; the wire's entire job here is to not lose it.

There is deliberately no `error` arm. An operation that refused or failed arrives as `completed` carrying a receipt that says so, because the *crossing* succeeded. Bad news is not a missing answer.

## Exposure states its complement

`WireExposure.withheld` is required and may be empty — the same shape `system/01_assurance` uses for a gate's scope, for the same reason.

A wire exposing a subset without saying so reads downstream as exposing everything. An MCP or editor wire exposing an allowed subset of system programs is ordinary and expected; an MCP wire that silently exposes fewer operations than it appears to is a security surface nobody audited. Making the complement a required member turns narrowing into an explicit edit.

`exposed` is non-empty, because a wire that projects nothing is a wire nobody can observe failing.

## The CLI wire is generic, and that is checkable

`WireCaller` distinguishes an application operation from a system program and **unlocks nothing**. Neither `WireExposure` nor `WireAdmission` nor `WireExchange` is parameterized by it, so there is no shape in which a system program travels a path an application cannot.

That absence is the point. The standard arrangement is a privileged internal engine beside a weaker public imitation, and it is precisely how the public path stops being tested — the people who would notice never use it. `verify`, `build`, `doctor`, and `ship` will cross the same CLI wire an application's own operation catalog crosses.

CLI grammar belongs to the CLI child. The root executable's bootstrap does not parse a private command language, and `system/03_programs` will not own a command engine of its own.

## Children

The initial wire families are direct, HTTP, browser, CLI, MCP, and LSP/editor. Typed model and agent stream codecs join them when a real consumer earns one.

**None of them exists yet, and this umbrella therefore declares no child roster.** For as long as no child is physically present, a roster union would be an inventory nothing can verify — the same defect as a law that cannot fail. `01_hosts` held that line while only `web/` was real, and `02_targets` only named `TargetChildRoster` once all three children existed. The roster lands here when the children do.

Children will not import one another. Two protocols that both carry an operation share the umbrella and everything upstream of it; a shape common to HTTP and browser belongs here or in core, never in a sibling edge.

## Laws

- A refused crossing carries no receipt and no invocation; an undelivered one carries a receipt.
- A wire refusal is not an operation failure: the refusal algebra has no failure arm, and the exchange has no error arm.
- Admission and exchange are exact over the operation projected, and the broad form does not substitute for an exact one.
- A wire definition carries no payload, context, hooks, handler, middleware, or schema.
- Exposure states its complement as a required member, and the caller distinction carries no payload in either arm.

## Proof obligations

Runtime claims a type cannot express:

- That an undelivered answer is retried with its original idempotency key, so the operation is not executed twice.
- That a wire never synthesizes an `OperationInvocation` for a name absent from its catalog.
- That withheld operations are genuinely unreachable through the wire, not merely undocumented.
- That a system program's crossing and an application operation's crossing execute the same code path.
- That cancellation propagates from the boundary to the operation rather than only closing the transport.

## Implementation boundary

Architecture only. No implementation exists or is authorized.

## Machine-checkable projection

```yaml
home:
  path: 02_wires
  title: "Wires: Protocol and Invocation Projection"
  maturity: umbrella-specified-children-absent
  implementation: absent
  child_homes: []
  planned_children:
  - direct
  - http
  - browser
  - cli
  - mcp
  - editor
  runtime_exports: false
  dependency_authority: source-imports
  semantic_decisions:
  - three-channels-never-collapsed
  - an-undelivered-answer-carries-its-receipt
  - a-refusal-is-not-an-operation-failure
  - no-error-arm-bad-news-is-a-completed-crossing
  - exact-over-the-operation-projected
  - a-wire-declares-no-operation-semantics
  - exposure-states-its-complement
  - the-caller-distinction-unlocks-nothing
  - no-child-roster-until-children-exist
  - no-sibling-wire-imports
  production_authority: false
```
