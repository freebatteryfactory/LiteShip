# Server Services

Status: specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `01_hosts/server/06_service/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Own long-lived service authority: repeatable supervised service resources with configuration addresses, phase-correct health, restart policy shape, graceful drain, and receipted stop.

## Owns

- The service instance: configuration-addressed, owning at least one identified unit of work — a service-shaped noun that owns nothing is not a service contract — health-observable (starting, ready, unhealthy, draining, stopped-with-receipt, withdrawn), drainable, owned.
- The closed restart-policy shape: never, restart, replan — no numeric constants.

## Does not own

- A universal dependency-injection container or hidden global singletons — two services are two owned resources. Background work meaning — the work a service runs is core-defined; the service owns its lifetime.

## Laws

- Health is phase-correct with its evidence.
- Restart policy is a closed shape without constants.
- A service is configuration-addressed, drainable, and owned.

## Proof obligations

- Readiness, drain, restart, and shutdown behavior match the declared lifecycle at runtime.

`system/01_assurance`; intervals and backoff are empirical.
