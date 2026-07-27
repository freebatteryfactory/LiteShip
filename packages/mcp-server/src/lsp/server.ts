/**
 * The LSP rigor server — the THIRD JSON-RPC skin over the one gauntlet fold.
 *
 * CLI (`liteship check`), MCP (`tools/call`), and this LSP server are three faces of
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
 * server. So `@liteship/mcp-server` stays free of the gauntlet + audit engines, and the
 * server is testable with a stub runner over a fixed finding list.
 *
 * SCOPE: the rigor projection, NOT the full LSP. Advertised capabilities are
 * exactly `codeActionProvider` + a (no-op) text sync; there is no hover,
 * completion, rename, or semantic-tokens surface. Diagnostics are PUSHED on a
 * `liteship/check` request (a custom method an editor extension triggers) and on
 * `initialized`; the server also answers the LSP 3.17 pull-diagnostic pair:
 * `textDocument/diagnostic` and `workspace/diagnostic`.
 *
 * @module
 */

import { InvariantViolationError, ValidationError, isTaggedError } from '@liteship/error';
import {
  convertPatternsToRe,
  convertToPositivePattern,
  getNegativePatterns,
  getPositivePatterns,
  matchAny,
} from 'fast-glob/out/utils/pattern.js';
import { parse as parseJsonRpc, errorResponse, successResponse } from '../jsonrpc.js';
import type { JsonRpcId, JsonRpcResponse } from '../jsonrpc.js';
import { InvalidParams, InternalError, MethodNotFound } from '../jsonrpc.js';
import { serverInfo } from '../server-info.js';
import { groupDiagnosticsByUri, normalizeWorkspaceRootUri, projectFinding } from './diagnostic.js';
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

const LSP_METHOD = {
  initialize: 'initialize',
  initialized: 'initialized',
  check: 'liteship/check',
  textDocumentDiagnostic: 'textDocument/diagnostic',
  workspaceDiagnostic: 'workspace/diagnostic',
  codeAction: 'textDocument/codeAction',
  shutdown: 'shutdown',
  exit: 'exit',
  publishDiagnostics: 'textDocument/publishDiagnostics',
  logMessage: 'window/logMessage',
} as const;

/** One exact method row in the LSP public protocol projection. */
export interface LspMethodDescriptor {
  readonly method: (typeof LSP_METHOD)[keyof typeof LSP_METHOD];
  readonly direction: 'client-to-server' | 'server-to-client';
  readonly messageKind: 'request' | 'notification' | 'either';
  readonly phase: 'initial' | 'active' | 'shutdown' | 'outbound';
}

/**
 * Exact LSP method projection consumed by dispatch and capability construction.
 * This records the already-implemented push/pull model without selecting a new
 * diagnostic model; changing that model remains an owner decision.
 */
const LSP_METHOD_DESCRIPTORS = [
  { method: LSP_METHOD.initialize, direction: 'client-to-server', messageKind: 'request', phase: 'initial' },
  { method: LSP_METHOD.initialized, direction: 'client-to-server', messageKind: 'notification', phase: 'active' },
  { method: LSP_METHOD.check, direction: 'client-to-server', messageKind: 'either', phase: 'active' },
  {
    method: LSP_METHOD.textDocumentDiagnostic,
    direction: 'client-to-server',
    messageKind: 'request',
    phase: 'active',
  },
  {
    method: LSP_METHOD.workspaceDiagnostic,
    direction: 'client-to-server',
    messageKind: 'request',
    phase: 'active',
  },
  { method: LSP_METHOD.codeAction, direction: 'client-to-server', messageKind: 'request', phase: 'active' },
  { method: LSP_METHOD.shutdown, direction: 'client-to-server', messageKind: 'request', phase: 'active' },
  { method: LSP_METHOD.exit, direction: 'client-to-server', messageKind: 'notification', phase: 'shutdown' },
  {
    method: LSP_METHOD.publishDiagnostics,
    direction: 'server-to-client',
    messageKind: 'notification',
    phase: 'outbound',
  },
  { method: LSP_METHOD.logMessage, direction: 'server-to-client', messageKind: 'notification', phase: 'outbound' },
] as const satisfies readonly LspMethodDescriptor[];

