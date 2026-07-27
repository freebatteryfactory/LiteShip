/**
 * JsonRpcServer — framework-free JSON-RPC 2.0 kernel.
 *
 * Parses incoming wire bytes, classifies them as Request | Notification |
 * Batch | InvalidRequest | ParseError, and produces responses (or null
 * for notifications, which MUST NOT receive a response per §4.1).
 *
 * Exposed as a `pureTransform` arm capsule `mcp.jsonrpc-server` so it
 * appears in the manifest and can be reused by future JSON-RPC surfaces
 * beyond MCP.
 *
 * Conformance: JSON-RPC 2.0 specification (https://www.jsonrpc.org/specification).
 *   §3 — `jsonrpc: "2.0"` required.
 *   §4 — Request vs Notification distinguished by presence of `id`.
 *   §4.1 — A Notification MUST NOT receive a Response.
 *   §4.2 — Parse errors MUST emit a Response with code -32700, id null.
 *   §5 — Response is `result` XOR `error`.
 *   §5.1 — Standard error codes.
 *   §6 — Batch: array of requests/notifications. Empty array → -32600.
 *
 * @module
 */

import { defineCapsule, schema } from '@liteship/core';

// ---------- JSON-RPC 2.0 types (wire-shape) ----------

/** Per §4: `id` is string, number, or null. Absent = notification. */
export type JsonRpcId = string | number | null;

/** A JSON-RPC 2.0 request (has `id`). */
export interface JsonRpcRequest {
  readonly jsonrpc: '2.0';
  readonly id: JsonRpcId;
  readonly method: string;
  readonly params?: readonly unknown[] | Record<string, unknown>;
}

/** A JSON-RPC 2.0 notification (no `id`). Per §4.1 MUST NOT be responded to. */
export interface JsonRpcNotification {
  readonly jsonrpc: '2.0';
  readonly method: string;
  readonly params?: readonly unknown[] | Record<string, unknown>;
}

/** Successful response per §5. */
export interface JsonRpcSuccess {
  readonly jsonrpc: '2.0';
  readonly id: JsonRpcId;
  readonly result: unknown;
}

/** Error response per §5 + §5.1. */
export interface JsonRpcErrorResponse {
  readonly jsonrpc: '2.0';
  readonly id: JsonRpcId;
  readonly error: { readonly code: number; readonly message: string; readonly data?: unknown };
}

/** Either a success or error response. */
export type JsonRpcResponse = JsonRpcSuccess | JsonRpcErrorResponse;

// ---------- Standard error codes (§5.1) ----------

/** JSON-RPC standard parse-error code. */
export const ParseError = -32700 as const;
/** JSON-RPC standard invalid-request code. */
export const InvalidRequest = -32600 as const;
/** JSON-RPC standard method-not-found code. */
export const MethodNotFound = -32601 as const;
/** JSON-RPC standard invalid-params code. */
export const InvalidParams = -32602 as const;
/** JSON-RPC standard internal-error code. */
export const InternalError = -32603 as const;

// ---------- Parser output classification ----------

/** Discriminated union of every parse outcome the kernel produces. */
export type ParseOutcome =
  | { readonly kind: 'request'; readonly message: JsonRpcRequest }
  | { readonly kind: 'notification'; readonly message: JsonRpcNotification }
  | { readonly kind: 'batch'; readonly outcomes: readonly ParseOutcome[] }
  | { readonly kind: 'parse-error' }
  | { readonly kind: 'invalid-request'; readonly id: JsonRpcId };

/**
 * Parse a single JSON-RPC line. Distinguishes:
 * - parse failure → `parse-error` (§4.2)
 * - empty array → `invalid-request` per §6
 * - non-object scalar → `invalid-request`
 * - object with bad `jsonrpc`/`method` → `invalid-request`
 * - object with `id` present → `request`
 * - object without `id` → `notification`
 * - non-empty array → `batch` with per-element outcomes
 *
 * Note (§4 id-vs-notification): `"id": null` is a Request with id null,
 * not a notification. Only an absent id field marks a notification.
 */
