/**
 * MCP tool dispatch — routes tools/call through the ONE shared command
 * registry/dispatcher (`@czap/command`) and returns the structured
 * `CapsuleCommandResult.payload` as `structuredContent`. No CLI argv, no
 * stdout capture, no `process.stdout.write` monkey-patch: MCP and CLI are
 * sibling skins over the same dispatcher, and `@czap/mcp-server` never imports
 * `@czap/cli`.
 *
 * Entry point `dispatch` accepts a typed JSON-RPC `Request | Notification`
 * (post-`JsonRpcServer.parse` classification) and produces a
 * `JsonRpcResponse | null`. `null` is returned for notifications: per
 * JSON-RPC 2.0 §4.1 the server MUST NOT send a response for them.
 *
 * `dispatchToolCall` remains exported for tests that exercise the dispatch
 * path directly without the JSON-RPC envelope.
 *
 * @module
 */

import { CommandDispatcher, commandRegistry, mcpExposedDescriptors } from '@czap/command';
import { createNodeCommandContext } from '@czap/command/host';
import {
  type JsonRpcNotification,
  type JsonRpcRequest,
  type JsonRpcResponse,
  errorResponse,
  successResponse,
  MethodNotFound,
  InvalidParams,
  InternalError,
} from './jsonrpc.js';

/** The single dispatcher over the canonical registry — same instance the CLI uses. */
const dispatcher = CommandDispatcher.make(commandRegistry);

/**
 * Sentinel for invalid-params throws inside method invocations. Caught
 * by `dispatch` and mapped to JSON-RPC 2.0 §5.1 code -32602 (the spec
 * code for malformed parameters). Generic `Error`s remain -32603
 * (Internal error).
 */
class InvalidParamsError extends Error {
  constructor(
    message: string,
    readonly detail?: unknown,
  ) {
    super(message);
    this.name = 'InvalidParamsError';
  }
}

/** Shape of an MCP tools/call parameter object. */
export interface McpToolCall {
  readonly name: string;
  readonly arguments: Record<string, unknown>;
}

/** MCP tools/call result envelope. `structuredContent` is the command payload. */
export interface McpToolResult {
  readonly content: ReadonlyArray<{ type: 'text'; text: string }>;
  readonly structuredContent: unknown;
  readonly isError: boolean;
}

/**
 * Route a parsed JSON-RPC message to its method handler.
 *
 * Returns `null` for notifications (§4.1: notifications MUST NOT receive
 * a response). For requests, returns either a success or an error
 * response. Internal handler exceptions are caught and surfaced as
 * `-32603 Internal error` per §5.1.
 */
export async function dispatch(msg: JsonRpcRequest | JsonRpcNotification): Promise<JsonRpcResponse | null> {
  const isNotification = !('id' in msg);
  const id = isNotification ? null : (msg as JsonRpcRequest).id;

  try {
    const result = await invoke(msg);
    if (isNotification) return null;
    if (result.kind === 'method-not-found') {
      return errorResponse(id, MethodNotFound, 'method not found', { method: msg.method });
    }
    return successResponse(id, result.value);
  } catch (err) {
    if (isNotification) {
      const notificationAck: null = null;
      return notificationAck;
    }
    if (err instanceof InvalidParamsError) {
      return errorResponse(id, InvalidParams, err.message, err.detail);
    }
    return errorResponse(id, InternalError, 'Internal error', { detail: String(err) });
  }
}

/** Internal: dispatch result shape. */
type InvokeResult = { readonly kind: 'ok'; readonly value: unknown } | { readonly kind: 'method-not-found' };

function ok(value: unknown): InvokeResult {
  return { kind: 'ok', value };
}

async function invoke(msg: JsonRpcRequest | JsonRpcNotification): Promise<InvokeResult> {
  switch (msg.method) {
    case 'tools/list':
      return ok({ tools: listTools() });
    case 'tools/call': {
      const params = msg.params as { name: string; arguments: Record<string, unknown> } | undefined;
      if (!params || typeof params.name !== 'string') {
        // Per §5.1, malformed params → -32602. InvalidParamsError sentinel
        // is mapped to InvalidParams in dispatch's catch block.
        throw new InvalidParamsError('tools/call requires { name: string, arguments: object }', { received: params });
      }
      const result = await dispatchToolCall(params);
      return ok(result);
    }
    default:
      return { kind: 'method-not-found' };
  }
}

/**
 * Dispatch a tools/call through the shared registry dispatcher. The structured
 * `arguments` object passes through as the invocation args verbatim (nested
 * objects preserved — no `String(v)` / `[object Object]` flattening), and the
 * resulting `CapsuleCommandResult.payload` is returned as `structuredContent`.
 * The text content is a faithful JSON mirror of that same payload — never
 * captured stdout.
 */
export async function dispatchToolCall(call: McpToolCall): Promise<McpToolResult> {
  const result = await dispatcher.dispatch({ name: call.name, args: call.arguments }, createNodeCommandContext());
  return {
    content: [{ type: 'text', text: JSON.stringify(result.payload ?? null) }],
    structuredContent: result.payload ?? null,
    isError: result.status === 'failed',
  };
}

/**
 * MCP tool catalog — projected from the ONE canonical command catalog in
 * @czap/command (the mcpExposed subset). No hand-maintained parallel table:
 * this is the same descriptor source the CLI's `describe`/`completion`/`help`
 * project, so MCP `tools/list` and `czap describe --format=mcp` agree by
 * construction.
 */
export function listTools(): ReadonlyArray<{ name: string; description: string; inputSchema: object }> {
  return mcpExposedDescriptors().map((descriptor) => ({
    name: descriptor.name,
    description: descriptor.summary,
    inputSchema: descriptor.inputSchema,
  }));
}
