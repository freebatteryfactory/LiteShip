/**
 * Unit tests for the ANSI color/glyph helper. Verifies that NO_COLOR
 * and FORCE_COLOR override TTY detection, and that the no-color path
 * returns the unchanged input.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import {
  arrow,
  bearingGlyph,
  color,
  colorEnabled,
  header,
  label,
  stripTerminalControlSequences,
} from '../../../../packages/cli/src/internal/ansi.js';

const ESC = '\x1b';

describe('ansi helper', () => {
  const origNoColor = process.env.NO_COLOR;
  const origForceColor = process.env.FORCE_COLOR;
  const origCi = process.env.CI;

  beforeEach(() => {
    delete process.env.NO_COLOR;
    delete process.env.FORCE_COLOR;
    delete process.env.CI;
  });
  afterEach(() => {
    if (origNoColor === undefined) delete process.env.NO_COLOR;
    else process.env.NO_COLOR = origNoColor;
    if (origForceColor === undefined) delete process.env.FORCE_COLOR;
    else process.env.FORCE_COLOR = origForceColor;
    if (origCi === undefined) delete process.env.CI;
    else process.env.CI = origCi;
  });

  it('colorEnabled returns false when NO_COLOR is set', () => {
    process.env.NO_COLOR = '1';
    expect(colorEnabled({ isTTY: true } as never)).toBe(false);
  });

  it('colorEnabled returns true when FORCE_COLOR is set (even without TTY)', () => {
    process.env.FORCE_COLOR = '1';
    expect(colorEnabled({ isTTY: false } as never)).toBe(true);
  });

  it('colorEnabled returns true when CI=true (CI logs almost always render ANSI)', () => {
    process.env.CI = 'true';
    expect(colorEnabled({ isTTY: false } as never)).toBe(true);
  });

  it('colorEnabled returns true when CI=1 (alternate truthy form)', () => {
    process.env.CI = '1';
    expect(colorEnabled({ isTTY: false } as never)).toBe(true);
  });

  it('colorEnabled gives NO_COLOR precedence over CI', () => {
    process.env.CI = 'true';
    process.env.NO_COLOR = '1';
    expect(colorEnabled({ isTTY: true } as never)).toBe(false);
  });

  it('colorEnabled honors isTTY when neither env var is set', () => {
    expect(colorEnabled({ isTTY: true } as never)).toBe(true);
    expect(colorEnabled({ isTTY: false } as never)).toBe(false);
  });

  it('color(name, text) wraps in ANSI escape codes when enabled', () => {
    const wrapped = color('green', 'hello', true);
    expect(wrapped.startsWith(ESC)).toBe(true);
    expect(wrapped).toContain('hello');
    expect(wrapped.endsWith(`${ESC}[0m`)).toBe(true);
  });

  it('color() is a no-op (returns input) when disabled', () => {
    expect(color('green', 'hello', false)).toBe('hello');
  });

  it('bearingGlyph maps each status to a glyph token', () => {
    expect(bearingGlyph('ok', false)).toBe('OK');
    expect(bearingGlyph('warn', false)).toBe('!!');
    expect(bearingGlyph('fail', false)).toBe('XX');
  });

  it('bearingGlyph wraps in color when enabled', () => {
    expect(bearingGlyph('ok', true)).toContain('OK');
    expect(bearingGlyph('ok', true)).toContain(ESC);
  });

  it('arrow, header, label are no-ops when disabled', () => {
    expect(arrow(false)).toBe('->');
    expect(header('Hi', false)).toBe('Hi');
    expect(label('Hi', false)).toBe('Hi');
  });

  it('strips CSI, OSC, and control-string sequences without deleting visible text', () => {
    const input = [
      '\u001B[31mred\u001B[0m',
      '\u001B]8;;https://example.com\u0007link\u001B]8;;\u001B\\',
      '\u001BPignored\u001B\\visible',
      '\tkept\n',
    ].join('');
    expect(stripTerminalControlSequences(input)).toBe('redlinkvisible\tkept\n');
  });

  it.each([
    ['7-bit CSI', '\u001B[31mred\u001B[0m', 'red'],
    ['8-bit CSI', '\u009B31mred\u009B0m', 'red'],
    ['OSC terminated by BEL', '\u001B]0;title\u0007text', 'text'],
    ['OSC terminated by ST', '\u001B]0;title\u001B\\text', 'text'],
    ['8-bit OSC terminated by 8-bit ST', '\u009D0;title\u009Ctext', 'text'],
    ['DCS', '\u001BPprivate\u001B\\text', 'text'],
    ['SOS', '\u001BXprivate\u001B\\text', 'text'],
    ['PM', '\u001B^private\u001B\\text', 'text'],
    ['APC', '\u001B_private\u001B\\text', 'text'],
    ['8-bit DCS', '\u0090private\u009Ctext', 'text'],
    ['8-bit SOS', '\u0098private\u009Ctext', 'text'],
    ['8-bit PM', '\u009Eprivate\u009Ctext', 'text'],
    ['8-bit APC', '\u009Fprivate\u009Ctext', 'text'],
  ])('strips the %s family', (_name, input, expected) => {
    expect(stripTerminalControlSequences(input)).toBe(expected);
  });

  it('drops an unterminated terminal control string rather than leaking its payload', () => {
    expect(stripTerminalControlSequences('before\u001B]8;;https://example.com')).toBe('before');
    expect(stripTerminalControlSequences('before\u001BPprivate')).toBe('before');
  });

  it('property: ordinary diagnostic text, Unicode, tabs, and newlines are byte-preserved', () => {
    const visibleText = fc
      .array(fc.constantFrom('a', 'Z', '0', ' ', '\t', '\n', 'Ω', '中', '🚀'), { maxLength: 200 })
      .map((characters) => characters.join(''));
    fc.assert(
      fc.property(visibleText, (text) => {
        expect(stripTerminalControlSequences(text)).toBe(text);
      }),
      { seed: 0xa451, numRuns: 200 },
    );
  });

  it('property: terminal wrappers are removed while their visible payload survives', () => {
    const visibleText = fc
      .array(fc.constantFrom('a', 'b', ' ', '\t', '\n', 'Ω', '🚀'), { maxLength: 100 })
      .map((characters) => characters.join(''));
    const wrapper = fc.constantFrom(
      (text: string) => `\u001B[38;5;42m${text}\u001B[0m`,
      (text: string) => `\u001B]8;;https://example.com\u0007${text}\u001B]8;;\u001B\\`,
      (text: string) => `\u001BPprivate\u001B\\${text}`,
      (text: string) => `\u009Dtitle\u009C${text}`,
    );
    fc.assert(
      fc.property(visibleText, wrapper, (text, wrap) => {
        expect(stripTerminalControlSequences(wrap(text))).toBe(text);
      }),
      { seed: 0x05c8, numRuns: 200 },
    );
  });

  it('property: arbitrary input cannot leave terminal control bytes in a diagnostic', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 500 }), (text) => {
        expect(stripTerminalControlSequences(text)).not.toMatch(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/u);
      }),
      { seed: 0xc011, numRuns: 500 },
    );
  });
});
