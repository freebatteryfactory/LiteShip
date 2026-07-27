/** The showcase's idle interval stays below the runtime's 30s watchdog. */
export const SHOWCASE_SSE_HEARTBEAT_MS = 15_000;

/**
 * Schedule a real SSE data message that EventSource delivers to `onmessage`.
 * Comment frames keep intermediaries awake but are invisible to LiteShip's
 * transport watchdog, so they cannot prove that the application stream lives.
 */
export function scheduleShowcaseSseHeartbeat(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
): ReturnType<typeof setInterval> {
  const frame = encoder.encode(`data: ${JSON.stringify({ type: 'heartbeat' })}\n\n`);
  return setInterval(() => controller.enqueue(frame), SHOWCASE_SSE_HEARTBEAT_MS);
}
