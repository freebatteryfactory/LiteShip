/**
 * Runtime domain admitted by LiteShip's canonical-CBOR byte law.
 *
 * The encoder accepts data, not arbitrary host objects. Records must use the
 * ordinary or null prototype and expose enumerable own data properties only;
 * arrays may not smuggle extra enumerable properties. Cycles, accessors,
 * symbols, class instances, and other host objects are outside the portable
 * byte domain.
 *
 * @module
 */

/** One value that has a portable LiteShip canonical-CBOR representation. */
export type CanonicalCborValue =
  | undefined
  | null
  | boolean
  | number
  | string
  | Uint8Array
  | readonly CanonicalCborValue[]
  | { readonly [key: string]: CanonicalCborValue };

/** True only for an ordinary or null-prototype record. */
export function isCanonicalCborRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value) || value instanceof Uint8Array) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value) as object | null;
  return prototype === Object.prototype || prototype === null;
}

function isArrayIndex(key: string, length: number): boolean {
  if (!/^(?:0|[1-9]\d*)$/.test(key)) return false;
  const index = Number(key);
  return Number.isSafeInteger(index) && index >= 0 && index < length && String(index) === key;
}

/**
 * Admit the complete portable value graph without invoking authored getters.
 *
 * The walk is cycle-aware. It deliberately treats array holes as `undefined`
 * because the encoder projects both to canonical `null` array members.
 */
export function isCanonicalCborValue(value: unknown): value is CanonicalCborValue {
  const ancestors = new WeakSet<object>();

  const visit = (current: unknown): boolean => {
    if (
      current === undefined ||
      current === null ||
      typeof current === 'boolean' ||
      typeof current === 'number' ||
      typeof current === 'string'
    ) {
      return true;
    }
    if (current instanceof Uint8Array) return true;
    if (typeof current !== 'object') return false;
    if (ancestors.has(current)) return false;

    ancestors.add(current);
    try {
      if (Array.isArray(current)) {
        if (Object.getOwnPropertySymbols(current).some((symbol) => Object.propertyIsEnumerable.call(current, symbol))) {
          return false;
        }
        for (const key of Object.keys(current)) {
          if (!isArrayIndex(key, current.length)) return false;
          const descriptor = Object.getOwnPropertyDescriptor(current, key);
          if (descriptor === undefined || !('value' in descriptor) || !visit(descriptor.value)) return false;
        }
        return true;
      }

      if (!isCanonicalCborRecord(current)) return false;
      if (Object.getOwnPropertySymbols(current).some((symbol) => Object.propertyIsEnumerable.call(current, symbol))) {
        return false;
      }
      for (const key of Object.keys(current)) {
        const descriptor = Object.getOwnPropertyDescriptor(current, key);
        if (descriptor === undefined || !('value' in descriptor) || !visit(descriptor.value)) return false;
      }
      return true;
    } finally {
      ancestors.delete(current);
    }
  };

  return visit(value);
}