/** Closed LSP method catalog that drives routing and advertised capabilities. */
export const LSP_METHOD_CATALOG: readonly LspMethodDescriptor[] = Object.freeze(
  LSP_METHOD_DESCRIPTORS.map((descriptor) => Object.freeze(descriptor)),
);

/** The custom request an editor extension sends to trigger a gauntlet run + diagnostic publish. */
export const LITESHIP_CHECK_METHOD = LSP_METHOD.check;

/** The LSP protocol method the server pushes diagnostics over (§textDocument/publishDiagnostics). */
const PUBLISH_DIAGNOSTICS_METHOD = LSP_METHOD.publishDiagnostics;

/** The LSP protocol method the server logs out-of-band over (§window/logMessage). */
const LOG_MESSAGE_METHOD = LSP_METHOD.logMessage;
const FAST_GLOB_IGNORES = ['**/node_modules/**', '**/dist/**'] as const;
const FAST_GLOB_POSITIVE_OPTIONS = { dot: false } as const;
const FAST_GLOB_NEGATIVE_OPTIONS = { dot: true } as const;

/**
 * Server capabilities the LSP advertises in the `initialize` response. EXACTLY
 * the rigor surface: a code-action provider (quickfix only) + an open/close text
 * sync (TextDocumentSyncKind.None = 0 — the server is stateless about document
 * contents; diagnostics derive from the gauntlet fold over the workspace, not
 * from in-editor edits). Honest minimalism: a capability is declared only
 * because its method is implemented (mirrors the MCP `capabilities.ts` law).
 */
export interface LspServerCapabilities {
  readonly textDocumentSync: 0;
  readonly codeActionProvider: { readonly codeActionKinds: readonly [typeof CodeActionKind.QuickFix] };
  readonly diagnosticProvider: { readonly interFileDependencies: true; readonly workspaceDiagnostics: true };
}

/**
 * Derive the advertised capability projection from an explicit method catalog.
 * Missing either backing handler is a construction error, so a catalog mutation
 * cannot leave a stale capability green.
 */
export function projectLspCapabilities(catalog: readonly LspMethodDescriptor[]): LspServerCapabilities {
  const handled = new Set(
    catalog.filter((entry) => entry.direction === 'client-to-server').map((entry) => entry.method),
  );
  for (const required of [LSP_METHOD.codeAction, LSP_METHOD.textDocumentDiagnostic, LSP_METHOD.workspaceDiagnostic]) {
    if (!handled.has(required)) {
      throw InvariantViolationError('lsp-capability-projection', `capability has no registered handler: ${required}`);
    }
  }
  return Object.freeze({
    textDocumentSync: 0,
    codeActionProvider: Object.freeze({ codeActionKinds: Object.freeze([CodeActionKind.QuickFix] as const) }),
    diagnosticProvider: Object.freeze({ interFileDependencies: true, workspaceDiagnostics: true }),
  });
}

/** Server capabilities projected from the same method catalog used for routing. */
export const LSP_SERVER_CAPABILITIES = projectLspCapabilities(LSP_METHOD_CATALOG);

/** Exact inbound route subjects; the exhaustive dispatch switch consumes this catalog union. */
export function lspRoutedMethodNames(): readonly string[] {
  return LSP_METHOD_CATALOG.filter((entry) => entry.direction === 'client-to-server').map((entry) => entry.method);
}

/** Exact outbound methods emitted by the two production notification builders. */
export function lspNotificationProducerMethods(): readonly string[] {
  return [PUBLISH_DIAGNOSTICS_METHOD, LOG_MESSAGE_METHOD];
}

/** Server identity in the `initialize` response (§InitializeResult.serverInfo). */
function lspServerInfo(): { readonly name: 'liteship-gauntlet-lsp'; readonly version: string } {
  return { name: 'liteship-gauntlet-lsp', version: serverInfo().version };
}

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
  /** Server→client notifications to emit (e.g. publishDiagnostics after liteship/check). */
  readonly notifications: readonly LspNotification[];
  /** `true` once `exit` is received — the driver closes the loop. */
  readonly exit: boolean;
}

