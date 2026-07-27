/**
 * Strict admission for the runtime motion floor.
 *
 * A {@link RuntimeWritePlan} crosses JSON, Astro, and Scene boundaries. Its
 * TypeScript interface is not proof that an external value carries finite
 * numeric leaves, a complete easing descriptor, or faithful window bounds.
 * This module is the one fail-closed reader and immutable ownership boundary
 * for that wire value.
 *
 * @module
 */

import { ValidationError } from '@liteship/error';
import { snapshotDefinitionValue } from '../evidence/definition-snapshot.js';
import { StateName } from '../schema/brands.js';
import { schema } from '../schema/constructors.js';
import type { EdgeType } from '../authoring/plan.js';
import type { RuntimeEasing } from './easing.js';
import type { RuntimeWritePlan, RuntimeWriteProperty, RuntimeWriteWindow } from './interpret-transition.js';
import type { TransformPart, TypedValue } from './interpolate.js';

const EDGE_TYPES: ReadonlySet<string> = new Set(['seq', 'par', 'choice_then', 'choice_else']);
const EASING_KINDS: ReadonlySet<string> = new Set([
  'linear',
  'ease',
  'spring',
  'points',
  'bounce',
  'elastic',
  'back',
  'cubicBezier',
]);
const POINT_BASED_EASING_KINDS: ReadonlySet<string> = new Set(['points', 'bounce', 'elastic', 'back', 'cubicBezier']);
const LENGTH_UNITS: ReadonlySet<string> = new Set(['px', 'rem', '%', 'vw', 'vh']);
const ANGLE_UNITS: ReadonlySet<string> = new Set(['deg', 'rad', 'turn']);
const COLOR_SPACES: ReadonlySet<string> = new Set(['srgb', 'oklch']);

type DataRecord = Record<string, unknown>;

function invalid(path: string, message: string): never {
  throw ValidationError('RuntimeWritePlan', `${path}: ${message}`);
}

function recordAt(value: unknown, path: string, seen: WeakSet<object>): DataRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return invalid(path, 'expected an object');
  }
  if (seen.has(value)) return invalid(path, 'cycles are not valid motion data');
  const prototype = Object.getPrototypeOf(value) as object | null;
  if (prototype !== Object.prototype && prototype !== null) {
    return invalid(path, 'custom object prototypes are not valid motion data');
  }
  if (Object.getOwnPropertySymbols(value).some((symbol) => Object.propertyIsEnumerable.call(value, symbol))) {
    return invalid(path, 'enumerable symbol keys are not valid motion data');
  }
  seen.add(value);
  return value as DataRecord;
}

function dataAt(record: DataRecord, key: string, path: string): { readonly present: boolean; readonly value: unknown } {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (descriptor === undefined) return { present: false, value: undefined };
  if (!('value' in descriptor)) return invalid(`${path}.${key}`, 'accessor properties are not valid motion data');
  return { present: true, value: descriptor.value };
}

function exactKeys(record: DataRecord, allowed: readonly string[], path: string): void {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(record)) {
    if (!allowedSet.has(key)) invalid(`${path}.${key}`, 'unknown field');
  }
}

function required(record: DataRecord, key: string, path: string): unknown {
  const slot = dataAt(record, key, path);
  if (!slot.present) return invalid(`${path}.${key}`, 'missing required field');
  return slot.value;
}

function finiteNumber(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return invalid(path, 'expected a finite number');
  return value;
}

function nonNegativeNumber(value: unknown, path: string): number {
  const number = finiteNumber(value, path);
  if (number < 0) return invalid(path, 'expected a non-negative number');
  return number;
}

function nonEmptyString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.length === 0) return invalid(path, 'expected a non-empty string');
  return value;
}

function arrayAt(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value)) return invalid(path, 'expected an array');
  return value;
}

