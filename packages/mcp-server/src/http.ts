/**
 * MCP HTTP transport — POST /, body is a JSON-RPC 2.0 request.
 * Pure JSON-RPC handler logic lives here. The Node `createServer` +
 * `listen` lifecycle lives in `./http-server.ts`; this module is import-pure.
 *
 * Routes incoming bodies through `JsonRpcServer.parse` for the same
 * conformance properties as the stdio transport: parse errors → -32700,
 * notifications produce no body, batches handled per §6.
 *
 * @module
 */

import { dispatch } from './dispatch.js';
import {
  JsonRpcServer,
  type JsonRpcResponse,
  type ParseOutcome,
  errorResponse,
  ParseError,
  InvalidRequest,
} from './jsonrpc.js';

/**
 * Resolve a parse outcome to its wire response, or `null` if the spec
 * requires no response (notification, or pure-notification batch).
 *
 * Exported so unit tests can exercise every branch without spinning up a
 * real HTTP server (Windows can't deliver SIGINT to subprocess for the
 * full integration path).
 */
export async function respond(outcome: ParseOutcome): Promise<JsonRpcResponse | readonly JsonRpcResponse[] | null> {
  switch (outcome.kind) {
    case 'parse-error':
      return errorResponse(null, ParseError, 'Parse error');
    case 'invalid-request':
      return errorResponse(outcome.id, InvalidRequest, 'Invalid Request');
    case 'notification':
      await dispatch(outcome.message);
      return null;
    case 'request':
      return dispatch(outcome.message);
    case 'batch': {
      const responses: JsonRpcResponse[] = [];
      for (const sub of outcome.outcomes) {
        const r = await respond(sub);
        if (r === null) continue;
        if (Array.isArray(r)) responses.push(...r);
        else responses.push(r as JsonRpcResponse);
      }
      return responses.length > 0 ? responses : null;
    }
  }
}

/**
 * Pure wire handler — accepts a JSON-RPC body string, returns the response
 * envelope (or null for notification-only batches). Drives the HTTP server's
 * request path; extracted so unit tests cover every parse-outcome branch
 * without spawning a server process.
 */
export async function handleRequest(body: string): Promise<JsonRpcResponse | readonly JsonRpcResponse[] | null> {
  const outcome = JsonRpcServer.parse(body);
  return respond(outcome);
}
