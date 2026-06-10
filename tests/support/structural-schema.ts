/**
 * Lightweight structural JSON-Schema validator — TEST SUPPORT ONLY (CUT D2).
 *
 * Validates a value against the `CommandJsonSchema` subset the repo uses for
 * command input/output schemas: `{ type, properties?, required?, enum? }`.
 * Deliberately minimal — no `$ref`, no `additionalProperties`, no deep array
 * `items` validation beyond the declared property types. It checks the STABLE
 * contract (top-level + declared property types/required), not internal guts.
 *
 * Not a dependency, not exported from `@czap/command`: D2 is schema LAW, not a
 * runtime validation framework. Promote with evidence if a later cut needs
 * runtime validation.
 *
 * @module
 */

import type { CommandJsonSchema } from '@czap/command';

/** The minimal JSON-Schema subset these schemas use. */
export interface StructuralSchema {
  readonly type?: string | readonly string[];
  readonly properties?: Readonly<Record<string, unknown>>;
  readonly required?: readonly string[];
  readonly enum?: readonly unknown[];
}

function typeOf(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function check(schema: StructuralSchema, value: unknown, path: string, errors: string[]): void {
  if (schema.type !== undefined) {
    const allowed = Array.isArray(schema.type) ? schema.type : [schema.type];
    const actual = typeOf(value);
    if (!allowed.includes(actual)) {
      errors.push(`${path}: expected type ${allowed.join('|')}, got ${actual}`);
      return; // a type mismatch makes deeper checks meaningless
    }
  }
  if (schema.enum !== undefined && !schema.enum.includes(value)) {
    errors.push(`${path}: ${JSON.stringify(value)} is not one of ${JSON.stringify(schema.enum)}`);
  }
  if (typeOf(value) === 'object' && schema.properties) {
    const obj = value as Record<string, unknown>;
    for (const req of schema.required ?? []) {
      if (!(req in obj)) errors.push(`${path}: missing required property '${req}'`);
    }
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      if (key in obj && propSchema && typeof propSchema === 'object') {
        check(propSchema as StructuralSchema, obj[key], `${path}.${key}`, errors);
      }
    }
  }
}

/** Returns `[]` when `value` conforms to `schema`, else a list of human-readable errors. */
export function validateStructural(schema: StructuralSchema, value: unknown): readonly string[] {
  const errors: string[] = [];
  check(schema, value, '$', errors);
  return errors;
}

// Compile-time conformance: every CommandJsonSchema (the production command
// input/output contract from @czap/command) is validatable as a
// StructuralSchema. If the production schema shape grows past this subset,
// the build breaks here instead of the validator silently under-checking.
const _commandSchemaIsStructural = (schema: CommandJsonSchema): StructuralSchema => schema;
void _commandSchemaIsStructural;
