/**
 * The LSP rigor server — the THIRD JSON-RPC skin over the one gauntlet fold.
 *
 * CLI (`czap check`), MCP (`tools/call`), and this LSP server are three faces of
 * the SAME `Finding`: the CLI prints it, the MCP server returns it as
 * `structuredContent`, and the LSP publishes it as a live `textDocument/
 * publishDiagnostics` Diagnostic + offers its remediation as a
 * `textDocument/codeAction`. This module is the lifecycle + dispatch; the
 * Finding→Diagnostic and remediation→CodeAction maps are the pure
 * {@link module:lsp/diagnostic} / {@link module:lsp/code-action} projections.
 *
 * LEAN-ENGINE SEAM: the gauntlet runner is INJECTED ({@link LspGauntletRunner}),
 * exactly like `dispatch.ts` gets its findings via `context.runGauntlet`. The
 * engine fold (the `node:fs` glob, the waiver-expiry wall-clock, the heavy audit
 * IR build) lives in the CLI host that constructs the runner — NEVER in this
 * server. So `@czap/mcp-server` stays free of the gauntlet + audit engines, and the
 * server is testable with a stub runner over a fixed finding list.
 *
 * SCOPE: the rigor projection, NOT the full LSP. Advertised capabilities are
 * exactly `codeActionProvider` + a (no-op) text sync; there is no hover,
 * completion, rename, or semantic-tokens surface. Diagnostics are PUSHED on a
 * `czap/check` request (a custom method an editor extension triggers) and on
 * `initialized`; the server also answers a pull-style `workspace/diagnostic`.
 *
 * @module
 */

import { InvariantViolationError, ValidationError, isTaggedError } from '@czap/error';
import { parse as parseJsonRpc, errorResponse, successResponse } from '../jsonrpc.js';
import type { JsonRpcId, JsonRpcResponse } from '../jsonrpc.js';
import { InvalidParams, InternalError, MethodNotFound } from '../jsonrpc.js';
import { groupDiagnosticsByUri, projectFinding } from './diagnostic.js';
import { projectRemediation } from './code-action.js';
import {
  CodeActionKind,
  MessageType,
  type FindingLike,
  type LogMessageParams,
  type LspCodeAction,
  type LspDiagnostic,
  type LspGauntletRunner,
  type PublishDiagnosticsParams,
} from './types.js';

/** The custom request an editor extension sends to trigger a gauntlet run + diagnostic publish. */
export const CZAP_CHECK_METHOD = 'czap/check' as const;

/** The LSP protocol method the server pushes diagnostics over (§textDocument/publishDiagnostics). */
const PUBLISH_DIAGNOSTICS_METHOD = 'textDocument/publishDiagnostics' as const;

/** The LSP protocol method the server logs out-of-band over (§window/logMessage). */
const LOG_MESSAGE_METHOD = 'window/logMessage' as const;

/**
 * Server capabilities the LSP advertises in the `initialize` response. EXACTLY
 * the rigor surface: a code-action provider (quickfix only) + an open/close text
 * sync (TextDocumentSyncKind.None = 0 — the server is stateless about document
 * contents; diagnostics derive from the gauntlet fold over the workspace, not
 * from in-editor edits). Honest minimalism: a capability is declared only
 * because its method is implemented (mirrors the MCP `capabilities.ts` law).
 */
export const LSP_SERVER_CAPABILITIES = {
  textDocumentSync: 0,
  codeActionProvider: { codeActionKinds: [CodeActionKind.QuickFix] },
  /** Pull-diagnostics are answered (workspace/diagnostic); push is the primary channel. */
  diagnosticProvider: { interFileDependencies: true, workspaceDiagnostics: true },
} as const;

/** Server identity in the `initialize` response (§InitializeResult.serverInfo). */
const LSP_SERVER_INFO = { name: 'czap-gauntlet-lsp', version: '0.4.0' } as const;

/**
 * A message the server emits OUT-OF-BAND (a server→client notification, e.g.
 * `publishDiagnostics`) — distinct from a response to a request. The driver
 * frames + writes these; `handle` returns them alongside the response so the
 * transport stays a pure function of (incoming message, runner).
 */
export interface LspNotification {
  readonly method: string;
  readonly params: unknown;
}

