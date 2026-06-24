/**
 * Unit tests for the `--http` bind shapes (parseHttpBind). The bootstrap
 * (createServer/listen/SIGINT) stays untested here — only the pure bind
 * resolution, so no server process is ever spawned.
 */
import { describe, it, expect } from 'vitest';
import { hasTag } from '@czap/error';
import { parseHttpBind } from '../../../packages/mcp-server/src/http-server.js';

describe('parseHttpBind — accepted bind shapes', () => {
  it('accepts a plain port number, defaulting the host to 127.0.0.1', () => {
    expect(parseHttpBind(3838)).toEqual({ host: '127.0.0.1', port: 3838 });
  });

  it('accepts ":PORT", defaulting the host to 127.0.0.1', () => {
    expect(parseHttpBind(':3838')).toEqual({ host: '127.0.0.1', port: 3838 });
  });

  it('accepts a bare "PORT" string, defaulting the host to 127.0.0.1', () => {
    expect(parseHttpBind('3838')).toEqual({ host: '127.0.0.1', port: 3838 });
  });

  it('accepts "HOST:PORT"', () => {
    expect(parseHttpBind('0.0.0.0:8080')).toEqual({ host: '0.0.0.0', port: 8080 });
  });
});

describe('parseHttpBind — invalid binds throw a teaching error before the server binds', () => {
  const SHAPES = /expected ":PORT", "PORT", or "HOST:PORT"/;

  it('rejects a bare hostname (the old path fed Number("localhost") = NaN to Node)', () => {
    expect(() => parseHttpBind('localhost')).toThrow(SHAPES);
    expect(() => parseHttpBind('localhost')).toThrow(/invalid --http bind "localhost"/);
  });

  it('rejects a non-numeric port segment', () => {
    expect(() => parseHttpBind('host:abc')).toThrow(SHAPES);
  });

  it('rejects out-of-range ports in every shape', () => {
    expect(() => parseHttpBind(':99999')).toThrow(SHAPES);
    expect(() => parseHttpBind('99999')).toThrow(SHAPES);
    expect(() => parseHttpBind(-1)).toThrow(SHAPES);
    expect(() => parseHttpBind(1.5)).toThrow(SHAPES);
  });

  it('throws a tagged ValidationError (the algebra value), not a bare Error', () => {
    // Defect-1 guard: invalidBind must construct a `@czap/error` tagged variant
    // so the failure narrows via `hasTag` and carries structured fields — never
    // a laundered `new Error(...)`.
    let thrown: unknown;
    try {
      parseHttpBind('localhost');
    } catch (e) {
      thrown = e;
    }
    expect(hasTag(thrown, 'ValidationError')).toBe(true);
    expect((thrown as { module: string }).module).toBe('parseHttpBind');
    expect((thrown as { detail: string }).detail).toContain('invalid --http bind "localhost"');
  });
});
