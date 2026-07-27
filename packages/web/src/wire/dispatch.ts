/**
 * Typed CustomEvent dispatch and subscription over {@link LiteshipEventDetailMap}.
 *
 * @module
 */

import type { LiteshipEventDetailMap, LiteshipEventName } from './liteship-events.js';

/** Teardown for {@link onLiteship} subscriptions. */
export type LiteshipEventDisposer = () => void;

type DetailArg<N extends LiteshipEventName> = LiteshipEventDetailMap[N] extends undefined
  ? readonly []
  : readonly [detail: LiteshipEventDetailMap[N]];

function eventDetail<N extends LiteshipEventName>(name: N, rest: DetailArg<N>): LiteshipEventDetailMap[N] | undefined {
  return rest[0] as LiteshipEventDetailMap[N] | undefined;
}

/**
 * Dispatch a canonical `liteship:*` event on `target`. Detail is required by the type
 * system when the registry entry carries a payload; omitted otherwise.
 */
export function dispatchLiteshipEvent<N extends LiteshipEventName>(
  target: EventTarget,
  name: N,
  ...rest: DetailArg<N>
): boolean {
  const detail = eventDetail(name, rest);
  return target.dispatchEvent(
    new CustomEvent(name, {
      ...(detail !== undefined ? { detail } : {}),
      bubbles: true,
    }),
  );
}

/** Subscribe to a canonical `liteship:*` event; handler receives typed `detail`. */
export function onLiteship<N extends LiteshipEventName>(
  target: EventTarget,
  name: N,
  handler: (detail: LiteshipEventDetailMap[N]) => void,
  options?: boolean | AddEventListenerOptions,
): LiteshipEventDisposer {
  const listener = (event: Event): void => {
    if (!(event instanceof CustomEvent)) {
      handler(undefined as LiteshipEventDetailMap[N]);
      return;
    }
    handler(event.detail as LiteshipEventDetailMap[N]);
  };
  target.addEventListener(name, listener, options);
  return () => target.removeEventListener(name, listener, options);
}
