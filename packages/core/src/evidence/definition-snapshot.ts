/**
 * Snapshot authored definition data before identity minting and storage.
 *
 * Plain records and arrays are recursively copied and frozen. Mutable byte
 * strings are refused: JavaScript cannot freeze a non-empty typed array, so
 * retaining one would expose mutable behavior under an already-minted address.
 *
 * @module
 */

import { UnsupportedError } from '@liteship/error';
import type { DeepReadonly } from '../schema/types.js';

function unsupported(path: string, detail: string): never {
  throw UnsupportedError('definition value', `${path} ${detail}`);
}

/**
 * Recursively copy authored data into the definition's ownership boundary.
 * Cycles, accessors, functions, symbols, bigint values, and custom prototypes
 * are outside the canonical definition-value subset and are refused loudly.
 */
export function snapshotDefinitionValue<T>(value: T): DeepReadonly<T> {
  const ancestors = new WeakSet<object>();

  const snapshot = (current: unknown, path: string): unknown => {
    if (
      current === undefined ||
      current === null ||
      typeof current === 'string' ||
      typeof current === 'number' ||
      typeof current === 'boolean'
    ) {
      return current;
    }
    if (typeof current !== 'object') {
      return unsupported(path, `contains unsupported ${typeof current} data.`);
    }
    if (current instanceof Uint8Array) {
      return unsupported(path, 'contains mutable byte-string data.');
    }
    if (ancestors.has(current)) {
      return unsupported(path, 'contains a cycle.');
    }

    ancestors.add(current);
    try {
      if (Array.isArray(current)) {
        return Object.freeze(current.map((entry, index) => snapshot(entry, `${path}[${index}]`)));
      }

      const prototype = Object.getPrototypeOf(current) as object | null;
      if (prototype !== Object.prototype && prototype !== null) {
        return unsupported(path, 'uses a custom object prototype.');
      }
      if (Object.getOwnPropertySymbols(current).some((symbol) => Object.propertyIsEnumerable.call(current, symbol))) {
        return unsupported(path, 'contains an enumerable symbol key.');
      }

      const copy: Record<string, unknown> = Object.create(prototype) as Record<string, unknown>;
      for (const key of Object.keys(current)) {
        const descriptor = Object.getOwnPropertyDescriptor(current, key);
        if (descriptor === undefined || !('value' in descriptor)) {
          return unsupported(`${path}.${key}`, 'uses an accessor property.');
        }
        copy[key] = snapshot(descriptor.value, `${path}.${key}`);
      }
      return Object.freeze(copy);
    } finally {
      ancestors.delete(current);
    }
  };

  return snapshot(value, '$') as DeepReadonly<T>;
}
