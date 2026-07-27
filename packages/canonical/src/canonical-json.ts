/**
 * Canonical JSON projection for JSON-protocol identities.
 *
 * Object keys are ordered recursively while array order remains semantic. The
 * admitted domain is deliberately narrower than arbitrary JavaScript values:
 * only finite JSON primitives, dense arrays, and plain data records are
 * accepted. Cycles, accessors, symbols, class instances, sparse arrays, and
 * unsupported scalar types fail loudly instead of acquiring misleading bytes.
 *
 * @module
 */

import { ValidationError } from '@liteship/error';

type JsonRecord = Readonly<Record<string, unknown>>;

function isPlainRecord(value: object): value is JsonRecord {
  const prototype = Object.getPrototypeOf(value) as object | null;
  return prototype === Object.prototype || prototype === null;
}

function pathKey(path: string, key: string): string {
  return `${path}[${JSON.stringify(key)}]`;
}

function encodePrimitive(value: null | boolean | number | string): string {
  const encoded = JSON.stringify(value);
  if (encoded === undefined) throw ValidationError('canonicalJson', 'primitive has no JSON representation');
  return encoded;
}

/** Serialize one portable JSON value with recursively sorted record keys. */
export function canonicalJson(value: unknown): string {
  const ancestors = new WeakSet<object>();

  const encode = (current: unknown, path: string): string => {
    if (current === null || typeof current === 'string' || typeof current === 'boolean') {
      return encodePrimitive(current);
    }
    if (typeof current === 'number') {
      if (!Number.isFinite(current)) throw ValidationError('canonicalJson', `${path} must contain only finite numbers`);
      return encodePrimitive(current);
    }
    if (typeof current !== 'object') {
      throw ValidationError('canonicalJson', `${path} cannot contain ${typeof current}`);
    }
    if (ancestors.has(current)) throw ValidationError('canonicalJson', `${path} cannot contain a cycle`);

    ancestors.add(current);
    try {
      if (Array.isArray(current)) {
        if (Object.getOwnPropertySymbols(current).some((symbol) => Object.propertyIsEnumerable.call(current, symbol))) {
          throw ValidationError('canonicalJson', `${path} cannot contain enumerable symbol keys`);
        }
        const encoded: string[] = [];
        for (let index = 0; index < current.length; index += 1) {
          if (!Object.hasOwn(current, index)) throw ValidationError('canonicalJson', `${path} must be a dense array`);
          const descriptor = Object.getOwnPropertyDescriptor(current, String(index));
          if (descriptor === undefined || !('value' in descriptor)) {
            throw ValidationError('canonicalJson', `${path}[${index}] must be a data property`);
          }
          encoded.push(encode(descriptor.value, `${path}[${index}]`));
        }
        const foreignKeys = Object.keys(current).filter((key) => !/^(?:0|[1-9]\d*)$/u.test(key));
        if (foreignKeys.length > 0) throw ValidationError('canonicalJson', `${path} contains non-index array keys`);
        return `[${encoded.join(',')}]`;
      }

      if (!isPlainRecord(current)) throw ValidationError('canonicalJson', `${path} must contain only plain records`);
      if (Object.getOwnPropertySymbols(current).some((symbol) => Object.propertyIsEnumerable.call(current, symbol))) {
        throw ValidationError('canonicalJson', `${path} cannot contain enumerable symbol keys`);
      }
      const entries: string[] = [];
      for (const key of Object.keys(current).sort()) {
        const descriptor = Object.getOwnPropertyDescriptor(current, key);
        if (descriptor === undefined || !('value' in descriptor)) {
          throw ValidationError('canonicalJson', `${pathKey(path, key)} must be a data property`);
        }
        entries.push(`${JSON.stringify(key)}:${encode(descriptor.value, pathKey(path, key))}`);
      }
      return `{${entries.join(',')}}`;
    } finally {
      ancestors.delete(current);
    }
  };

  return encode(value, 'canonical JSON value');
}
