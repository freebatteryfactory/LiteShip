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

/** Start the MCP server on the requested transport. */
export async function start(opts: StartOpts = {}): Promise<void> {
  if (opts.http !== undefined) {
    const { runHttp } = await import('./http.js');
    await runHttp(opts.http);
    return;
  }
  await runStdio();
}
