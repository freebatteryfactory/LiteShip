# Server: The Trusted General-Purpose Host

Status: specified; implementation absent

Authority: This README for server-wide meaning and proof obligations; `types.ts` for the topology; each numbered home's `README.md` and `types.ts` for local authority

Source home: `01_hosts/server/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Make operating-system and process facilities, scoped filesystem authority, secrets, databases, network services, long-lived providers, native tools, trusted operation-handler realization, native media, and server-side residual execution real. Server realizes upstream meaning; it never reinterprets it.

## The realm contract

Server is a **capability host and trusted physical execution realm** — not LiteShip's application runtime. "Trusted general-purpose" describes the breadth of physical capabilities the realm can lawfully hold; it does not mean every server value is trusted, every process is long-lived, or every operation is authorized. Each realization pins its actual lifecycle and facilities: a serverless process, a long-running Node service, a Bun or Deno runtime, and another native host are never assumed equivalent because they execute server-side JavaScript. Runtime-specific APIs remain exact offers or downstream target integrations; the server semantic surface stays vendor-neutral and capability-based.

Routing, DI containers, jobs frameworks, wire semantics, and application lifecycle are explicitly not here — targets and wires compose the physical providers into a deployable application. The familiar integrated-server-runtime alternative was considered and rejected: it would duplicate operation and wire authority, blur target lifecycle, absorb edge alternatives, and recreate the everything-backend department the successor exists to prevent.

## Topology

Eleven numbered homes in dependency order:

| Home | Authority | Status |
| --- | --- | --- |
| `00_bootstrap` | Process-entry and configuration admission, placement pins | specified |
| `01_process` | Admitted host process; child processes as resources | specified |
| `02_secret` | Opaque references, correlated revelation, no serialization | specified |
| `03_filesystem` | Scoped roots, root-correlated admitted paths, owned handles | specified |
| `04_network` | Outbound clients and listeners, decoder-correlated | physical profiles deferred |
| `05_database` | Providers, pools, connections, per-generation leases, exact ports | physical profiles deferred |
| `06_service` | Repeatable supervised long-lived resources | specified |
| `07_tool` | Exact tool profiles, correlated sandboxed invocations | specified |
| `08_execution` | Core executor with javascript/wasm/host-native drivers | physical profiles deferred |
| `09_operation` | Exact handler bindings to core operation definitions | specified |
| `10_media` | Native media jobs bound to exact source revisions | physical profiles deferred |

## The capability composition

Eleven grounding slots — process entry, configuration, process facility, secret source, filesystem root, network facility, database endpoint, tool catalog, scheduling facility, operation catalog — and ten offers — child process, secret provider, filesystem provider, network authority, database provider, service authority, tool authority, execution host, operation handler, media authority. Twenty-one pinned capability declarations, each with exact identity, origin, custody, and placement: realm exactly `server`, locations `local | live`, backends `javascript | wasm | host-native`. Children, revealed secrets, handles, connections, leases, services, tool executions, sessions, handlers, and media jobs are per-use resources from their providers. `ServerCapabilityTopology` composes the exact population with population laws on both sides and carries its erased catalog.

## Does not own

Schema, operation, stream, state, scene, media, compiler meaning — core. HTTP/CLI/MCP/LSP wire semantics — `02_wires`. Target lifecycle and packaging — targets. Edge request inference — edge. Browser behavior — web. Worker realm semantics — worker (server may later own a worker-thread construction facility; the realm after entry is worker's). And never: unrestricted ambient process/environment/filesystem/network/secret access, a framework router, a universal service container, or duplicated database, migration, or operation semantics.

## Laws

- Raw process globals and the environment map beneath bootstrap; admitted capabilities above it.
- A revealed secret has no serialization surface and its revelation is identity-correlated.
- A path admitted under root A cannot be opened under root B.
- Provider, connection, and transaction lease are three distinct altitudes; leases are per-generation.
- A tool invocation pins its exact tool with a declared sandbox.
- A handler pins its exact operation and carries idempotency and capability rows.
- A media job binds its exact source revision.
- Backends and drivers cannot disagree, host-native included.

## Proof obligations

- No ambient reads outside bootstrap; secret material never reaches logs, receipts, addresses, or artifacts.
- Path admission resists traversal, symlink confusion, and races; sandbox scopes are honored.
- Transaction, isolation, commit, rollback, and connection lifecycle match the selected contract.
- Handlers use the canonical operation catalog; every promised capability has a producer; disposal happens exactly once.
- Execution and media preserve reference semantics and source revision; end-to-end cost is complete.

All `system/01_assurance`. Pool sizes, timeouts, batching, backoff, concurrency, and crossovers are empirical lanes.

## Implementation boundary

Every implementation — process runner, database pool, filesystem driver, native tool, HTTP listener — is absent.
