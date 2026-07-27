/**
 * Single source for the `client:stream` directive's `data-liteship-*` wire attributes.
 * The stream runtime reads attributes through {@link streamWireAttr} so a mistyped
 * suffix cannot compile and docs derive from the same registry.
 *
 * @module
 */

/** Logical keys for stream directive host attributes (not the DOM suffix alone). */
export const STREAM_WIRE_ATTR_KEYS = ['url', 'artifact', 'morph', 'snapshotUrl', 'replayUrl'] as const;

/** Logical stream wire attribute keys (url, artifact, morph, snapshotUrl, replayUrl). */
export type StreamWireAttrKey = (typeof STREAM_WIRE_ATTR_KEYS)[number];

const STREAM_ATTR_SUFFIX: Record<StreamWireAttrKey, string> = {
  url: 'stream-url',
  artifact: 'stream-artifact',
  morph: 'stream-morph',
  snapshotUrl: 'snapshot-url',
  replayUrl: 'replay-url',
};

/** Project a stream wire key to its canonical `data-liteship-*` attribute name. */
export function streamWireAttr(key: StreamWireAttrKey): `data-liteship-${string}` {
  return `data-liteship-${STREAM_ATTR_SUFFIX[key]}`;
}

/** Canonical `data-liteship-*` attribute names for the stream directive. */
export type StreamWireAttribute = ReturnType<typeof streamWireAttr>;

/** Exhaustive attribute list — drift guards compute `expected` from this. */
export const STREAM_WIRE_ATTRIBUTES: readonly StreamWireAttribute[] = STREAM_WIRE_ATTR_KEYS.map((key) =>
  streamWireAttr(key),
);

/** Short human descriptions for generated wire-contract docs. */
export const STREAM_WIRE_ATTRIBUTE_DOCS: Record<StreamWireAttribute, string> = {
  'data-liteship-stream-url': 'SSE feed endpoint (required).',
  'data-liteship-stream-artifact': 'Resumption artifact id for cross-tab replay.',
  'data-liteship-stream-morph': 'Morph target: `innerHTML` (default) or `outerHTML`.',
  'data-liteship-snapshot-url': 'Recovery snapshot endpoint (morph rejection / gap).',
  'data-liteship-replay-url': 'Recovery replay endpoint (missed patch gap).',
};
