import type { APIRoute } from 'astro';

/**
 * SSE feed for the streaming showcase (stream.astro / `client:stream`).
 *
 * Prerendered so the static showcase build serves a working snapshot —
 * the `data-czap-stream-url="/api/feed"` element morphs in this patch the
 * moment the EventSource opens. Swap `prerender = false` (with a server
 * adapter) to push live events on an interval.
 */
export const prerender = true;

export const GET: APIRoute = () => {
  const patch = JSON.stringify({
    type: 'patch',
    data:
      '<p class="stream-status">Connected to /api/feed.</p>' +
      '<p>Events morph into this container over SSE — no full re-render.</p>',
  });
  const body = `data: ${patch}\n\n`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
    },
  });
};
