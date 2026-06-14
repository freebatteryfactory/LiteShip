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
  const body = `data: ${patch}\n\n`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
    },
  });
};
