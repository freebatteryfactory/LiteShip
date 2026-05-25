/**
 * Typed error sentinels shared across the MCP dispatch arms (CUT D3). Thrown by
 * the resource/prompt projections and the tools/call path; `dispatch`'s catch
 * block maps each to its JSON-RPC / MCP error code. Keeping them here (not in the
 * framework-free JSON-RPC kernel) keeps `jsonrpc.ts` MCP-agnostic.
 *
 * @module
 */

/** MCP resource-not-found error code (spec-defined for `resources/read`; NOT a standard JSON-RPC code). */
export const RESOURCE_NOT_FOUND = -32002 as const;

/**
 * Sentinel for malformed parameters inside a method invocation. Caught by
 * `dispatch` and mapped to JSON-RPC 2.0 §5.1 code -32602. Also used for an
 * unknown prompt name or an invalid prompt argument value (the MCP layer reports
 * those as invalid params, per the 2025-11-25 prompts spec).
 */
export class InvalidParamsError extends Error {
  constructor(
    message: string,
    readonly detail?: unknown,
  ) {
    super(message);
    this.name = 'InvalidParamsError';
  }
}

/** Sentinel for `resources/read` on an unknown URI. Mapped to {@link RESOURCE_NOT_FOUND} (-32002), NOT -32601. */
export class ResourceNotFoundError extends Error {
  constructor(readonly uri: string) {
    super(`resource not found: ${uri}`);
    this.name = 'ResourceNotFoundError';
  }
}