/** The outcome of handling one LSP message: an optional response + any push notifications + a lifecycle signal. */
export interface LspHandleResult {
  /** The JSON-RPC response, or `null` for a notification / `exit` (which gets none). */
  readonly response: JsonRpcResponse | null;
  /** Server→client notifications to emit (e.g. publishDiagnostics after czap/check). */
  readonly notifications: readonly LspNotification[];
  /** `true` once `exit` is received — the driver closes the loop. */
  readonly exit: boolean;
}

/**
 * The server's mutable lifecycle state. Composition-over-inheritance: this is a
 * DATA record threaded through {@link handle}, not an object with methods. The
 * findings from the last `czap/check` are cached so a follow-up `codeAction`
 * request resolves remediations against the same fold the diagnostics came from
 * (the §CodeAction.diagnostics back-link must reference the published squiggle).
 */
export interface LspServerState {
  /** Set by `initialize`; a request before it is a protocol violation (§Lifecycle). */
  readonly initialized: boolean;
  /** Set by `shutdown`; a non-`exit` request after it must error (§Lifecycle: -32600). */
  readonly shuttingDown: boolean;
  /** The findings from the most recent gauntlet run, keyed for codeAction resolution. */
  readonly lastFindings: readonly FindingLike[];
}

/** The initial lifecycle state — pre-`initialize`, no findings yet. */
export function initialLspState(): LspServerState {
  return { initialized: false, shuttingDown: false, lastFindings: [] };
}

/**
 * Handle one parsed LSP message. PURE over (raw line, state, runner) → next
 * state + result — the only effect is invoking the injected `runGauntlet`
 * (itself the host's `node:fs` fold). Returns the new state so the driver
 * threads it; never mutates the passed state.
 *
 * Protocol violations throw tagged errors that map to JSON-RPC error responses
 * (never a silent drop): a request before `initialize`, a malformed param shape,
 * an unknown method. The §Lifecycle ordering (initialize → … → shutdown → exit)
 * is enforced.
 */
export async function handle(
  rawLine: string,
  state: LspServerState,
  runGauntlet: LspGauntletRunner,
): Promise<{ readonly state: LspServerState; readonly result: LspHandleResult }> {
  const parsed = parseJsonRpc(rawLine);
  if (parsed.kind === 'parse-error') {
    // §baseProtocol: a malformed JSON payload — answer -32700 with id null.
    return {
      state,
      result: { response: errorResponse(null, -32700, 'Parse error'), notifications: [], exit: false },
    };
  }
  if (parsed.kind === 'invalid-request') {
    return {
      state,
      result: { response: errorResponse(parsed.id, -32600, 'Invalid Request'), notifications: [], exit: false },
    };
  }
  if (parsed.kind === 'batch') {
    // LSP does NOT use JSON-RPC batching (§baseProtocol: one message per frame).
    return {
      state,
      result: {
        response: errorResponse(null, -32600, 'LSP does not support JSON-RPC batches'),
        notifications: [],
        exit: false,
      },
    };
  }

  const message = parsed.message;
  const isNotification = parsed.kind === 'notification';
  const id: JsonRpcId = isNotification ? null : (message as { id: JsonRpcId }).id;

  try {
    return await route(message.method, message.params, id, isNotification, state, runGauntlet);
  } catch (err) {
    if (isNotification) {
      // §4.1: a notification handler's failure produces NO JSON-RPC response — but
      // the error must NOT be silently dropped (that is the fallback-laundering the
      // audit floor flags). CONSUME `err` honestly by surfacing it over the LSP
      // out-of-band channel: a `window/logMessage` server→client notification
      // carrying the failure message (the correct LSP behavior for a notification
      // failure — logged in the editor's output channel, no popup). Response stays
      // null; the consumed error rides the `notifications` list the driver writes.
      return {
        state,
        result: { response: null, notifications: [logMessageNotification(err)], exit: false },
      };
    }
    if (isTaggedError(err)) {
      const tag = (err as { _tag: string })._tag;
      // TAG + invariant-name discrimination → the JSON-RPC code: a bad param is
      // -32602; an unrouted method (`lsp-method`) is -32601; any other broken
      // server invariant is -32603. The mapping is total + never opaque.
      const code = tag === 'ValidationError' ? InvalidParams : isMethodNotFound(err) ? MethodNotFound : InternalError;
      return {
        state,
        result: {
          response: errorResponse(id, code, (err as { message: string }).message, { tag }),
          notifications: [],
          exit: false,
        },
      };
    }
    return {
      state,
      result: {
        response: errorResponse(id, InternalError, 'Internal error', { detail: String(err) }),
        notifications: [],
        exit: false,
      },
    };
  }
}

