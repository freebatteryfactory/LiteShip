import { describe, expect, it } from 'vitest';
import { parseJsonc } from '../../../../packages/cli/src/internal/jsonc.js';

describe('parseJsonc', () => {
  it('preserves a URL containing // inside a string value', () => {
    expect(parseJsonc('{ "route": "https://example.com/api" }')).toEqual({
      route: 'https://example.com/api',
    });
  });

  it('admits trailing commas in objects and arrays', () => {
    expect(parseJsonc('{ "name": "worker", "routes": ["/api",], }')).toEqual({
      name: 'worker',
      routes: ['/api'],
    });
  });

  it('strips line and block comments outside strings', () => {
    expect(
      parseJsonc(`{
        // line comment
        "name": /* inline block */ "worker"
      }`),
    ).toEqual({ name: 'worker' });
  });

  it('does not treat // inside a string as a comment', () => {
    expect(parseJsonc('{ "main": "worker//entry.ts", // real comment\n "enabled": true }')).toEqual({
      main: 'worker//entry.ts',
      enabled: true,
    });
  });

  it('refuses an unterminated string with its opening offset', () => {
    expect(() => parseJsonc('"unterminated')).toThrow(/offset 0/u);
  });

  it('refuses an unterminated block comment with its opening offset', () => {
    expect(() => parseJsonc('/* unterminated')).toThrow(/offset 0/u);
  });

  it('refuses ordinary JSON syntax errors with their offset', () => {
    let failure: unknown;
    try {
      parseJsonc('{ "x": ] }');
    } catch (error) {
      failure = error;
    }
    expect(failure).toMatchObject({
      _tag: 'ValidationError',
      module: 'parseJsonc',
      message: expect.stringMatching(/invalid JSON.*offset \d+/u),
    });
  });
});
