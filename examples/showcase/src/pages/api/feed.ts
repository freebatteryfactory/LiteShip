import type { APIRoute } from 'astro';

/**
 * SSE feed for the streaming showcase (stream.astro / `client:stream`).
 *
 * On-demand (`prerender = false`) so it serves a REAL `text/event-stream` with the
 * correct MIME when deployed — a prerendered EventSource becomes a static snapshot a
 * static host mislabels, so the stream never opens. The showcase keeps every PAGE
 * static; only this route runs on the adapter. The `data-czap-stream-url="/api/feed"`
 * element morphs in this patch the moment the EventSource connects.
 */
export const prerender = false;

export const GET: APIRoute = () => {
  const patch = JSON.stringify({
    type: 'patch',
    data:
      '<p class="stream-status">Connected to /api/feed.</p>' +
      '<p>Events morph into this container over SSE — no full re-render.</p>',
  });
  const enc = new TextEncoder();
  let keepAlive: ReturnType<typeof setInterval> | undefined;

  // A REAL streaming response (not a buffered string): emit the welcome patch, then hold
  // the connection OPEN with periodic keep-alive comments. A buffered body hits EOF at
  // once, which the browser reads as a disconnect — `initStreamDirective` then closes and
  // reconnects up to its max attempts, re-fetching forever. A live feed would push more
  // patches in `start`; the demo idles open until the client navigates away.
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(enc.encode(`data: ${patch}\n\n`));
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
