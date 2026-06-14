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
  const frames = REPLY.map((content) => `data: ${JSON.stringify({ type: 'text', partial: true, content })}\n\n`);
  frames.push(`data: ${JSON.stringify({ type: 'done' })}\n\n`);

  return new Response(frames.join(''), {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
    },
  });
};