/** Route a single method to its handler. Throws tagged errors on protocol violations. */
async function route(
  method: string,
  params: unknown,
  id: JsonRpcId,
  isNotification: boolean,
  state: LspServerState,
  runGauntlet: LspGauntletRunner,
): Promise<{ readonly state: LspServerState; readonly result: LspHandleResult }> {
  switch (method) {
    case 'initialize': {
      // §Lifecycle: the FIRST request. Idempotent re-initialize is a violation,
      // but we tolerate it (return capabilities) — the spec only forbids OTHER
      // requests before it, which the post-switch guard enforces.
      const result: LspHandleResult = {
        response: successResponse(id, {
          capabilities: LSP_SERVER_CAPABILITIES,
          serverInfo: LSP_SERVER_INFO,
        }),
        notifications: [],
        exit: false,
      };
      return { state: { ...state, initialized: true }, result };
    }
    case 'initialized':
      // The client's post-initialize notification. No response (notification).
      return { state, result: { response: null, notifications: [], exit: false } };
    case CZAP_CHECK_METHOD: {
      requireInitialized(state, method);
      const globs = readGlobs(params);
      const { findings } = await runGauntlet(globs);
      const notifications = publishNotificationsFor(findings);
      const response: JsonRpcResponse | null = isNotification
        ? null
        : successResponse(id, { findingCount: findings.length, publishedUris: notifications.length });
      return { state: { ...state, lastFindings: findings }, result: { response, notifications, exit: false } };
    }
    case 'workspace/diagnostic': {
      // Pull-style diagnostics (§workspace/diagnostic): run the fold + return the
      // grouped report inline (also caching findings for codeAction resolution).
      requireInitialized(state, method);
      const { findings } = await runGauntlet(undefined);
      const grouped = groupDiagnosticsByUri(findings);
      const items = grouped.map((g) => ({ uri: g.uri, kind: 'full', items: g.diagnostics }));
      return {
        state: { ...state, lastFindings: findings },
        result: { response: successResponse(id, { items }), notifications: [], exit: false },
      };
    }
    case 'textDocument/codeAction': {
      requireInitialized(state, method);
      const actions = resolveCodeActions(params, state.lastFindings);
      return { state, result: { response: successResponse(id, actions), notifications: [], exit: false } };
    }
    case 'shutdown':
      // §Lifecycle: respond with null result; then only `exit` is valid.
      return {
        state: { ...state, shuttingDown: true },
        result: { response: successResponse(id, null), notifications: [], exit: false },
      };
    case 'exit':
      // §Lifecycle: a notification; no response. The driver closes the loop.
      return { state, result: { response: null, notifications: [], exit: true } };
    default: {
      if (isNotification) {
        // Unknown notifications are silently accepted (§baseProtocol: a server MAY
        // ignore notifications it does not understand) — but NEVER errors swallowed.
        return { state, result: { response: null, notifications: [], exit: false } };
      }
      throw notImplemented(method);
    }
  }
}

/**
 * Build a `window/logMessage` notification that CONSUMES a thrown error — the
 * honest cure for a notification-handler failure (§4.1: no response, but the
 * error is logged, never dropped). A tagged error contributes its `_tag` +
 * message (the same discrimination the non-notification branch surfaces); any
 * other thrown value is stringified, so the binding is always read.
 */
function logMessageNotification(err: unknown): LspNotification {
  const message = isTaggedError(err)
    ? `[${(err as { _tag: string })._tag}] ${(err as { message: string }).message}`
    : String(err);
  const params: LogMessageParams = {
    type: MessageType.Error,
    message: `notification handler failed: ${message}`,
  };
  return { method: LOG_MESSAGE_METHOD, params };
}