function typedValueAt(value: unknown, path: string, seen: WeakSet<object>): TypedValue {
  const record = recordAt(value, path, seen);
  try {
    const kind = required(record, 'k', path);
    if (typeof kind !== 'string') return invalid(`${path}.k`, 'expected a typed-value kind');
    switch (kind) {
      case 'number':
      case 'opacity': {
        exactKeys(record, ['k', 'v'], path);
        return { k: kind, v: finiteNumber(required(record, 'v', path), `${path}.v`) };
      }
      case 'length': {
        exactKeys(record, ['k', 'v', 'unit'], path);
        const unit = required(record, 'unit', path);
        if (typeof unit !== 'string' || !LENGTH_UNITS.has(unit)) return invalid(`${path}.unit`, 'unknown length unit');
        return { k: 'length', v: finiteNumber(required(record, 'v', path), `${path}.v`), unit: unit as 'px' };
      }
      case 'angle': {
        exactKeys(record, ['k', 'v', 'unit'], path);
        const unit = required(record, 'unit', path);
        if (typeof unit !== 'string' || !ANGLE_UNITS.has(unit)) return invalid(`${path}.unit`, 'unknown angle unit');
        return { k: 'angle', v: finiteNumber(required(record, 'v', path), `${path}.v`), unit: unit as 'deg' };
      }
      case 'color': {
        exactKeys(record, ['k', 'space', 'components'], path);
        const space = required(record, 'space', path);
        if (typeof space !== 'string' || !COLOR_SPACES.has(space))
          return invalid(`${path}.space`, 'unknown color space');
        const rawComponents = arrayAt(required(record, 'components', path), `${path}.components`);
        if (rawComponents.length < 3 || rawComponents.length > 4) {
          return invalid(`${path}.components`, 'expected three color channels and an optional alpha channel');
        }
        const components = rawComponents.map((component, index) =>
          finiteNumber(component, `${path}.components[${index}]`),
        );
        return { k: 'color', space: space as 'srgb', components };
      }
      case 'transform': {
        exactKeys(record, ['k', 'parts'], path);
        const parts = arrayAt(required(record, 'parts', path), `${path}.parts`).map((part, index) =>
          transformPartAt(part, `${path}.parts[${index}]`, seen),
        );
        return { k: 'transform', parts };
      }
      default:
        return invalid(`${path}.k`, `unknown typed-value kind ${JSON.stringify(kind)}`);
    }
  } finally {
    seen.delete(record);
  }
}

/** Strictly decode and snapshot one standalone typed motion value. */
export function decodeTypedValue(value: unknown): TypedValue {
  return snapshotDefinitionValue(typedValueAt(value, '$', new WeakSet<object>())) as TypedValue;
}

function transformPartAt(value: unknown, path: string, seen: WeakSet<object>): TransformPart {
  const record = recordAt(value, path, seen);
  try {
    exactKeys(record, ['fn', 'args'], path);
    const fn = nonEmptyString(required(record, 'fn', path), `${path}.fn`);
    const args = arrayAt(required(record, 'args', path), `${path}.args`).map((arg, index) =>
      typedValueAt(arg, `${path}.args[${index}]`, seen),
    );
    return { fn, args };
  } finally {
    seen.delete(record);
  }
}

function easingAt(value: unknown, path: string, seen: WeakSet<object>): RuntimeEasing {
  const record = recordAt(value, path, seen);
  try {
    exactKeys(record, ['kind', 'spring', 'points'], path);
    const kind = required(record, 'kind', path);
    if (typeof kind !== 'string' || !EASING_KINDS.has(kind)) return invalid(`${path}.kind`, 'unknown easing kind');

    const springSlot = dataAt(record, 'spring', path);
    let spring: RuntimeEasing['spring'];
    if (springSlot.present) {
      const springRecord = recordAt(springSlot.value, `${path}.spring`, seen);
      try {
        exactKeys(springRecord, ['stiffness', 'damping', 'mass'], `${path}.spring`);
        const stiffnessSlot = dataAt(springRecord, 'stiffness', `${path}.spring`);
        const dampingSlot = dataAt(springRecord, 'damping', `${path}.spring`);
        const massSlot = dataAt(springRecord, 'mass', `${path}.spring`);
        const stiffness = stiffnessSlot.present
          ? nonNegativeNumber(stiffnessSlot.value, `${path}.spring.stiffness`)
          : undefined;
        const damping = dampingSlot.present
          ? nonNegativeNumber(dampingSlot.value, `${path}.spring.damping`)
          : undefined;
        const mass = massSlot.present ? nonNegativeNumber(massSlot.value, `${path}.spring.mass`) : undefined;
        if (stiffness === 0) invalid(`${path}.spring.stiffness`, 'expected a positive number');
        if (mass === 0) invalid(`${path}.spring.mass`, 'expected a positive number');
        spring = {
          ...(stiffness !== undefined ? { stiffness } : {}),
          ...(damping !== undefined ? { damping } : {}),
          ...(mass !== undefined ? { mass } : {}),
        };
      } finally {
        seen.delete(springRecord);
      }
    }

    const pointsSlot = dataAt(record, 'points', path);
    let points: readonly number[] | undefined;
    if (pointsSlot.present) {
      const rawPoints = arrayAt(pointsSlot.value, `${path}.points`);
      if (rawPoints.length < 2) invalid(`${path}.points`, 'expected at least two samples');
      points = rawPoints.map((point, index) => finiteNumber(point, `${path}.points[${index}]`));
    }
    if (POINT_BASED_EASING_KINDS.has(kind) && points === undefined) {
      invalid(`${path}.points`, `${kind} easing requires its serialized sample points`);
    }

    return {
      kind: kind as RuntimeEasing['kind'],
      ...(spring !== undefined ? { spring } : {}),
      ...(points !== undefined ? { points } : {}),
    };
  } finally {
    seen.delete(record);
  }
}

