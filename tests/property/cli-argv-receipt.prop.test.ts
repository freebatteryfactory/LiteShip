import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { positional, takeFlagValue } from '../../packages/cli/src/lib/argv.js';

const token = fc
  .string({ minLength: 1, maxLength: 32 })
  .filter((value) => !value.startsWith('-') && !value.includes('\0') && value.trim().length > 0);

describe('CLI argv value laws', () => {
  it('round-trips arbitrary inline and space-separated values', () => {
    fc.assert(
      fc.property(token, fc.boolean(), (value, inline) => {
        const argv = inline ? [`--profile=${value}`] : ['--profile', value];
        expect(takeFlagValue(argv, '--profile')).toEqual({ present: true, value });
      }),
    );
  });

  it('never consumes another flag as a value', () => {
    fc.assert(
      fc.property(fc.constantFrom('--fix', '--json', '-o', '--profile=quick'), (next) => {
        expect(takeFlagValue(['--profile', next], '--profile')).toEqual({
          present: true,
          value: undefined,
        });
      }),
    );
  });

  it('uses the first authored occurrence across aliases and forms', () => {
    fc.assert(
      fc.property(token, token, (first, second) => {
        expect(takeFlagValue(['-o', first, `--output=${second}`], ['-o', '--output'])).toEqual({
          present: true,
          value: first,
        });
        expect(takeFlagValue([`--output=${first}`, '-o', second], ['-o', '--output'])).toEqual({
          present: true,
          value: first,
        });
      }),
    );
  });

  it('distinguishes absence from presence while refusing every blank value spelling', () => {
    expect(takeFlagValue([], '--profile')).toEqual({ present: false, value: undefined });
    expect(takeFlagValue(['--profile'], '--profile')).toEqual({ present: true, value: undefined });
    expect(takeFlagValue(['--profile='], '--profile')).toEqual({ present: true, value: undefined });
    expect(takeFlagValue(['--profile=   '], '--profile')).toEqual({ present: true, value: undefined });
    expect(takeFlagValue(['--profile', '   '], '--profile')).toEqual({ present: true, value: undefined });
  });

  it('admits only the first non-flag token as the positional argument', () => {
    fc.assert(
      fc.property(token, (value) => {
        expect(positional([value, '--json'])).toBe(value);
        expect(positional(['--json', value])).toBeUndefined();
      }),
    );
  });
});
