/** Typed Web projection of the generated fleet event protocol. @module */

import type { EventDetail, EventsInChannel } from '@liteship/_spine/events';
export { LITESHIP_EVENT_DOCS, LITESHIP_EVENT_NAMES } from './liteship-events.generated.js';

/** Union of DOM-channel LiteShip events accepted by browser helpers. */
export type LiteshipEventName = EventsInChannel<'dom'>;

/** Canonical DOM event to `CustomEvent.detail` projection. */
export type LiteshipEventDetailMap = { readonly [Name in LiteshipEventName]: EventDetail<Name> };

/** Uniform / boundary payload carried by state and GPU update events. */
export type LiteshipUniformUpdateDetail = EventDetail<'liteship:uniform-update'>;

/** `liteship:morph-rejected` preserve-constraint detail. */
export type LiteshipMorphRejectedDetail = EventDetail<'liteship:morph-rejected'>;

/** `liteship:stream-error` transport/recovery detail. */
export type LiteshipStreamErrorDetail = EventDetail<'liteship:stream-error'>;

/** `liteship:llm-error` terminal failure detail. */
export type LiteshipLlmErrorDetail = EventDetail<'liteship:llm-error'>;
