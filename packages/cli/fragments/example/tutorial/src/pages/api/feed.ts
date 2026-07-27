import type { APIRoute } from 'astro';

/** Prerendered SSE snapshot for the static tutorial build (dev uses the same route). */
export const prerender = true;

export const GET: APIRoute = async () => {
  const patch = JSON.stringify({
    type: 'patch',
    data: '<p class="stream-status">Connected to /api/feed</p><p>Stream demo is live — patches arrive over SSE.</p>',
  });
  const body = `data: ${patch}\n\n`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
    },
  });
};
