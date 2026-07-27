import { COMMAND_CATALOG } from '@liteship/command';
import type { CapsuleCommandDescriptor } from '@liteship/core';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { catalogCliFlagNames, hasDispatchExecutor } from '../../packages/cli/src/dispatch.js';
import { takeFlagValue } from '../../packages/cli/src/internal/argv.js';

const descriptorArbitrary = fc.constantFrom(...COMMAND_CATALOG);

function invocation(descriptor: CapsuleCommandDescriptor): readonly string[] {
  return descriptor.name.split('.');
}

function isValueSchema(schema: unknown): boolean {
  if (typeof schema !== 'object' || schema === null) return false;
  const value = schema as { readonly type?: unknown; readonly enum?: unknown };
  return value.type === 'string' || Array.isArray(value.enum);
}

function valueFlags(descriptor: CapsuleCommandDescriptor): readonly string[] {
  const positionals = new Set(descriptor.cli?.positionals ?? []);
  const semantic = Object.entries(descriptor.inputSchema.properties ?? {})
    .filter(([property, schema]) => !positionals.has(property) && isValueSchema(schema))
    .map(([property]) => `--${property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`);
  const adapter = Object.entries(descriptor.cli?.adapterFlags ?? {})
    .filter(([, schema]) => schema.type === 'string')
    .map(([flag]) => flag);
  return [...semantic, ...adapter];
}

describe('catalog-owned CLI projection properties', () => {
  it('projects every dotted identity to a space-separated invocable top-level route', () => {
    fc.assert(
      fc.property(descriptorArbitrary, (descriptor) => {
        const tokens = invocation(descriptor);
        expect(tokens).not.toHaveLength(0);
        expect(tokens.every((token) => token.length > 0 && !token.includes('.'))).toBe(true);
        expect(hasDispatchExecutor(tokens[0]!)).toBe(true);
      }),
      { seed: 0xc11c_0101, numRuns: 250 },
    );
  });

  it('projects a unique, well-formed flag set and never reclassifies positionals as flags', () => {
    fc.assert(
      fc.property(descriptorArbitrary, (descriptor) => {
        const flags = catalogCliFlagNames(descriptor.name);
        expect(new Set(flags).size).toBe(flags.length);
        expect(flags.every((flag) => /^--[a-z][a-z0-9-]*$|^-[a-z]$/u.test(flag))).toBe(true);
        for (const positional of descriptor.cli?.positionals ?? []) {
          expect(flags).not.toContain(`--${positional}`);
        }
      }),
      { seed: 0xc11c_0102, numRuns: 250 },
    );
  });

  it('round-trips every catalog-declared value flag without swallowing the next flag', () => {
    const cases = COMMAND_CATALOG.flatMap((descriptor) =>
      valueFlags(descriptor).map((flag) => ({ command: descriptor.name, flag })),
    );
    expect(cases.length).toBeGreaterThan(0);

    fc.assert(
      fc.property(
        fc.constantFrom(...cases),
        fc.string({ minLength: 1, maxLength: 48 }).filter((value) => !value.startsWith('-') && value.trim() !== ''),
        fc.constantFrom('--json', '--force', '--no-cache'),
        ({ command, flag }, value, nextFlag) => {
          expect(catalogCliFlagNames(command)).toContain(flag);
          expect(takeFlagValue([flag, value], flag)).toEqual({ present: true, value });
          expect(takeFlagValue([`${flag}=${value}`], flag)).toEqual({ present: true, value });
          expect(takeFlagValue([flag, nextFlag], flag)).toEqual({ present: true, value: undefined });
        },
      ),
      { seed: 0xc11c_0103, numRuns: 400 },
    );
  });

  it('keeps output modes inside the closed JSON/text/process algebra', () => {
    fc.assert(
      fc.property(descriptorArbitrary, (descriptor) => {
        expect(['json', 'text', 'process']).toContain(descriptor.cli?.outputMode);
      }),
      { seed: 0xc11c_0104, numRuns: 250 },
    );
  });
});
