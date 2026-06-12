/**
 * Unit tests for the `--http` bind shapes (parseHttpBind). The bootstrap
 * (createServer/listen/SIGINT) stays untested here — only the pure bind
 * resolution, so no server process is ever spawned.
 */
import { describe, it, expect } from 'vitest';
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
