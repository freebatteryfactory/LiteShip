/**
 * start — pick an MCP transport. Default is stdio; pass `{ http: 3838 }`
 * (or `{ http: ':3838' }`) to bind HTTP instead.
 *
 * @module
 */

import { runStdio } from './stdio.js';

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
  readonly runStdio: () => Promise<void>;
  readonly runHttp: (bind: number | string) => Promise<void>;
}

/**
 * The real Node transports. `runHttp` is loaded LAZILY so the default stdio path
 * never pulls in the HTTP server module (`createServer`/`listen`) — identical to
 * the inline `await import('./http.js')` this dispatch used before the seam.
 */
const nodeStartDeps: StartDeps = {
  runStdio,
  runHttp: async (bind) => {
    const { runHttp } = await import('./http.js');
    await runHttp(bind);
  },
};

/** Start the MCP server on the requested transport. */
export async function start(opts: StartOpts = {}, deps: StartDeps = nodeStartDeps): Promise<void> {
  if (opts.http !== undefined) {
    await deps.runHttp(opts.http);
    return;
  }
  await deps.runStdio();
}
