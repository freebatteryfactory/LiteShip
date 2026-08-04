/**
 * ONE deadline primitive for the graph channel's HTTP legs.
 *
 * `fetch` settles as soon as RESPONSE HEADERS arrive, while the body is still
 * streaming. A deadline that wraps the transport call alone and clears its timer
 * in a `finally` on that promise therefore leaves the body read — `response.json()`
 * and friends — running with no bound at all. A server that commits a 200 and then
 * wedges (the ordinary behaviour of a proxy that has lost its upstream) holds the
 * caller forever. `42ba28d4` cured that on the mutation leg; this module is that
 * cure extracted so the read leg shares it rather than carrying a second copy.
 *
 * The guarantee is TOTAL for two independent reasons, and both are needed:
 *   - the ABORT unwinds a real `fetch`'s socket instead of leaking it;
 *   - the RACE settles the exchange even when the transport ignores the signal,
 *     which a conforming implementation is free to do for a body it has already
 *     begun delivering (and which an injected test transport routinely does).
 *
 * SCOPE. This primitive governs the GRAPH CHANNEL's two HTTP legs — the mutation
 * write leg and the query read leg — because they share a serialized submit queue:
 * `createGraphQueryRefreshBase` is awaited from inside it, so an unbounded read
 * body stalls the write leg too. The other body consumptions reachable from a
 * `fetch` in `packages/*\/src` were derived and are NOT governed here:
 *
 *   - `web/stream/resumption.ts` and `cli/.../doctor/probes-astro.ts` already keep
 *     an abort signal armed THROUGH their body read — covered, nothing to do;
 *   - `core/wasm/wasm-dispatch.ts` (module bytes), `astro/runtime/gpu.ts` and
 *     `astro/runtime/wgpu.ts` (shader source), and `command/host-browser/context.ts`
 *     (local MCP call) each hold no queue and each need their own default, their
 *     own public option and their own law — separate items, not a drive-by;
 *   - `astro/graph-mutation-route.ts` and `astro/docs-mcp-route.ts` read an INBOUND
 *     `Request` body, which the host server's own request timeout owns;
 *   - `cloudflare/edge-cache.ts` reads a `caches.match` hit, not a network body.
 *
 * @module
 */

/**
 * Run one whole exchange — headers AND the body read that follows them — under a
 * single deadline.
 *
 * `exchange` receives the {@link AbortSignal} it must thread into its transport
 * call. Whatever it returns is raced against the deadline; when the deadline wins
 * the returned promise REJECTS with an `Error` carrying `message`, after aborting
 * the signal with that same reason. The timer is always cleared, so a settled
 * exchange never keeps the process alive.
 *
 * @param timeoutMs - Finite non-negative deadline for the whole exchange.
 * @param message - The reason text carried by both the abort and the rejection.
 * @param exchange - The exchange to run, given the deadline's signal.
 */
export async function runWithExchangeDeadline<T>(
  timeoutMs: number,
  message: string,
  exchange: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  let expire: (reason: Error) => void = () => undefined;
  const expiry = new Promise<never>((_resolve, reject) => {
    expire = reject;
  });
  const timer = setTimeout(() => {
    const reason = new Error(message);
    controller.abort(reason);
    expire(reason);
  }, timeoutMs);
  try {
    return await Promise.race([exchange(controller.signal), expiry]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Resolve a caller-supplied timeout against a finite default. `undefined`,
 * non-finite and negative values all fall back to `fallbackMs`, so an unbounded
 * request is not expressible through the option.
 */
export function resolveExchangeTimeoutMs(timeoutMs: number | undefined, fallbackMs: number): number {
  return timeoutMs !== undefined && Number.isFinite(timeoutMs) && timeoutMs >= 0 ? timeoutMs : fallbackMs;
}
