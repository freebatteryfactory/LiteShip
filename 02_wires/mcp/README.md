# MCP Wire: Operations Exposed to a Model

Status: architecture specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `02_wires/mcp/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Offer operations to a model as tools, resources, or prompts, and keep a tool that declined from being reported as a malformed call.

## Owns

- The surface kind, and the offer that binds an operation to one.
- The catalog, which refines the umbrella's exposure rather than forking it.
- The answer algebra: protocol error, result, transport loss.
- The admission evidence required by a trusted-local execution composition.

## Does not own

- JSON-RPC framing, sessions, capability negotiation, or transport. Those are the protocol's and a host's.
- Schema. `00_core/03_schema` owns it, and a tool's input schema is the operation's, not this wire's.
- Which operations are offered. `system/03_programs` and application code decide; this home owns the shape of saying so.

## A tool that ran and refused is not a protocol error

MCP has a transport-level error channel and a tool-result channel, and servers habitually use the first for the second. A tool that validated its input and declined returns a JSON-RPC error, which tells the model the *call* was malformed — so the model rewrites a call that was correct, and does it again.

That is exactly the umbrella's cut, arriving in a protocol that smears it by default.

- **protocolError** projects a crossing that never became an invocation. The call was malformed or named nothing. Rewriting it is correct, and this is the only arm for which that is true.
- **result** projects a crossing that completed, and carries the whole receipt. Its outcome may be succeeded, failed, refused, or cancelled — all four are results. A tool that declined is here. A tool that threw is here. The call was fine.
- **transportLoss** projects the crossing whose operation ran and whose answer did not arrive. A model told this was a protocol error will retry a call that already had effects.

The `protocolError` arm can only be built from a crossing that was refused at the boundary, so a tool that ran and declined has nowhere to put itself except `result`. The merge is unrepresentable rather than discouraged.

## An offer names its kind

A tool is invoked with arguments and has effects. A resource is addressed and read. A prompt is a template the caller instantiates. These are not interchangeable presentations of one thing — which one an operation surfaces as changes what a model is entitled to do with it.

The umbrella's `WireExposure` is a flat population of operation references, which is right for every other wire and insufficient here. `McpOffer` is exact over both axes, so the same operation offered as a tool and as a resource are different offers; if they were mutually assignable the kind would be documentation.

`withheld` stays a bare population, and the asymmetry is deliberate: a withheld operation has no kind, because it is not being offered as anything.

## Trusted-local execution is a composition, not a caller privilege

Some operations are lawful MCP tools only when the server is an explicitly admitted local composition. Consumer build is the first example: offering it from a general or remote MCP catalog would silently create remote code execution authority.

`TrustedLocalMcpToolProjection` therefore carries an addressed local-trust admission beside the ordinary tool offer and answer. The admission is evidence about the host composition. It is not a property a model caller supplies, and a plain `McpOffer` has no member that can claim it.

## Laws

- A completed crossing is a result and never a protocol error; a protocol error carries no receipt and a result does.
- A lost answer is its own arm, checked against the two names the merge would arrive under.
- An offer names its kind, and offers differing in operation or in kind do not substitute.
- The catalog's withheld population is the umbrella's, so this refines the exposure rather than forking it.
- An answer is exact over its operation.
- Migration is offered as an exact tool projection carrying core's report and typed failure, never as a wire-local conversion API.
- Trusted-local tool projection requires addressed admission evidence and remains exact over the operation it exposes.

## Proof obligations

Runtime claims a type cannot express:

- That the JSON-RPC error codes emitted for the protocol-error arm are the specified ones.
- That a tool's advertised input schema is the operation's own schema and not a hand-maintained copy.
- That withheld operations are genuinely unreachable through this wire, rather than merely unlisted.
- That a model's retry after a transport loss presented the idempotency key.

## Implementation

None.
