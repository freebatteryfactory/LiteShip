/** Exhaustive parsing laws for every value-taking CLI flag spelling. */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { takeFlagValue } from '../../packages/cli/src/internal/argv.js';

const flag = fc.stringMatching(/^--[a-z][a-z0-9-]{0,20}$/u);
const shortFlag = fc.stringMatching(/^-[a-z]$/u);
const value = fc
  .string({ minLength: 1, maxLength: 40 })
  .filter((candidate) => !candidate.startsWith('-') && candidate.trim().length > 0);
const whitespace = fc.stringMatching(/^\s{0,20}$/u);

describe('value-taking flag matrix', () => {
  it('treats every inline whitespace-only spelling as present but missing', () => {
    fc.assert(
      fc.property(flag, whitespace, (name, blank) => {
        expect(takeFlagValue([`${name}=${blank}`], name)).toEqual({ present: true, value: undefined });
      }),
      { seed: 0xf1a6_0101, numRuns: 300 },
    );
  });

  it('treats every space-form whitespace-only spelling as present but missing', () => {
    fc.assert(
      fc.property(flag, whitespace, (name, blank) => {
        expect(takeFlagValue([name, blank], name)).toEqual({ present: true, value: undefined });
      }),
      { seed: 0xf1a6_0102, numRuns: 300 },
    );
  });

  it('preserves nonblank authored values exactly in both forms', () => {
    fc.assert(
      fc.property(flag, value, (name, authored) => {
        expect(takeFlagValue([name, authored], name)).toEqual({ present: true, value: authored });
        expect(takeFlagValue([`${name}=${authored}`], name)).toEqual({ present: true, value: authored });
      }),
      { seed: 0xf1a6_0103, numRuns: 300 },
    );
  });

  it('never consumes any following long or short flag as a value', () => {
    fc.assert(
      fc.property(flag, fc.oneof(flag, shortFlag), (name, next) => {
        expect(takeFlagValue([name, next], name)).toEqual({ present: true, value: undefined });
      }),
      { seed: 0xf1a6_0104, numRuns: 300 },
    );
  });

  it('accepts an inline value beginning with a dash because its boundary is explicit', () => {
    fc.assert(
      fc.property(flag, flag, (name, authored) => {
        expect(takeFlagValue([`${name}=${authored}`], name)).toEqual({ present: true, value: authored });
      }),
      { seed: 0xf1a6_0105, numRuns: 200 },
    );
  });

  it('uses the first authored occurrence across arbitrary aliases and forms', () => {
    fc.assert(
      fc.property(shortFlag, flag, value, value, fc.boolean(), (short, long, first, second, inline) => {
        fc.pre(short !== long);
        const argv = inline ? [`${long}=${first}`, short, second] : [short, first, `${long}=${second}`];
        expect(takeFlagValue(argv, [short, long])).toEqual({ present: true, value: first });
      }),
      { seed: 0xf1a6_0106, numRuns: 300 },
    );
  });

  it('does not match prefixes, suffixes, or embedded flag text', () => {
    fc.assert(
      fc.property(flag, value, (name, authored) => {
        expect(takeFlagValue([`prefix${name}`, authored], name)).toEqual({ present: false, value: undefined });
        expect(takeFlagValue([`${name}-suffix`, authored], name)).toEqual({ present: false, value: undefined });
        expect(takeFlagValue([`x=${name}=${authored}`], name)).toEqual({ present: false, value: undefined });
      }),
      { seed: 0xf1a6_0107, numRuns: 250 },
    );
  });

  it('is deterministic under unrelated prefix and suffix argv noise', () => {
    fc.assert(
      fc.property(
        flag,
        value,
        fc.array(value, { maxLength: 10 }),
        fc.array(value, { maxLength: 10 }),
        (name, authored, before, after) => {
          const expected = takeFlagValue([name, authored], name);
          expect(takeFlagValue([...before, name, authored, ...after], name)).toEqual(expected);
        },
      ),
      { seed: 0xf1a6_0108, numRuns: 250 },
    );
  });

  it('distinguishes a missing flag from every present-but-missing representation', () => {
    fc.assert(
      fc.property(flag, whitespace, (name, blank) => {
        expect(takeFlagValue([], name)).toEqual({ present: false, value: undefined });
        expect(takeFlagValue([name], name)).toEqual({ present: true, value: undefined });
        expect(takeFlagValue([`${name}=${blank}`], name)).toEqual({ present: true, value: undefined });
        expect(takeFlagValue([name, blank], name)).toEqual({ present: true, value: undefined });
      }),
      { seed: 0xf1a6_0109, numRuns: 200 },
    );
  });
});
