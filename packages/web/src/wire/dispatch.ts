/**
 * Typed CustomEvent dispatch and subscription over {@link CzapEventDetailMap}.
 *
 * @module
 */

import type { CzapEventDetailMap, CzapEventName } from './czap-events.js';

/** Teardown for {@link onCzap} subscriptions. */
export type CzapEventDisposer = () => void;

type DetailArg<N extends CzapEventName> = CzapEventDetailMap[N] extends undefined
  ? readonly []
  : readonly [detail: CzapEventDetailMap[N]];

function eventDetail<N extends CzapEventName>(name: N, rest: DetailArg<N>): CzapEventDetailMap[N] | undefined {
  return rest[0] as CzapEventDetailMap[N] | undefined;
}

/**
 * Dispatch a canonical `czap:*` event on `target`. Detail is required by the type
 * system when the registry entry carries a payload; omitted otherwise.
 */
export function dispatchCzapEvent<N extends CzapEventName>(
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

/** Subscribe to a canonical `czap:*` event; handler receives typed `detail`. */
export function onCzap<N extends CzapEventName>(
  target: EventTarget,
  name: N,
  handler: (detail: CzapEventDetailMap[N]) => void,
  options?: boolean | AddEventListenerOptions,
): CzapEventDisposer {
  const listener = (event: Event): void => {
    if (!(event instanceof CustomEvent)) {
      handler(undefined as CzapEventDetailMap[N]);
      return;
    }
    handler(event.detail as CzapEventDetailMap[N]);
  };
  target.addEventListener(name, listener, options);
  return () => target.removeEventListener(name, listener, options);
}
