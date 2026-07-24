/** Runtime admission helpers for JavaScript callers of immutable authoring verbs. @module */

import { ValidationError } from '@liteship/error';

/** A runtime-admitted plain authoring object. */
export type InputRecord = Readonly<Record<string, unknown>>;

const MAX_LISTED_KEYS = 12;

function listed(values: readonly string[]): string {
  const visible = values.slice(0, MAX_LISTED_KEYS);
  return `${visible.join(', ')}${values.length > visible.length ? `, … (+${values.length - visible.length})` : ''}`;
}

/** Admit one exact-key plain object or throw a bounded owner-tagged error. */
export function inputRecord(
  value: unknown,
  module: string,
  allowedKeys: readonly string[],
  requiredKeys: readonly string[] = [],
): InputRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw ValidationError(module, 'input must be a plain object. Pass the documented authoring record.');
  }
  const prototype = Object.getPrototypeOf(value) as unknown;
  if (prototype !== Object.prototype && prototype !== null) {
    throw ValidationError(module, 'input must be a plain object, not a class instance or custom prototype.');
  }
  const record = value as InputRecord;
  const keys = Object.keys(record);
  const foreign = keys.filter((key) => !allowedKeys.includes(key));
  if (foreign.length > 0) {
    throw ValidationError(module, `unknown input field(s): ${listed(foreign.sort())}. Remove unsupported fields.`);
  }
  const missing = requiredKeys.filter((key) => !Object.hasOwn(record, key));
  if (missing.length > 0) {
    throw ValidationError(module, `missing required field(s): ${listed(missing)}. Add the documented field(s).`);
  }
  return record;
}

/** Admit a non-empty string field. */
export function nonEmptyString(value: unknown, module: string, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw ValidationError(module, `${field} must be a non-empty string.`);
  }
  return value;
}

/** Admit one finite numeric field. */
export function finiteNumber(value: unknown, module: string, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw ValidationError(module, `${field} must be a finite number.`);
  }
  return value;
}

/** Admit one boolean field. */
export function booleanValue(value: unknown, module: string, field: string): boolean {
  if (typeof value !== 'boolean') throw ValidationError(module, `${field} must be a boolean.`);
  return value;
}

/** Admit an array whose every member is a string. */
export function stringArray(value: unknown, module: string, field: string): readonly string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw ValidationError(module, `${field} must be an array of strings.`);
  }
  return value;
}