function propertyAt(value: unknown, path: string, seen: WeakSet<object>): RuntimeWriteProperty {
  const record = recordAt(value, path, seen);
  try {
    exactKeys(record, ['cssVar', 'from', 'to'], path);
    return {
      cssVar: nonEmptyString(required(record, 'cssVar', path), `${path}.cssVar`),
      from: typedValueAt(required(record, 'from', path), `${path}.from`, seen),
      to: typedValueAt(required(record, 'to', path), `${path}.to`, seen),
    };
  } finally {
    seen.delete(record);
  }
}

function windowAt(value: unknown, path: string, seen: WeakSet<object>): RuntimeWriteWindow {
  const record = recordAt(value, path, seen);
  try {
    exactKeys(record, ['windowStart', 'windowEnd', 'properties', 'easing'], path);
    const windowStart = finiteNumber(required(record, 'windowStart', path), `${path}.windowStart`);
    const windowEnd = finiteNumber(required(record, 'windowEnd', path), `${path}.windowEnd`);
    if (windowStart < 0 || windowStart > 1) invalid(`${path}.windowStart`, 'expected a normalized value in [0,1]');
    if (windowEnd < 0 || windowEnd > 1) invalid(`${path}.windowEnd`, 'expected a normalized value in [0,1]');
    if (windowStart > windowEnd) invalid(path, 'windowStart must be <= windowEnd');
    return {
      windowStart,
      windowEnd,
      properties: arrayAt(required(record, 'properties', path), `${path}.properties`).map((property, index) =>
        propertyAt(property, `${path}.properties[${index}]`, seen),
      ),
      easing: easingAt(required(record, 'easing', path), `${path}.easing`, seen),
    };
  } finally {
    seen.delete(record);
  }
}

/**
 * Decode and recursively snapshot an untrusted runtime write plan.
 *
 * The decoder rejects foreign fields, getters, cycles, custom prototypes,
 * non-finite numeric leaves, malformed typed values, invalid easing payloads,
 * and non-normalized windows. The returned value is a recursively frozen copy;
 * caller mutation can never change an admitted motion program.
 *
 * @throws ValidationError when `value` is outside the runtime-plan grammar.
 */
export function decodeRuntimeWritePlan(value: unknown): RuntimeWritePlan {
  const seen = new WeakSet<object>();
  const record = recordAt(value, '$', seen);
  try {
    exactKeys(record, ['properties', 'durationMs', 'routing', 'fromState', 'toState', 'easing', 'windows'], '$');
    const routing = required(record, 'routing', '$');
    if (typeof routing !== 'string' || !EDGE_TYPES.has(routing)) invalid('$.routing', 'unknown plan edge type');
    const fromStateRaw = nonEmptyString(required(record, 'fromState', '$'), '$.fromState');
    const toStateRaw = nonEmptyString(required(record, 'toState', '$'), '$.toState');
    const windowsSlot = dataAt(record, 'windows', '$');
    const decoded: RuntimeWritePlan = {
      properties: arrayAt(required(record, 'properties', '$'), '$.properties').map((property, index) =>
        propertyAt(property, `$.properties[${index}]`, seen),
      ),
      durationMs: nonNegativeNumber(required(record, 'durationMs', '$'), '$.durationMs'),
      routing: routing as EdgeType,
      fromState: StateName(fromStateRaw),
      toState: StateName(toStateRaw),
      easing: easingAt(required(record, 'easing', '$'), '$.easing', seen),
      ...(windowsSlot.present
        ? {
            windows: arrayAt(windowsSlot.value, '$.windows').map((window, index) =>
              windowAt(window, `$.windows[${index}]`, seen),
            ),
          }
        : {}),
    };
    return snapshotDefinitionValue(decoded) as RuntimeWritePlan;
  } finally {
    seen.delete(record);
  }
}

/** Kernel schema used by typed admission points such as ECS Parts. */
export const RuntimeWritePlanSchema = schema.brand(schema.unknown, decodeRuntimeWritePlan, 'RuntimeWritePlan');

/** Kernel schema for typed motion leaves carried by projections such as Scene MotionSample. */
export const TypedValueSchema = schema.brand(schema.unknown, decodeTypedValue, 'TypedValue');
