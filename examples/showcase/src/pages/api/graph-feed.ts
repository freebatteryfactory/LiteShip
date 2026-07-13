import type { APIRoute } from 'astro';
import { crossingReceiptFrame } from '../../server/stream-graph';

/**
 * SSE emit leg for graph-native stream recovery (#133-full) — the cookbook route.
 *
 * Unlike `/api/feed` (which emits `type:'patch'` HTML only), this feed also emits an
 * ATTESTED transition receipt when the authority crosses a discrete state:
 *
 *   data: {"type":"receipt","data":{"receipt":<envelope>,"transition":<DiscreteStateTransition>}}
 *
 * The receipt is minted through `mintTransition(prev, next, { base, resultId })` on a
 * REAL `StateCellStore.applyDiscrete` crossing (see server/stream-graph.ts). The
 * client attests it (hash self-consistency + `${base}#${cell}` subject law) before
 * buffering, and — after a reconnect gap — QUERYs `/api/graph`, re-adopts the server
 * graph, and replays the crossing by generation. Emit → attest → replay, end to end.
 */
export const prerender = false;

export const GET: APIRoute = async () => {
  const enc = new TextEncoder();
  const welcome = JSON.stringify({
    type: 'patch',
    data:
      '<p class="stream-status">Connected to /api/graph-feed.</p>' +
      '<p>The workspace just crossed <code>collapsed → expanded</code>; the crossing was emitted as an attested receipt.</p>',
  });
  const receiptFrame = await crossingReceiptFrame();
  let keepAlive: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // 1) the HTML patch the container morphs on connect, then
      // 2) the attested transition receipt frame the client buffers for gap replay.
      controller.enqueue(enc.encode(`data: ${welcome}\n\n`));
      controller.enqueue(enc.encode(`data: ${receiptFrame}\n\n`));
      keepAlive = setInterval(() => controller.enqueue(enc.encode(': keep-alive\n\n')), 15_000);
    },
    cancel() {
      if (keepAlive) clearInterval(keepAlive);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
    },
  });
};
