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
import { fnv1a } from '@czap/core';
import type { ContentAddress, CapsuleCommandResult, CapsuleResultReceipt, CapsuleResultMetaKey } from '@czap/core';
import { createNodeCommandContext } from '@czap/command/host';
import { serverInfo } from './server-info.js';
import { PROTOCOL_VERSION, SERVER_CAPABILITIES } from './capabilities.js';
import { listResources, readResource } from './resources.js';
import { listUiResources, readUiResource } from './ui-resources.js';
import { listAppResources, readAppResource } from './app-resources.js';
import { listManifestResources, readManifestResource } from './manifest-resource.js';
import { listPrompts, getPrompt } from './prompts.js';
import { InvalidParamsError, ResourceNotFoundError, RESOURCE_NOT_FOUND } from './errors.js';
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

/** Product-owned `_meta` key under which the LiteShip result receipt rides (no maintainer identity; never an MCP-reserved prefix). */
const RECEIPT_META_KEY: CapsuleResultMetaKey = 'liteship/result';

/** The single dispatcher over the canonical registry — same instance the CLI uses. */
const dispatcher = CommandDispatcher.make(commandRegistry);

/** Shape of an MCP tools/call parameter object. */
export interface McpToolCall {
  readonly name: string;
  readonly arguments: Record<string, unknown>;
}

/**
 * MCP tools/call result envelope. `structuredContent` is the command PAYLOAD
 * (what a D2 `outputSchema` will describe); LiteShip result identity rides in
 * `_meta` under {@link RECEIPT_META_KEY} (provenance, not the semantic result);
 * `content[0].text` is a compatibility JSON mirror of the payload.
 */
export interface McpToolResult {
  readonly content: ReadonlyArray<{ type: 'text'; text: string }>;
  readonly structuredContent: unknown;
  readonly isError: boolean;
  /** MCP-open metadata; carries the LiteShip receipt under the reverse-DNS key. */
  readonly _meta?: Readonly<Record<string, unknown>>;
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
    if (err instanceof ResourceNotFoundError) {
      // MCP resource-not-found is -32002 (resource-specific), NOT -32601 (which means
      // the resources/read METHOD is missing — it is not).
      return errorResponse(id, RESOURCE_NOT_FOUND, 'Resource not found', { uri: err.uri });
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
    case 'initialize': {
      // Lifecycle floor: require a well-formed protocolVersion (malformed → -32602).
      // We support exactly PROTOCOL_VERSION and respond with it (spec negotiation:
      // a client that cannot speak it disconnects). Capabilities come from the ONE
      // shared source SERVER_CAPABILITIES — the same object liteship://server/info
      // reports, so handshake and resource truth cannot drift. As of D3, resources
      // and prompts ARE declared (their methods are implemented); their unimplemented
      // sub-methods (templates/list, subscribe) still return honest method-not-found.
      const params = msg.params as { protocolVersion?: unknown } | undefined;
      if (!params || typeof params.protocolVersion !== 'string') {
        throw new InvalidParamsError('initialize requires { protocolVersion: string }', { received: params });
      }
      return ok({
        protocolVersion: PROTOCOL_VERSION,
        capabilities: SERVER_CAPABILITIES,
        serverInfo: serverInfo(),
      });
    }
    case 'notifications/initialized':
      // Accept-and-track (v1): acknowledge the lifecycle notification rather than
      // 404 it. It's a notification, so dispatch() returns null regardless.
      return ok(null);
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
    case 'resources/list':
      // Single static page — D3 JSON resources (liteship://) + D4 static MCP Apps
      // UI resources (ui://liteship/…) + D5 live app resources (ui://liteship/app/…)
      // + the D6 MCP-app manifest (liteship://mcp-app/manifest). Fixed at process start.
      return ok({
        resources: [...listResources(), ...listUiResources(), ...listAppResources(), ...listManifestResources()],
      });
    case 'resources/read': {
      const params = msg.params as { uri?: unknown } | undefined;
      if (!params || typeof params.uri !== 'string') {
        throw new InvalidParamsError('resources/read requires { uri: string }', { received: params });
      }
      // ui://liteship/app/ → D5 live app; other ui:// → D4 static UI; liteship://mcp-app/
      // → D6 manifest; other liteship:// → D3 JSON. Unknown in any registry → -32002 (catch).
      const uri = params.uri;
      const contents = uri.startsWith('ui://liteship/app/')
        ? readAppResource(uri)
        : uri.startsWith('ui://')
          ? readUiResource(uri)
          : uri.startsWith('liteship://mcp-app/')
            ? readManifestResource(uri)
            : readResource(uri);
      return ok(contents);
    }
    case 'prompts/list':
      return ok({ prompts: listPrompts() });
    case 'prompts/get': {
      const params = msg.params as { name?: unknown; arguments?: unknown } | undefined;
      if (!params || typeof params.name !== 'string') {
        throw new InvalidParamsError('prompts/get requires { name: string, arguments?: object }', { received: params });
      }
      const args = (params.arguments ?? {}) as Record<string, unknown>;
      // Unknown prompt name / missing / invalid argument → InvalidParamsError → -32602.
      return ok(getPrompt(params.name, args));
    }
    default:
      // Everything not handled above — including resources/templates/list,
      // resources/subscribe, resources/unsubscribe, and any prompts/* beyond
      // list+get — is an honest method-not-found (-32601): the method is genuinely
      // unregistered. (resources/read's unknown-uri case is -32002, handled above.)
      return { kind: 'method-not-found' };
  }
}

