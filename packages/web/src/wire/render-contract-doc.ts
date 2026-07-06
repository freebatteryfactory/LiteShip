/**
 * Render the wire-contract tables committed under `<!-- BEGIN WIRE-CONTRACT -->`
 * in `packages/web/README.md`. Consumed by `scripts/gen-docs.ts` and pinned by
 * the drift guard in `tests/unit/web/wire-contract-registry.test.ts`.
 *
 * @module
 */

import { CZAP_EVENT_DOCS, CZAP_EVENT_NAMES } from './czap-events.js';
import { STREAM_WIRE_ATTRIBUTE_DOCS, STREAM_WIRE_ATTRIBUTES } from './stream-attributes.js';

/** Markdown tables for the generated wire-contract block. */
export function renderWireContractDoc(): string {
  const eventRows = CZAP_EVENT_NAMES.map((name) => `| \`${name}\` | ${CZAP_EVENT_DOCS[name]} |`);
  const attrRows = STREAM_WIRE_ATTRIBUTES.map((attr) => `| \`${attr}\` | ${STREAM_WIRE_ATTRIBUTE_DOCS[attr]} |`);

  return [
    '### `czap:*` CustomEvents',
    '',
    'Single source: `packages/web/src/wire/czap-events.ts`. Dispatch through `dispatchCzapEvent`; subscribe through `onCzap`.',
    '',
    '| Event | Role |',
    '| --- | --- |',
    ...eventRows,
    '',
    '### Stream `data-czap-*` attributes',
    '',
    'Single source: `packages/web/src/wire/stream-attributes.ts`. Read through `streamWireAttr(key)`.',
    '',
    '| Attribute | Role |',
    '| --- | --- |',
    ...attrRows,
  ].join('\n');
}