/**
 * The server's mutable lifecycle state. Composition-over-inheritance: this is a
 * DATA record threaded through {@link handle}, not an object with methods. The
 * findings from the last `liteship/check` are cached so a follow-up `codeAction`
 * request resolves remediations against the same fold the diagnostics came from
 * (the §CodeAction.diagnostics back-link must reference the published squiggle).
 */
export interface LspServerState {
  /** Set by `initialize`; a request before it is a protocol violation (§Lifecycle). */
  readonly initialized: boolean;
  /** Set by `shutdown`; a non-`exit` request after it must error (§Lifecycle: -32600). */
  readonly shuttingDown: boolean;
  /** File URI supplied by the initialize handshake; relative Findings resolve beneath it. */
  readonly workspaceRootUri?: string;
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
  // Lifecycle authority precedes method dispatch: before initialize (and after
  // shutdown), even an unknown request is first a lifecycle violation.
  if (!state.initialized && method !== LSP_METHOD.initialize && method !== LSP_METHOD.exit) {
    return lifecycleViolation(state, id, isNotification, `'${method}' received before 'initialize' (§Lifecycle)`);
  }
  if (state.shuttingDown && method !== LSP_METHOD.exit) {
    return lifecycleViolation(state, id, isNotification, `'${method}' received after 'shutdown' (§Lifecycle)`);
  }
  const descriptor = LSP_METHOD_CATALOG.find(
    (entry) => entry.direction === 'client-to-server' && entry.method === method,
  );
  if (descriptor === undefined) {
    if (isNotification) return { state, result: { response: null, notifications: [], exit: false } };
    throw notImplemented(method);
  }
  const receivedKind = isNotification ? 'notification' : 'request';
  if (descriptor.messageKind !== 'either' && descriptor.messageKind !== receivedKind) {
    return lifecycleViolation(state, id, isNotification, `'${method}' must be a ${descriptor.messageKind}`);
  }
  switch (method) {
    case LSP_METHOD.initialize: {
      if (state.initialized) {
        return lifecycleViolation(state, id, isNotification, "'initialize' received more than once (§Lifecycle)");
      }
      const workspaceRootUri = readWorkspaceRootUri(params);
      const result: LspHandleResult = {
        response: successResponse(id, {
          capabilities: LSP_SERVER_CAPABILITIES,
          serverInfo: lspServerInfo(),
        }),
        notifications: [],
        exit: false,
      };
      return {
        state: {
          ...state,
          initialized: true,
          ...(workspaceRootUri === undefined ? {} : { workspaceRootUri }),
        },
        result,
      };
    }
    case LSP_METHOD.initialized:
      requireActive(state, method);
      // The client's post-initialize notification. No response (notification).
      return { state, result: { response: null, notifications: [], exit: false } };
    case LITESHIP_CHECK_METHOD: {
      requireActive(state, method);
      const globs = readGlobs(params);
      const { findings } = await runGauntlet(globs);
      const notifications = publishNotificationsFor(findings, state.lastFindings, globs, state.workspaceRootUri);
      const lastFindings = mergeFindingsForScope(findings, state.lastFindings, globs);
      const response: JsonRpcResponse | null = isNotification
        ? null
        : successResponse(id, { findingCount: findings.length, publishedUris: notifications.length });
      return { state: { ...state, lastFindings }, result: { response, notifications, exit: false } };
    }
    case LSP_METHOD.workspaceDiagnostic: {
      // Pull-style diagnostics (§workspace/diagnostic): run the fold + return the
      // grouped report inline (also caching findings for codeAction resolution).
      requireActive(state, method);
      const { findings } = await runGauntlet(undefined);
      const grouped = groupDiagnosticsByUri(findings, state.workspaceRootUri);
      const items = grouped.map((g) => ({ uri: g.uri, version: null, kind: 'full', items: g.diagnostics }));
      return {
        state: { ...state, lastFindings: findings },
        result: { response: successResponse(id, { items }), notifications: [], exit: false },
      };
    }
    case LSP_METHOD.textDocumentDiagnostic: {
      // LSP 3.17 pull diagnostics for one document. The gauntlet remains the
      // sole producer; this is only a URI-filtered projection of the same fold
      // used by workspace/diagnostic and liteship/check.
      requireActive(state, method);
      const uri = readTextDocumentDiagnosticUri(params);
      const { findings } = await runGauntlet(undefined);
      const group = groupDiagnosticsByUri(findings, state.workspaceRootUri).find((candidate) => candidate.uri === uri);
      return {
        state: { ...state, lastFindings: findings },
        result: {
          response: successResponse(id, { kind: 'full', items: group?.diagnostics ?? [] }),
          notifications: [],
          exit: false,
        },
      };
    }
    case LSP_METHOD.codeAction: {
      requireActive(state, method);
      const actions = resolveCodeActions(params, state.lastFindings, state.workspaceRootUri);
      return { state, result: { response: successResponse(id, actions), notifications: [], exit: false } };
    }
    case LSP_METHOD.shutdown:
      requireActive(state, method);
      // §Lifecycle: respond with null result; then only `exit` is valid.
      return {
        state: { ...state, shuttingDown: true },
        result: { response: successResponse(id, null), notifications: [], exit: false },
      };
    case LSP_METHOD.exit:
      // §Lifecycle: a notification; no response. The driver closes the loop.
      return { state, result: { response: null, notifications: [], exit: true } };
    default:
      throw InvariantViolationError('lsp-method-catalog', `registered method has no route: ${method}`);
  }
}

