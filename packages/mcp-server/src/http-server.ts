/**
 * MCP HTTP server bootstrap. The pure handler logic lives in `http.ts`
 * (exported as `handleRequest` / `respond`). This module owns the
 * Node http server lifecycle. Embedded callers receive an explicit stop
 * handle; only the direct executable entrypoint owns process signals.
 *
 * Splitting this out lets the rest of the transport stay in coverage with
 * no `c8 ignore` annotations.
 *
 * @module
 */

import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ValidationError } from '@liteship/error';
import { handleRequest } from './http.js';

/** A running HTTP transport and the authority required to stop it. */
export interface HttpServerHandle {
  readonly transport: 'http';
  readonly host: string;
  readonly port: number;
  readonly url: string;
  readonly done: Promise<void>;
  stop(): Promise<void>;
}

/**
 * Build the tagged variant for a rejected `--http` bind. The bind is a
 * caller-supplied argument that is structurally a string/number but
 * semantically invalid (not a port/`:PORT`/`HOST:PORT`, or out of the 0-65535
 * range) — exactly {@link ValidationError}'s domain, not a bare `Error`. Thrown
 * at every check site so the failure is a first-class algebra value (carries
 * `module`/`detail`, narrows via `hasTag`).
 */
function invalidBind(bind: number | string): ValidationError {
  return ValidationError(
    'parseHttpBind',
    `invalid --http bind "${bind}": expected ":PORT", "PORT", or "HOST:PORT" with PORT in 0-65535 (e.g. --http :3838)`,
  );
}

function checkedPort(port: number, bind: number | string): number {
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw invalidBind(bind);
  return port;
}

/**
 * Resolve an `--http` bind into host + port. Accepts a port number, `":PORT"`,
 * `"PORT"`, or `"HOST:PORT"`; host defaults to 127.0.0.1. Anything else throws
 * a teaching error BEFORE the server binds — otherwise e.g. "localhost" becomes
 * `Number(bind)` = NaN and surfaces as Node's raw ERR_SOCKET_BAD_PORT. Exported
 * so the shapes stay unit-testable without spinning up a server (this module's
 * bootstrap path is coverage-excluded).
 */
export function parseHttpBind(bind: number | string): { readonly host: string; readonly port: number } {
  if (typeof bind === 'number') return { host: '127.0.0.1', port: checkedPort(bind, bind) };
  const m = bind.match(/^(?:([^:]+))?:(\d+)$/);
  if (m) return { host: m[1] ?? '127.0.0.1', port: checkedPort(Number(m[2]), bind) };
  if (/^\d+$/.test(bind)) return { host: '127.0.0.1', port: checkedPort(Number(bind), bind) };
  throw invalidBind(bind);
}

/**
 * Start the MCP HTTP server bound to `bind` and return its lifecycle handle.
 * This function never writes process output or installs signal handlers, so it
 * is safe to embed in another host.
 */
export async function runHttp(bind: number | string): Promise<HttpServerHandle> {
  const { host, port } = parseHttpBind(bind);

  const server = createServer(async (req, res) => {
    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.end();
      return;
    }
    let body = '';
    for await (const chunk of req) body += String(chunk);

    const response = await handleRequest(body);

    res.setHeader('content-type', 'application/json');
    if (response === null) {
      // §4.1: notifications produce no body. Use 204 No Content.
      res.statusCode = 204;
      res.end();
      return;
    }
    res.end(JSON.stringify(response));
  });

  await new Promise<void>((resolveListen, rejectListen) => {
    const onError = (error: Error): void => rejectListen(error);
    server.once('error', onError);
    server.listen(port, host, () => {
      server.off('error', onError);
      resolveListen();
    });
  });
  // Resolve the actual bound port — when callers pass :0 they want the
  // ephemeral port the OS chose, not the literal 0 they requested.
  const addr = server.address();
  const boundPort = typeof addr === 'object' && addr ? addr.port : port;
  const url = `http://${host}:${boundPort}/`;
  const done = new Promise<void>((resolveDone, rejectDone) => {
    server.once('close', resolveDone);
    server.once('error', rejectDone);
  });
  let stopPromise: Promise<void> | undefined;
  const stop = (): Promise<void> => {
    stopPromise ??= new Promise<void>((resolveStop, rejectStop) => {
      if (!server.listening) {
        resolveStop();
        return;
      }
      server.close((error) => {
        if (error) rejectStop(error);
        else resolveStop();
      });
    }).then(async () => done);
    return stopPromise;
  };
  return { transport: 'http', host, port: boundPort, url, done, stop };
}

function isDirectEntrypoint(moduleUrl: string, argvPath: string | undefined): boolean {
  return argvPath !== undefined && pathToFileURL(resolve(argvPath)).href === moduleUrl;
}

async function runHttpEntrypoint(bind: number | string): Promise<void> {
  const handle = await runHttp(bind);
  process.stdout.write(
    JSON.stringify({ status: 'ok', command: 'mcp', transport: handle.transport, url: handle.url }) + '\n',
  );
  const stop = (): void => {
    void handle.stop().catch((error: unknown) => {
      process.stderr.write(JSON.stringify({ error: `failed to stop MCP HTTP server: ${String(error)}` }) + '\n');
      process.exitCode = 1;
    });
  };
  process.once('SIGINT', stop);
  try {
    await handle.done;
  } finally {
    process.removeListener('SIGINT', stop);
  }
}

if (isDirectEntrypoint(import.meta.url, process.argv[1])) {
  const bind = process.argv[2] ?? ':0';
  runHttpEntrypoint(bind).catch((err: unknown) => {
    process.stderr.write(JSON.stringify({ error: String(err) }) + '\n');
    process.exit(1);
  });
}
