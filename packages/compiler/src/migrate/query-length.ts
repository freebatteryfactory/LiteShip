import type { QueryLengthUnit } from './types.js';

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
  const match = /^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)(px|em|rem)?$/i.exec(raw.trim());
  if (!match) return null;
  const value = Number(match[1]);
  const authoredUnit = match[2]?.toLowerCase() as Exclude<QueryLengthUnit, 'zero'> | undefined;
  if (authoredUnit === undefined) return value === 0 ? { value, unit: 'zero' } : null;
  return { value, unit: authoredUnit };
}