function lifecycleViolation(
  state: LspServerState,
  id: JsonRpcId,
  isNotification: boolean,
  detail: string,
): { readonly state: LspServerState; readonly result: LspHandleResult } {
  const error = InvariantViolationError('lsp-lifecycle', detail);
  return {
    state,
    result: {
      response: isNotification ? null : errorResponse(id, -32600, error.message, { tag: error._tag }),
      notifications: isNotification ? [logMessageNotification(error)] : [],
      exit: false,
    },
  };
}

function readWorkspaceRootUri(params: unknown): string | undefined {
  if (typeof params !== 'object' || params === null || Array.isArray(params)) return undefined;
  const candidate = params as { rootUri?: unknown; workspaceFolders?: unknown };
  let uri: unknown = candidate.rootUri;
  if ((uri === undefined || uri === null) && Array.isArray(candidate.workspaceFolders)) {
    const first = candidate.workspaceFolders[0];
    if (typeof first === 'object' && first !== null && !Array.isArray(first)) {
      uri = (first as { uri?: unknown }).uri;
    }
  }
  if (uri === undefined || uri === null) return undefined;
  if (typeof uri !== 'string') throw ValidationError('lsp-initialize', 'workspace root URI must be a string or null');
  try {
    return normalizeWorkspaceRootUri(uri);
  } catch (cause) {
    throw Object.assign(ValidationError('lsp-initialize', `workspace root must be an absolute file URI: ${uri}`), {
      cause,
    });
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

/**
 * Build the publishDiagnostics notifications for a finding list (grouped + CLEARING). A URI that carried
 * diagnostics on the PREVIOUS run but is clean now must receive an EMPTY `diagnostics` array, or the LSP
 * client keeps the stale squiggles forever — clients only drop diagnostics for a URI on an explicit
 * publish for that URI (codex PR#57 review). `previousFindings` is last run's finding list.
 */
function publishNotificationsFor(
  findings: readonly FindingLike[],
  previousFindings: readonly FindingLike[] = [],
  checkedGlobs?: readonly string[],
  workspaceRootUri?: string,
): readonly LspNotification[] {
  const groups = groupDiagnosticsByUri(findings, workspaceRootUri);
  const currentUris = new Set(groups.map((group) => group.uri));
  const previousInScope =
    checkedGlobs === undefined
      ? previousFindings
      : previousFindings.filter((finding) => finding.location && matchesAnyGlob(finding.location.file, checkedGlobs));
  const notifications: LspNotification[] = groups.map((group) => ({
    method: PUBLISH_DIAGNOSTICS_METHOD,
    params: { uri: group.uri, diagnostics: group.diagnostics } satisfies PublishDiagnosticsParams,
  }));
  // Clear every URI that was published last run and is now finding-free (an empty publish drops the
  // editor squiggles); a URI still in `currentUris` is republished above, never double-cleared.
  for (const stale of groupDiagnosticsByUri(previousInScope, workspaceRootUri)) {
    if (!currentUris.has(stale.uri)) {
      notifications.push({
        method: PUBLISH_DIAGNOSTICS_METHOD,
        params: { uri: stale.uri, diagnostics: [] } satisfies PublishDiagnosticsParams,
      });
    }
  }
  return notifications;
}

function matchesAnyGlob(file: string, globs: readonly string[]): boolean {
  const patterns = [...globs];
  const positive = getPositivePatterns(patterns);
  if (positive.length === 0) return false;

  const negative = [
    ...getNegativePatterns(patterns).map((pattern) => convertToPositivePattern(pattern)),
    ...FAST_GLOB_IGNORES,
  ];
  return (
    matchAny(file, convertPatternsToRe(positive, FAST_GLOB_POSITIVE_OPTIONS)) &&
    !matchAny(file, convertPatternsToRe(negative, FAST_GLOB_NEGATIVE_OPTIONS))
  );
}

function mergeFindingsForScope(
  findings: readonly FindingLike[],
  previousFindings: readonly FindingLike[],
  checkedGlobs?: readonly string[],
): readonly FindingLike[] {
  if (checkedGlobs === undefined) return findings;
  const previousOutOfScope = previousFindings.filter(
    (finding) => finding.location === undefined || !matchesAnyGlob(finding.location.file, checkedGlobs),
  );
  return [...previousOutOfScope, ...findings];
}

/**
 * Resolve the code actions for a `textDocument/codeAction` request: project the
 * remediation of every cached finding whose diagnostic overlaps the requested
 * range (or that lives in the requested document when the client passes the
 * whole file). The §CodeAction.diagnostics back-link references the finding's
 * own projected diagnostic.
 */
function resolveCodeActions(
  params: unknown,
  findings: readonly FindingLike[],
  workspaceRootUri?: string,
): readonly LspCodeAction[] {
  const ctx = readCodeActionParams(params);
  const actions: LspCodeAction[] = [];
  for (const finding of findings) {
    const projected = projectFinding(finding, workspaceRootUri);
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
function requireActive(state: LspServerState, method: string): void {
  if (!state.initialized) {
    throw InvariantViolationError('lsp-lifecycle', `'${method}' received before 'initialize' (§Lifecycle)`);
  }
  if (state.shuttingDown) {
    throw InvariantViolationError('lsp-lifecycle', `'${method}' received after 'shutdown' (§Lifecycle)`);
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

/** Read the optional `globs` array from a `liteship/check` params object (defaults to undefined → full scope). */
function readGlobs(params: unknown): readonly string[] | undefined {
  if (typeof params !== 'object' || params === null) return undefined;
  const raw = (params as { globs?: unknown }).globs;
  if (!Array.isArray(raw)) return undefined;
  if (!raw.every((g): g is string => typeof g === 'string')) {
    throw ValidationError('liteship/check', 'globs must be a string[] when provided');
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

/** Read the document URI required by LSP 3.17 `textDocument/diagnostic`. */
function readTextDocumentDiagnosticUri(params: unknown): string {
  if (typeof params !== 'object' || params === null || Array.isArray(params)) {
    throw ValidationError('textDocument/diagnostic', 'params must be an object with textDocument.uri');
  }
  const uri = (params as { textDocument?: { uri?: unknown } }).textDocument?.uri;
  if (typeof uri !== 'string' || uri.trim().length === 0) {
    throw ValidationError('textDocument/diagnostic', 'textDocument.uri must be a non-empty string');
  }
  return uri;
}
