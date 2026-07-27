import type { QueryLengthUnit } from './types.js';

const QUERY_LENGTH_UNITS = Object.freeze(['px', 'em', 'rem'] as const);

/**
 * The deliberately narrow length grammar shared by breakpoint migration.
 *
 * This is an internal compiler contract, not a CSS-wide length parser. The
 * adapters can faithfully lower finite non-negative thresholds expressed in
 * pixels or in a host-resolved relative unit. Unitless syntax is accepted only
 * for zero, and authored relative units are preserved rather than guessed as a
 * pixel scalar.
 */
export const QUERY_LENGTH_GRAMMAR = Object.freeze({
  id: 'query-length/v1',
  units: QUERY_LENGTH_UNITS,
  minimum: 0,
  unitless: 'zero-only',
  finite: true,
  preservesAuthoredUnit: true,
} as const);

const QUERY_LENGTH_PATTERN = new RegExp(
  `^([+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:e[+-]?\\d+)?)(${QUERY_LENGTH_GRAMMAR.units.join('|')})?$`,
  'i',
);

/** A query length whose authored unit has not been collapsed into pixels. */
export interface ParsedQueryLength {
  readonly value: number;
  readonly unit: QueryLengthUnit;
}

/**
 * Parse the query-length subset shared by media, Tailwind, and container
 * migration. Relative units remain relative; the host must provide a signal in
 * that unit. Unitless zero is retained as its own unit because it is valid in
 * every length domain, while unitless non-zero values are refused.
 */
export function parseQueryLength(raw: string): ParsedQueryLength | null {
  const match = QUERY_LENGTH_PATTERN.exec(raw.trim());
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value < QUERY_LENGTH_GRAMMAR.minimum) return null;
  const normalizedValue = Object.is(value, -0) ? 0 : value;
  const authoredUnit = match[2]?.toLowerCase() as Exclude<QueryLengthUnit, 'zero'> | undefined;
  if (authoredUnit === undefined) return normalizedValue === 0 ? { value: normalizedValue, unit: 'zero' } : null;
  return { value: normalizedValue, unit: authoredUnit };
}
