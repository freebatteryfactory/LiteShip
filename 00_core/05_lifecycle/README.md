# Lifecycle and Cancellation

Status: specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `05_lifecycle/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Give every stateful LiteShip value one direct, idiomatic, exactly-once ownership and cancellation contract.

## Owns

- Lifetimes and finalizer stacks.
- Cancellation and abort projection.
- Deadlines and owned resources.
- Parent/child lifecycle composition.
- Synchronous-close and asynchronous-completion semantics.
- Aggregate disposal failure.

## Does not own

- Browser listener APIs, workers, files, sockets, databases, or other physical resources.
- Host-specific cleanup implementation.
- Garbage-collection guarantees.
- Fire-and-forget cleanup as a supported success path.

## Semantic contracts

A value that allocates long-lived state or owns a physical binding is itself disposable. It does not return a detached resource/lifetime pair that callers can accidentally separate.

Cancellation is observable through an explicit signal or requirement. Disposal begins synchronously, runs every registered finalizer exactly once in LIFO order, and returns a promise that settles after asynchronous teardown.

## Laws

- Disposal is idempotent.
- The first disposal call establishes one shared completion result.
- Synchronous finalizers run before `dispose()` returns.
- Every finalizer runs even when another fails.
- Failures aggregate in invocation order.
- Cancellation begins before finalizers run.
- Registration during active disposal joins the same disposal pass.
- Registration after settled disposal executes immediately under the documented late-registration rule.

## Operation vocabulary

- `create` allocates an owned value.
- `add` registers teardown.
- `cancel` requests cooperative cancellation where supported.
- `dispose` ends ownership exactly once.

## Proof obligations

- LIFO ordering.
- Synchronous close before asynchronous completion.
- Reentrant disposal safety.
- Late-registration behavior.
- Aggregate failure without skipped siblings.
- Parent disposal reaches every child exactly once.
- Post-dispose operations follow their explicit inert or rejected contract.

## Implementation boundary

The lifecycle contract is specified. Runtime implementation is absent. The mature old `Lifetime` behavior is a direct behavior-port candidate, subject to source and test rereading during implementation.

Porting and qualifying the old behaviour, then projecting it into each physical host resource, are implementation obligations this architecture already authorizes.

## Machine-checkable projection

```yaml
home:
  path: 00_core/05_lifecycle
  title: "Lifecycle and Cancellation"
  maturity: specified
  implementation: absent
  runtime_exports: false
  dependency_authority: source-imports
  semantic_decisions:
  - owned-value-is-disposable
  - exactly-once-lifo-disposal
  - synchronous-close-asynchronous-completion
  production_authority: false
```
