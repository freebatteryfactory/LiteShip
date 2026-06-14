import type { APIRoute } from 'astro';

/**
 * Echo-LLM stub for the generative-UI showcase (chat.astro / `client:llm`).
 *
 * Treats an LLM token stream as adaptive media: the `data-czap-llm-url`
 * element opens an EventSource here and appends each `text` chunk as it
 * arrives, then `done` closes the turn. Prerendered so the static showcase
 * build streams a canned reply immediately — replace `prerender = false`
 * (with a server adapter) and proxy a real provider to go live.
 *
 * NOTE: this is the framework's CAST-side contract only (graph/stream →
 * validated chunks). Provider calls, auth, and admission live in the host
 * product, never in the framework or its examples.
 */
export const prerender = true;

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
