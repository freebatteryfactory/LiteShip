/**
 * Wire-contract registry — typed `liteship:*` events and stream `data-liteship-*` attributes.
 *
 * @module
 */

export type {
  LiteshipEventDetailMap,
  LiteshipEventName,
  LiteshipMorphRejectedDetail,
  LiteshipStreamErrorDetail,
  LiteshipUniformUpdateDetail,
} from './liteship-events.js';
export { LITESHIP_EVENT_DOCS, LITESHIP_EVENT_NAMES } from './liteship-events.js';
export type { StreamWireAttrKey, StreamWireAttribute } from './stream-attributes.js';
export {
  STREAM_WIRE_ATTRIBUTE_DOCS,
  STREAM_WIRE_ATTRIBUTES,
  STREAM_WIRE_ATTR_KEYS,
  streamWireAttr,
} from './stream-attributes.js';
export type { LiteshipEventDisposer } from './dispatch.js';
export { dispatchLiteshipEvent, onLiteship } from './dispatch.js';
export { renderWireContractDoc } from './render-contract-doc.js';
