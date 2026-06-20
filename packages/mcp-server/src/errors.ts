/**
 * MCP-specific JSON-RPC error codes. The dispatch catch block maps `@czap/error`
 * tagged variants to these codes (`hasTag(e, 'ValidationError')` → -32602,
 * `hasTag(e, 'NotFoundError')` → {@link RESOURCE_NOT_FOUND}). Keeping the code
 * constant here (not in the framework-free JSON-RPC kernel) keeps `jsonrpc.ts`
 * MCP-agnostic.
 *
 * @module
 */

/** MCP resource-not-found error code (spec-defined for `resources/read`; NOT a standard JSON-RPC code). */
export const RESOURCE_NOT_FOUND = -32002 as const;