/** Build the publishDiagnostics notifications for a finding list (grouped + clearing). */
function publishNotificationsFor(findings: readonly FindingLike[]): readonly LspNotification[] {
  return groupDiagnosticsByUri(findings).map((group) => {
    const params: PublishDiagnosticsParams = { uri: group.uri, diagnostics: group.diagnostics };
    return { method: PUBLISH_DIAGNOSTICS_METHOD, params };
  });
}

/**
 * Resolve the code actions for a `textDocument/codeAction` request: project the
 * remediation of every cached finding whose diagnostic overlaps the requested
 * range (or that lives in the requested document when the client passes the
 * whole file). The §CodeAction.diagnostics back-link references the finding's
 * own projected diagnostic.
 */
function resolveCodeActions(params: unknown, findings: readonly FindingLike[]): readonly LspCodeAction[] {
  const ctx = readCodeActionParams(params);
  const actions: LspCodeAction[] = [];
  for (const finding of findings) {
    const projected = projectFinding(finding);
    if (projected === null) continue;
    if (projected.uri !== ctx.uri) continue;
    if (!rangeOverlaps(projected.diagnostic, ctx.range)) continue;
    const action = projectRemediation(finding.remediation, projected.diagnostic, projected.uri);
    if (action !== null) actions.push(action);
  }
  return actions;
}

/** Whether a diagnostic's range overlaps the requested code-action range (line-inclusive). */
function rangeOverlaps(diagnostic: LspDiagnostic, range: { start: { line: number }; end: { line: number } }): boolean {
  const diagStart = diagnostic.range.start.line;
  const diagEnd = diagnostic.range.end.line;
  return diagStart <= range.end.line && diagEnd >= range.start.line;
}

/** A request before `initialize` is a §Lifecycle violation (server-initialized state required). */
function requireInitialized(state: LspServerState, method: string): void {
  if (!state.initialized) {
    throw InvariantViolationError('lsp-lifecycle', `'${method}' received before 'initialize' (§Lifecycle)`);
  }
}

/** Tagged error for an unrouted request method — surfaces as -32601 in the catch. */
function notImplemented(method: string): ReturnType<typeof InvariantViolationError> {
  return InvariantViolationError('lsp-method', `method not found: ${method}`);
}

/** Discriminate the unrouted-method invariant (`lsp-method`) so the catch maps it to -32601, not -32603. */
function isMethodNotFound(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { _tag?: unknown })._tag === 'InvariantViolationError' &&
    (err as { invariant?: unknown }).invariant === 'lsp-method'
  );
}

/** Read the optional `globs` array from a `czap/check` params object (defaults to undefined → full scope). */
function readGlobs(params: unknown): readonly string[] | undefined {
  if (typeof params !== 'object' || params === null) return undefined;
  const raw = (params as { globs?: unknown }).globs;
  if (!Array.isArray(raw)) return undefined;
  if (!raw.every((g): g is string => typeof g === 'string')) {
    throw ValidationError('czap/check', 'globs must be a string[] when provided');
  }
  return raw;
}

/** Read + validate a `textDocument/codeAction` params object (the document URI + range). */
function readCodeActionParams(params: unknown): {
  readonly uri: string;
  readonly range: { start: { line: number }; end: { line: number } };
} {
  if (typeof params !== 'object' || params === null) {
    throw ValidationError('textDocument/codeAction', 'params must be an object with textDocument + range');
  }
  const p = params as { textDocument?: { uri?: unknown }; range?: unknown };
  const uri = p.textDocument?.uri;
  if (typeof uri !== 'string') {
    throw ValidationError('textDocument/codeAction', 'textDocument.uri must be a string');
  }
  const range = p.range;
  if (typeof range !== 'object' || range === null) {
    throw ValidationError('textDocument/codeAction', 'range must be a { start, end } object');
  }
  const r = range as { start?: { line?: unknown }; end?: { line?: unknown } };
  const startLine = r.start?.line;
  const endLine = r.end?.line;
  if (typeof startLine !== 'number' || typeof endLine !== 'number') {
    throw ValidationError('textDocument/codeAction', 'range.start.line and range.end.line must be numbers');
  }
  return { uri, range: { start: { line: startLine }, end: { line: endLine } } };
}
