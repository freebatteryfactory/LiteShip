# Edge: The Request-Time Host

Authority: This README for edge-wide meaning and proof obligations; `types.ts` for the topology; each numbered home's `README.md` and `types.ts` for local authority

Source home: `01_hosts/edge/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Make one constrained request invocation real: request admission, request evidence, fail-closed policy, request-time realization of core's settlement decisions, outbound network, cache, deployment storage, request-scoped execution and operation handling, response commitment, and bounded deferred work. Edge realizes upstream meaning; it never reinterprets it.

## The realm contract

Edge models **one request invocation plus deployment-scoped physical providers** whose availability and lifecycle are explicitly admitted. It assumes no process permanence, no arbitrary OS access, and no stable in-memory singleton across invocations. Durable services, queues, and stores are exact deployment-backed offers, never ambient properties of every edge realm.

Edge may be a **full authoritative realization site**: when the selected plan lawfully supplies exact authenticated authority, handler, storage, network, and policy requirements, an operation executes here without bouncing through server. The realm name grants nothing and denies nothing — authority comes from exact capabilities. Edge remains request-scoped and capability-bounded; it never becomes a general long-lived application server.

## Topology

Eleven numbered homes in dependency order:

| Home | Authority | Status |
| --- | --- | --- |
| `00_bootstrap` | Invocation and deployment admission, placement pins | specified |
| `01_request` | The admitted incoming request, one-shot body | specified |
| `02_evidence` | Request-time evidence producers (Client Hints et al.) | specified |
| `03_policy` | Fail-closed origin/credential/redirect/isolation/partition policy | specified |
| `04_settlement` | Physical realization of core's request-time decisions | specified |
| `05_network` | Outbound connections, decoder-correlated, policy-bound | physical profiles deferred |
| `06_cache` | Canonical keys, declared variation, private partitions | physical profiles deferred |
| `07_storage` | Deployment-bound realization of exact core store ports | provisional |
| `08_execution` | Request-scoped core executor + exact operation handlers | physical profiles deferred |
| `09_response` | One plan, one commit authority, one committed response | specified |
| `10_deferred` | Bounded invocation-descended post-response work | specified |

## The capability composition

Grounding slots cover invocation, deployment configuration, request, hints, response policy, network, cache, storage, execution, response, and deferred facilities, each pinned to its allowed origin, custody, and identity. Offers construct request-evidence, settlement, network, cache, store, execution, response-commit, and deferred-work authorities, each structurally unable to advertise another realm, a backend beyond JavaScript and Wasm, or a settlement location other than `request`. Requests, connections, cache entries, handlers, and deferred tasks are per-use resources. `EdgeCapabilityTopology` composes the exact population and its erased catalog.

## Does not own

DOM and browser events — web. Worker execution semantics — worker. Filesystem, arbitrary processes, native tools, long-lived services — server. Schema, operation, stream, state, scene, media, compiler meaning — core. The HTTP wire projection — `02_wires`. Vendor binding names (Cloudflare, Fastly, Deno) — targets. And never: a universal application server, a second cache ontology, browser capability truth asserted with false certainty from hints, authorization inferred from placement, or a generic backend junk drawer.

## Laws

- Raw invocation and environment state beneath bootstrap; admitted capabilities above it.
- The body is one-shot; consumption and cloning are declared acts.
- Every producer names its exact core evidence source; advisory hints never authorize.
- Policy is a fail-closed allowlist; every refusal names its governing policy address.
- Settlement realizes core's decisions; nothing recomputes an earlier faithful settlement.
- No connection opens outside the policy; no key exists without declared variation and a partition.
- A response plan is not a committed response; only the commit authority mints the receipt.
- Deferred work descends from its exact invocation with a declared scope.

## Proof obligations

- No ambient environment read exists outside the bootstrap; raw request fields pass canonical decoders.
- The request-evidence producer census is complete; the conservative edge/web classifier relation holds.
- Cache variation is complete; private data cannot cross partitions.
- The policy is applied on the shipping path; exactly one response is written.
- Deferred work remains bounded and attributed; target-generated bindings cannot bypass canonical bootstrap.

All `system/01_assurance`. Body buffering, TTLs, stale windows, timeouts, retries, streaming crossover, and budgets are empirical lanes.

## Implementation boundary

Edge realizations must preserve admitted request, policy, storage, response, and deferred-work coordinates without ambient environment reads.
