[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [astro/src](../README.md) / graphMutationRoute

# Function: graphMutationRoute()

> **graphMutationRoute**(`store`): (`request`) => `Promise`\<`Response`\>

Defined in: [astro/src/graph-mutation-route.ts:54](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/astro/src/graph-mutation-route.ts#L54)

Build a POST handler that validates + applies a client-proposed `GraphPatch`
against the host's current graph:
  - **200** on apply — body is `{ status: 'applied', graph }` (the new sealed graph);
  - **422** on refusal — body is `{ status: 'refused', errors }` (validation reasons);
  - **415** on a non-`application/json` body (see the CSRF note below);
  - **400** on an unparseable JSON body.

The host supplies the `GraphStore` (its authority boundary); everything the
seam guarantees — a stale-base / dangling-edge / malformed patch never mutates the
graph — holds unchanged over HTTP.

**CSRF hardening.** This route requires `Content-Type: application/json`. `Request.json()`
will parse a `text/plain` or form-encoded body just fine, so without this a cross-site
"simple request" (no CORS preflight) could smuggle a crafted `GraphPatch` to a
cookie-authed mount — the base-match/CAS is integrity, NOT a CSRF token (the graph id
is discoverable). Demanding `application/json` forces every cross-origin POST into a
preflighted request the browser blocks by default. This closes the parse-level bypass;
it does not replace host session/origin auth (ADR-0015) — the host still owns that.

## Parameters

### store

`GraphStore`

## Returns

(`request`) => `Promise`\<`Response`\>
