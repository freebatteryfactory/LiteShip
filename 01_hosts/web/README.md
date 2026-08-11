# Web: The Browser Host

Status: architecture specified across twelve homes; implementation absent and unauthorized

Authority: This README for web-wide meaning and proof obligations; `types.ts` for the topology; each numbered home's `README.md` and `types.ts` for local authority

Source home: `01_hosts/web/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Realize unresolved physical behavior in the browser: DOM reads and writes, browser events, physical state, fetch and SSE consumption, browser probes, audio and media, graphics, island activation, browser security policy, and the application of admitted plans to browser egresses. Web realizes upstream meaning; it never reinterprets it.

## The entry decision

Raw browser globals remain beneath the bootstrap. The governed web surface exposes narrow admitted capabilities, never a `Window`-shaped optional context. `document` access never implies DOM write authority: one region has one physical writer per transaction, and semantic addresses resolve through revision-pinned indexes, never raw selectors.

## Grounding origins in a browser

Classification is causation and custody, never noun worship. The same capability type may be grounded when an already-existing value is admitted and offered when LiteShip constructs it.

- **Intrinsic**: a facility already present before LiteShip plans anything — a narrow document-observation or region-discovery authority, a monotonic clock, cryptographic randomness, a fetch entrypoint, capability-probe entrypoints, a scheduling facility, the IndexedDB factory, media-device and GPU access facilities, the AudioContext constructor facility. The admitted value is the narrow authority, not the global.
- **Invocation**: a value carried by one concrete entry or activation — a mount slot, the exact program or revision being activated, initial serialized state, a replay cursor, an activation payload from a target. Browser events are not groundings; they are evidence or operation triggers.
- **Deployment**: public, non-secret browser configuration — endpoints, transport policy, the Trusted Types policy name, the component-catalog address, artifact addresses. Secrets and server authorization never enter this origin.
- **Application**: an existing value whose custody the embedding application transfers or retains — a mount region, an existing `AudioContext` or `MediaStream`, a database connection, a custom transport, a precreated device.

Everything acquired, selected, activated, opened, permission-negotiated, or given a newly created owned lifetime is an offer.

## Semantic state versus physical browser state

Core owns meaning: worlds, revisions, schemas, scenes, streams, operations, residual programs, write plans, committed cuts. Web owns the physical: actual nodes and ranges, focus, selection, scroll, live form values, media-element state, listeners, connections, contexts, devices, transactions, opaque foreign internals, region ownership.

Physical state crosses into core only through declared bridges — evidence updates, operation invocations, family patches, admitted proposals, committed changes. The DOM is never scraped to reconstruct meaning. Focus or selection may remain preservation-only physical facts; they become semantic only when an authored interaction, editor operation, accessibility contract, or explicit evidence source says so. Browser evidence may affect presentation; it never grants server authorization.

## Trust families, not trust levels

There is no universal trust ladder. Four structurally distinct families keep four routes: core-authored semantic write plans; attested trusted fragments changed only through revision-pinned semantic locations; admitted generated structures rendered through the closed catalog with operation-bound listeners; and opaque foreign output, which is a region boundary and not writable at all. Raw external input is `unknown` before admission regardless of which connection delivered it. Sanitization is layered — core content admission, bootstrap grounding admission, and physical sink enforcement — never one generic sanitizer, and trusted never means exempt from sink policy.

## Topology

Twelve numbered homes in dependency order, each one distinct physical authority:

| Home | Authority | Status |
| --- | --- | --- |
| `00_bootstrap` | Raw-global capture and grounding admission | specified |
| `01_region` | Region identity, custody, one-writer authority | specified |
| `02_security` | Fail-closed sink policy | specified |
| `03_event` | Event projection and listener lifetime | specified |
| `04_projection` | Physical application and the coherent commit | specified; morph empirical |
| `05_evidence` | Browser probes and watchers | specified |
| `06_transport` | Fetch/SSE/stream connections | physical profiles deferred |
| `07_persistence` | Optional store offers over core ports | provisional |
| `08_media` | Audio, devices, capture, codecs | profiles deferred; capture roster reserved |
| `09_graphics` | Canvas, WebGL, WebGPU | physical profiles deferred |
| `10_execution` | Browser residual-program host | physical profiles deferred |
| `11_island` | Activation and graph-cut joining | specified |

`11_island` is last because activation composes region, security, events, evidence, transport, optional persistence, media, graphics, and execution — and that composition is a type fact, not a sentence: `IslandActivationOffer` requires the region manager, the commit-application authority, and the execution host by exact requirement row. The topology in `types.ts` follows core's ordered pattern — named entries in an exact tuple with position-by-position laws — so order, membership, and surface association are all mutation-breakable facts, lawful because all twelve directories physically exist.

## The capability composition

Every home instantiates the closed host calculus rather than narrating it. Thirteen grounding slots enter the web boundary — discovery, application mount, invocation mount, sink policy, renderer catalog, event facility, probe facility, transport facility, database facility, audio facility, injected audio runtime, GPU access, scheduling — each pinned to its allowed origin and exact identity, twenty-four pinned capability declarations in all. Eleven offers construct everything else — region authority, event authority, commit application, transport authority, store, audio runtime, media authority, graphics authority, execution host, preparation, island activation — each a `WebRealizationOffer` with a pinned distinct identity, structurally unable to advertise a realm, a server or worker backend, platform-settled html-css, or a settlement location outside local, live, and remote.

Three altitudes stay distinct throughout, and multiplicity is honest: a requirement hole names a capability or provider authority, never a repeatable resource instance. Dynamic per-use resources — memberships, subscriptions, connections, watchers, media and graphics resources, islands — are created through typed operations on their providers with their own identity and lifecycle, so two islands or two regions are two values, not one deduplicated hole. Transaction-scoped leases are issued per commit by persistent membership, never frozen inside a provider. Offer inputs are classified — plan-bound configuration content-addressed by the selected step, invocation-bound input through an explicit slot, per-use input on the provider's operation — so no meaningful input vanishes between the plan and the physical act. `WebCapabilityTopology` composes the exact population into one inspectable surface with population laws on both sides, and the erased catalog of offer and grounding descriptors derives from it — a derivation whose faithfulness is a `system/assurance` obligation.

## Does not own

Schema, identity, state, evidence, settlement, residual, operation, scene, stream, or media meaning — all core. Worker lifecycle and shared memory — sibling realm. Request inference, Client Hints, edge caches — edge. Astro, Vite, Cloudflare, Remotion lifecycles — targets. Protocol translation — wires. Secrets, processes, native tools, authoritative handlers — server. And never: a broad `Window` context, raw selectors as addresses, a global DOM write authority, untrusted markup interpretation, a universal trust ladder, a hydration-tier table, a duplicated classifier, a second compositor or residual engine, client-side authorization, or a default GPU reconciliation architecture.

Retired old defects that do not return: generic browser engines living under a target, duplicated stream and preflight decoders, hand-copied capability ladders, generated UI bypassing the validated envelope, declared signals with no producers, and the exact old three-zone DOM ownership taxonomy — one writer per region per transaction is what survives.

## Laws

- Raw globals beneath bootstrap; narrow admitted capabilities above it.
- One writer per region per transaction; regions coexist by exclusion.
- Four trust families, four routes, no ladder.
- Events project to evidence or operations, never free functions.
- Every live browser resource is owned and disposed exactly once.
- Inactivity is a lawful state; failure stays phase-correct.
- The roster and topology match the physical tree.

## Proof obligations

- No ambient browser read exists outside the bootstrap.
- Every promised evidence source has a producer, and no producer asserts an undeclared source.
- Every physical write routes through sink policy and a region write authority.
- The web capability population reconciles against the capability port ledger before implementation, and old source is read line by line before any port.

The first three are `system/assurance`; the last is the implementation-gate protocol.

## Implementation boundary

The complete web architecture is specified. Every implementation — DOM code, listeners, drivers, contexts, databases, workers, activation — is absent and unauthorized until the whole repository architecture closes and Eassa explicitly authorizes implementation.

## Machine-checkable projection

```yaml
home:
  path: 01_hosts/web
  title: "Web: The Browser Host"
  maturity: architecture-specified
  implementation: absent
  child_homes: 12
  runtime_exports: false
  dependency_authority: source-imports
  semantic_decisions:
  - raw-globals-beneath-bootstrap
  - narrow-admitted-capabilities-never-a-window-context
  - one-writer-per-region-per-transaction
  - four-trust-families-no-ladder
  - grounding-by-causation-and-custody-not-noun
  - physical-state-crosses-only-through-declared-bridges
  - inactivity-is-lawful-failure-stays-phase-correct
  - roster-checked-against-physical-tree
  production_authority: false
```
