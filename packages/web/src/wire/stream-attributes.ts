/**
 * Single source for the `client:stream` directive's `data-czap-*` wire attributes.
 * The stream runtime reads attributes through {@link streamWireAttr} so a mistyped
 * suffix cannot compile and docs derive from the same registry.
 *
 * @module
 */

/** Logical keys for stream directive host attributes (not the DOM suffix alone). */
export const STREAM_WIRE_ATTR_KEYS = ['url', 'artifact', 'morph', 'snapshotUrl', 'replayUrl'] as const;

export type StreamWireAttrKey = (typeof STREAM_WIRE_ATTR_KEYS)[number];

const STREAM_ATTR_SUFFIX: Record<StreamWireAttrKey, string> = {
  url: 'stream-url',
  artifact: 'stream-artifact',
  morph: 'stream-morph',
  snapshotUrl: 'snapshot-url',
  replayUrl: 'replay-url',
};

/** Project a stream wire key to its canonical `data-czap-*` attribute name. */
export function streamWireAttr(key: StreamWireAttrKey): `data-czap-${string}` {
  return `data-czap-${STREAM_ATTR_SUFFIX[key]}`;
}

export type StreamWireAttribute = ReturnType<typeof streamWireAttr>;

/** Exhaustive attribute list — drift guards compute `expected` from this. */
export const STREAM_WIRE_ATTRIBUTES: readonly StreamWireAttribute[] = STREAM_WIRE_ATTR_KEYS.map((key) =>
  streamWireAttr(key),
);

/** Short human descriptions for generated wire-contract docs. */
export const STREAM_WIRE_ATTRIBUTE_DOCS: Record<StreamWireAttribute, string> = {
  'data-czap-stream-url': 'SSE feed endpoint (required).',
  'data-czap-stream-artifact': 'Resumption artifact id for cross-tab replay.',
  'data-czap-stream-morph': 'Morph target: `innerHTML` (default) or `outerHTML`.',
  'data-czap-snapshot-url': 'Recovery snapshot endpoint (morph rejection / gap).',
  'data-czap-replay-url': 'Recovery replay endpoint (missed patch gap).',
};