/**
 * Canonical JSON (recursively sorted keys) so field/key order never perturbs a
 * resultId. CUT B5a: this is the ONE deliberate exception to the CanonicalCbor
 * identity doctrine (ADR-0003 / B1). `resultId` is a JSON-PROTOCOL identity, not
 * an internal content address — the MCP tool-result payload is JSON-shaped (D1:
 * `structuredContent` = payload), the receipt rides the JSON wire, and B1's
 * float-width CBOR gremlin cannot occur over JSON text (`0.5` → `"0.5"` always).
 * It stays JSON on purpose; the single-canonicalizer guard pins it as the only
 * `canonicalJson` in the tree so a SECOND JSON identity scheme can't drift in.
 */
function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`)
    .join(',')}}`;
}

/**
 * Content address over the STABLE result — command + status + payload + verdict?
 * + exitCode?. Excludes the volatile `timestamp` (idempotency) and any text-mirror
 * formatting. Pure (`fnv1a`, no host); advisory identity, not an integrity digest.
 */
function computeResultId(result: CapsuleCommandResult): ContentAddress {
  return fnv1a(
    canonicalJson({
      command: result.command,
      status: result.status,
      payload: result.payload ?? null,
      ...(result.verdict !== undefined ? { verdict: result.verdict } : {}),
      ...(result.exitCode !== undefined ? { exitCode: result.exitCode } : {}),
    }),
  );
}

/**
 * Dispatch a tools/call through the shared registry dispatcher. The structured
 * `arguments` object passes through verbatim (nested objects preserved — no
 * `[object Object]` flattening). The result envelope (CUT D1):
 *   - `structuredContent` = the command PAYLOAD (what D2's outputSchema describes);
 *   - `_meta[liteship/result]` = the LiteShip receipt (command, content-addressed
 *     resultId, timestamp, verdict?/exitCode?) — provenance, not payload;
 *   - `content[0].text` = JSON mirror of the payload (compatibility, never stdout);
 *   - `isError` reflects a tool-execution failure (NOT a JSON-RPC protocol error).
 */
export async function dispatchToolCall(call: McpToolCall): Promise<McpToolResult> {
  const result = await dispatcher.dispatch({ name: call.name, args: call.arguments }, createNodeCommandContext());
  const payload = result.payload ?? null;
  const receipt: CapsuleResultReceipt = {
    command: result.command,
    resultId: computeResultId(result),
    timestamp: result.timestamp,
    ...(result.verdict !== undefined ? { verdict: result.verdict } : {}),
    ...(result.exitCode !== undefined ? { exitCode: result.exitCode } : {}),
  };
  return {
    content: [{ type: 'text', text: JSON.stringify(payload) }],
    structuredContent: payload,
    isError: result.status === 'failed',
    _meta: { [RECEIPT_META_KEY]: receipt },
  };
}

/**
 * MCP tool catalog — projected from the ONE canonical command catalog in
 * @czap/command (the mcpExposed subset). No hand-maintained parallel table:
 * this is the same descriptor source the CLI's `describe`/`completion`/`help`
 * project, so MCP `tools/list` and `czap describe --format=mcp` agree by
 * construction.
 */
export function listTools(): ReadonlyArray<{
  name: string;
  description: string;
  inputSchema: object;
  outputSchema?: object;
  _meta?: { ui: { resourceUri: string } };
}> {
  return mcpExposedDescriptors().map((descriptor) => ({
    name: descriptor.name,
    description: descriptor.summary,
    inputSchema: descriptor.inputSchema,
    // D2: handler-backed (hence all mcpExposed) descriptors declare outputSchema.
    ...(descriptor.outputSchema ? { outputSchema: descriptor.outputSchema } : {}),
    // D5: a tool with a linked live MCP Apps view projects _meta.ui.resourceUri.
    ...(descriptor.ui ? { _meta: { ui: { resourceUri: descriptor.ui.resourceUri } } } : {}),
  }));
}
