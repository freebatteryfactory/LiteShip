/**
 * Adapt a typed CustomEvent callback to the DOM's untyped string-event seam.
 * The runtime check preserves the callback's real event contract without an
 * unsafe parameter-variance cast: a non-CustomEvent is a broken fixture.
 */
export function customEventListener<T>(listener: (event: CustomEvent<T>) => void): EventListener {
  return (event) => {
    if (!(event instanceof CustomEvent)) {
      throw new TypeError(`expected CustomEvent, received ${event.constructor.name}`);
    }
    listener(event);
  };
}
