import type { APIRoute } from 'astro';

/**
 * Echo-LLM stub for the generative-UI showcase (chat.astro / `client:llm`).
 *
 * Treats an LLM token stream as adaptive media: the `data-czap-llm-url`
 * element opens an EventSource here and appends each `text` chunk as it
 * arrives, then `done` closes the turn. On-demand (`prerender = false`) so the
 * SSE serves with the correct MIME when deployed; the showcase keeps pages static
 * and runs only this route on the adapter. Proxy a real provider here to go live.
 *
 * NOTE: this is the framework's CAST-side contract only (graph/stream →
 * validated chunks). Provider calls, auth, and admission live in the host
 * product, never in the framework or its examples.
 */
export const prerender = false;

const REPLY = ['Hello! ', 'This is a canned ', 'generative-UI stream ', 'echoed chunk by chunk.'];

export const GET: APIRoute = () => {
  const enc = new TextEncoder();
  let keepAlive: ReturnType<typeof setInterval> | undefined;

  // A REAL streaming response: emit each chunk + the `done` frame, then hold the
  // connection OPEN. A buffered body hits EOF immediately, which the browser reads as a
  // disconnect — the stream directive then reconnects + replays forever. The llm client
  // closes the EventSource when it sees `done`; the keep-alive just guards idle proxies
  // until it does.
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const content of REPLY) {
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ type: 'text', partial: true, content })}\n\n`));
      }
      controller.enqueue(enc.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
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