function _parse(line: string): ParseOutcome {
  let raw: unknown;
  try {
    raw = JSON.parse(line);
  } catch {
    const parseFailure: ParseOutcome = { kind: 'parse-error' };
    return parseFailure;
  }
  if (Array.isArray(raw)) {
    if (raw.length === 0) return { kind: 'invalid-request', id: null };
    return { kind: 'batch', outcomes: raw.map(_classify) };
  }
  return _classify(raw);
}

function _classify(raw: unknown): ParseOutcome {
  if (typeof raw !== 'object' || raw === null) {
    return { kind: 'invalid-request', id: null };
  }
  const obj = raw as Record<string, unknown>;
  const hasId = 'id' in obj && obj.id !== undefined;
  const validId = !hasId || typeof obj.id === 'string' || typeof obj.id === 'number' || obj.id === null;
  const validParams =
    !('params' in obj) ||
    obj.params === undefined ||
    Array.isArray(obj.params) ||
    (typeof obj.params === 'object' && obj.params !== null);
  if (obj.jsonrpc !== '2.0' || typeof obj.method !== 'string' || !validId || !validParams) {
    const id =
      typeof obj.id === 'string' || typeof obj.id === 'number' || obj.id === null ? (obj.id as JsonRpcId) : null;
    return { kind: 'invalid-request', id };
  }
  if (!hasId) {
    return { kind: 'notification', message: obj as unknown as JsonRpcNotification };
  }
  return { kind: 'request', message: obj as unknown as JsonRpcRequest };
}

/** Construct a -32700 / -32600 / -32601 / -32602 / -32603 error response. */
function _errorResponse(id: JsonRpcId, code: number, message: string, data?: unknown): JsonRpcErrorResponse {
  return data !== undefined
    ? { jsonrpc: '2.0', id, error: { code, message, data } }
    : { jsonrpc: '2.0', id, error: { code, message } };
}

/** Construct a success response (§5). */
function _successResponse(id: JsonRpcId, result: unknown): JsonRpcSuccess {
  return { jsonrpc: '2.0', id, result };
}

/** Parse one JSON-RPC wire line into its exact protocol outcome. */
export const parse = _parse;
/** Construct one JSON-RPC error response. */
export const errorResponse = _errorResponse;
/** Construct one JSON-RPC success response. */
export const successResponse = _successResponse;

// ---------- Capsule declaration (pureTransform arm) ----------
//
// Schemas are deliberately structural: the harness walks them (schemaToArbitrary
// over the kernel AST) to sample inputs and strict-`decode`s `fc.anything()`
// values against them, so we only need enough shape for it to filter the
// property test.
const MALFORMED_WITNESS = '{"jsonrpc":"2.0",';
const REQUEST_ID_WITNESS = '{"jsonrpc":"2.0","id":"request-7","method":"ping"}';
const NOTIFICATION_WITNESS = '{"jsonrpc":"2.0","method":"ping"}';
const INVALID_REQUEST_WITNESS = '42';

/**
 * Deterministic protocol witnesses driven by the generated capsule test and
 * benchmark. The general parser remains open to every string; this finite
 * declaration corpus guarantees that every invariant premise is exercised
 * instead of hoping an unconstrained random string happens to be a valid
 * request or notification.
 */
export const JSON_RPC_CAPSULE_WITNESSES = Object.freeze([
  MALFORMED_WITNESS,
  REQUEST_ID_WITNESS,
  NOTIFICATION_WITNESS,
  INVALID_REQUEST_WITNESS,
] as const);

