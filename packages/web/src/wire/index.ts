/**
 * Wire-contract registry — typed `czap:*` events and stream `data-czap-*` attributes.
 *
 * @module
 */

export type {
  CzapEventDetailMap,
  CzapEventName,
  CzapMorphRejectedDetail,
  CzapStreamErrorDetail,
  CzapUniformUpdateDetail,
} from './czap-events.js';
export { CZAP_EVENT_DOCS, CZAP_EVENT_NAMES } from './czap-events.js';
export type { StreamWireAttrKey, StreamWireAttribute } from './stream-attributes.js';
export {
  STREAM_WIRE_ATTRIBUTE_DOCS,
  STREAM_WIRE_ATTRIBUTES,
  STREAM_WIRE_ATTR_KEYS,
  streamWireAttr,
} from './stream-attributes.js';
export type { CzapEventDisposer } from './dispatch.js';
export { dispatchCzapEvent, onCzap } from './dispatch.js';
export { renderWireContractDoc } from './render-contract-doc.js';
