/**
 * Safe Object.defineProperty wrapper that integrates with vitest cleanup.
 * Returns a restore function.
 */
export function definePropertyStub(
  target: object,
  property: string,
  descriptor: PropertyDescriptor,
): () => void {
  const original = Object.getOwnPropertyDescriptor(target, property);
  Object.defineProperty(target, property, { ...descriptor, configurable: true });
  return () => {
    if (original) {
      Object.defineProperty(target, property, original);
    } else {
      delete (target as Record<string, unknown>)[property];
    }
  };
}

/**
 * Accumulates restore functions and runs them all at once.
 * Use with afterEach: `afterEach(() => stubs.restoreAll())`
 */
export function createStubRegistry() {
  const restores: Array<() => void> = [];
  return {
    define(target: object, property: string, descriptor: PropertyDescriptor) {
      restores.push(definePropertyStub(target, property, descriptor));
    },
    restoreAll() {
      while (restores.length) restores.pop()!();
    },
  };
}