const JsonRpcInputSchema = schema.string;
const ParseOutcomeKindSchema = schema.union(
  schema.literal('request'),
  schema.literal('notification'),
  schema.literal('batch'),
  schema.literal('parse-error'),
  schema.literal('invalid-request'),
);
const JsonRpcProtocolObservationSchema = schema.struct({
  inputKind: ParseOutcomeKindSchema,
  malformedKind: ParseOutcomeKindSchema,
  notificationKind: ParseOutcomeKindSchema,
  requestCorrelationId: schema.union(schema.string, schema.number, schema.literal(null)),
});

/** Minimal observable protocol result carried by the generated capsule oracle. */
export interface JsonRpcProtocolObservation {
  readonly inputKind: ParseOutcome['kind'];
  readonly malformedKind: ParseOutcome['kind'];
  readonly notificationKind: ParseOutcome['kind'];
  readonly requestCorrelationId: JsonRpcId;
}

type JsonRpcParser = (input: string) => ParseOutcome;

/**
 * Drive one parser subject over both an arbitrary input and the deterministic
 * conformance witnesses. The injected subject exists so mutation controls can
 * prove the generated invariants reject a broken implementation.
 */
export function observeJsonRpcProtocolWith(parser: JsonRpcParser, input: string): JsonRpcProtocolObservation {
  const inputOutcome = parser(input);
  const malformed = parser(MALFORMED_WITNESS);
  const notification = parser(NOTIFICATION_WITNESS);
  const request = parser(REQUEST_ID_WITNESS);
  return {
    inputKind: inputOutcome.kind,
    malformedKind: malformed.kind,
    notificationKind: notification.kind,
    requestCorrelationId: request.kind === 'request' ? request.message.id : null,
  };
}

/** Project the live parser into the capsule's fully described observation. */
export function observeJsonRpcProtocol(input: string): JsonRpcProtocolObservation {
  return observeJsonRpcProtocolWith(_parse, input);
}

/**
 * Capsule definition for the kernel — placed in the catalog under the
 * `pureTransform` arm so the factory compiler emits a generated test +
 * bench pair and the manifest tracks the kernel's content address.
 */
export const jsonRpcServerCapsule = defineCapsule({
  _kind: 'pureTransform',
  name: 'mcp.jsonrpc-server',
  site: ['node', 'browser'],
  capabilities: { reads: [], writes: [] },
  input: JsonRpcInputSchema,
  output: JsonRpcProtocolObservationSchema,
  budgets: { p95Ms: 1, allocClass: 'bounded' },
  invariants: [
    {
      name: 'malformed-json-yields-parse-error',
      check: (_input: string, output): boolean => output.malformedKind === 'parse-error',
      message: 'inputs that JSON.parse rejects must yield kind: parse-error',
    },
    {
      name: 'absent-id-classifies-as-notification',
      check: (_input: string, output): boolean => output.notificationKind === 'notification',
      message: 'well-formed messages without an id field must classify as notifications (§4.1)',
    },
    {
      name: 'request-id-round-trips',
      check: (_input: string, output): boolean => output.requestCorrelationId === 'request-7',
      message: 'a valid request must preserve its exact correlation id',
    },
  ],
  run: observeJsonRpcProtocol,
});

// ---------- Namespace surface (ADR-0001) ----------

/** Namespaced public surface of the kernel. */
export const JsonRpcServer = {
  parse: _parse,
  errorResponse: _errorResponse,
  successResponse: _successResponse,
} as const;

export declare namespace JsonRpcServer {
  /** Discriminated parse outcome. */
  export type Outcome = ParseOutcome;
  /** Wire-shape request (§4). */
  export type Request = JsonRpcRequest;
  /** Wire-shape notification (§4.1). */
  export type Notification = JsonRpcNotification;
  /** Wire-shape response (§5). */
  export type Response = JsonRpcResponse;
  /** Wire-shape success response. */
  export type Success = JsonRpcSuccess;
  /** Wire-shape error response. */
  export type Error = JsonRpcErrorResponse;
  /** Id type per §4. */
  export type Id = JsonRpcId;
}
