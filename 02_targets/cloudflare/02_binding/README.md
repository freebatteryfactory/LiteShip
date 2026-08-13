# Cloudflare Platform Bindings

Status: specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `02_targets/cloudflare/02_binding/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Declare which platform-provided capabilities a program needs, as requirements against core's grounding vocabulary rather than as a parallel resource catalogue.

## Owns

- The binding name a program uses to reach a platform resource.
- The declared binding: name, the grounding it satisfies, and whether it is required or optional.
- The resolution: satisfied, or unsatisfied with diagnostics.

## Does not own

- A resource-kind enumeration. Core already has a word for a capability something else grounds.
- Credentials, tokens, accounts, connections, or any live handle.
- Resource provisioning. This home declares; it does not create.

## Why there is no resource-kind enumeration

A key-value namespace, a database, an object store, a durable coordinator, a connection pool — the platform provides each of these, and LiteShip already has a vocabulary for "a capability something else grounds". Adding a parallel enumeration here would mean two vocabularies for one fact, and the deployment would have to reconcile them every time the platform added a service.

A binding therefore says three things and stops: what the program calls it, which grounding it satisfies, and whether the deployment can proceed without it.

## Laws

- A binding satisfies a core grounding rather than declaring its own resource kind — no `kind`, `resource`, or `type` member exists.
- Necessity is exact on the binding carrying it: a required binding is not assignable where an optional one is expected.
- A binding holds no credential, secret, account, or connection.
- An unsatisfied binding names itself and says why.

## Proof obligations

- That every required binding was satisfied before a deployment is considered live.
- That an optional binding's absence degrades only the feature that needed it.

Assurance-and-implementation territory.

## Implementation boundary

Specified. No code exists or is authorized.
