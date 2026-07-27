/**
 * start — pick an MCP transport. Default is stdio; pass `{ http: 3838 }`
 * (or `{ http: ':3838' }`) to bind HTTP instead.
 *
 * @module
 */

import { startStdio } from './stdio.js';

/** Options for `start`. */
export interface StartOpts {
  /**
   * HTTP bind. Accepted shapes:
   *   - a port number — `3838` (binds 127.0.0.1)
   *   - `':PORT'` — `':3838'` (binds 127.0.0.1)
   *   - `'PORT'` — `'3838'` (binds 127.0.0.1)
   *   - `'HOST:PORT'` — `'0.0.0.0:3838'`
   * Any other string is rejected with a teaching error before the server binds.
   */
  readonly http?: number | string;
}

/**
 * The two transports `start` dispatches to, as an injectable bundle. Defaults to
 * {@link nodeStartDeps} (the real Node transports), so the CLI bootstrap stays
 * `start()` / `start({ http })` — byte-identical. A unit test passes scripted
 * stand-ins to assert the transport DISPATCH (stdio vs http, plus the forwarded
 * bind) without mocking `./stdio.js` / `./http.js` — the same parameter-injection
 * idiom `runStdio(input, output)` already uses for its streams. Not re-exported
 * from the package barrel: it stays an internal seam, off the public api surface.
 */
export interface StartDeps {
  readonly startStdio: () => McpServerHandle | Promise<McpServerHandle>;
  readonly startHttp: (bind: number | string) => McpServerHandle | Promise<McpServerHandle>;
}

/** Explicit lifecycle authority returned to every embedded MCP host. */
export interface McpServerHandle {
  readonly transport: 'stdio' | 'http';
  readonly done: Promise<void>;
  stop(): Promise<void>;
}

/**
 * The real Node transports. `runHttp` is loaded LAZILY so the default stdio path
 * never pulls in the HTTP server module (`createServer`/`listen`) — identical to
 * the inline `await import('./http.js')` this dispatch used before the seam.
 */
const nodeStartDeps: StartDeps = {
  startStdio,
  startHttp: async (bind) => {
    const { runHttp } = await import('./http-server.js');
    return runHttp(bind);
  },
};

/** Start the requested MCP transport and return the authority required to stop it. */
export async function start(opts: StartOpts = {}, deps: StartDeps = nodeStartDeps): Promise<McpServerHandle> {
  if (opts.http !== undefined) {
    return deps.startHttp(opts.http);
  }
  return deps.startStdio();
}
