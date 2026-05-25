/**
 * @czap command spine — declaration-only contract for the shared command
 * registry (CUT A1). One canonical command language: `@czap/command` owns the
 * runtime (registry + dispatcher + handlers); `@czap/cli` and `@czap/mcp-server`
 * are projection adapters. These types carry no runtime behavior.
 */

/** Minimal JSON-Schema object shape for a command's input/output contract. */
export interface CommandJsonSchema {
  readonly type: 'object';
  readonly properties?: Readonly<Record<string, unknown>>;
  readonly required?: readonly string[];
}

/**
 * Surface hints for a command, expressed as DATA rather than two hand-edited
 * arrays (the CLI/MCP subset divergence becomes a field, not a maintenance gap).
 */
export interface CommandAnnotations {
  /** Long-running (e.g. dev server, the mcp server itself) — excluded from MCP tools by default. */
  readonly longRunning?: boolean;
  /** Read-only command (no mutation, safe to auto-run). */
  readonly readOnly?: boolean;
  /** Destructive / side-effectful (e.g. publish). */
  readonly destructive?: boolean;
  /** Emits raw text (help/completion), not a JSON receipt. */
  readonly cliOnly?: boolean;
  /** Whether the command is exposed as an MCP tool. Defaults true unless longRunning/cliOnly. */
  readonly mcpExposed?: boolean;
}

/** Identity + contract that drives CLI listing AND MCP tools/list from ONE source. */
export interface CapsuleCommandDescriptor {
  /** Canonical dotted id, e.g. `scene.render`. */
  readonly name: string;
  readonly summary: string;
  readonly inputSchema: CommandJsonSchema;
  readonly outputSchema?: CommandJsonSchema;
  readonly annotations?: CommandAnnotations;
}

/** A transport-neutral request to run a command with already-parsed (not argv) args. */
export interface CapsuleCommandInvocation {
  readonly name: string;
  readonly args: Readonly<Record<string, unknown>>;
}

/**
 * The structured outcome of a command. The CLI adapter serializes `payload` to a
 * stdout JSON line; the MCP adapter returns the same `payload` as structuredContent.
 * No stdout capture, no flattening.
 */
export interface CapsuleCommandResult<P = unknown> {
  readonly status: 'ok' | 'failed';
  readonly command: string;
  readonly timestamp: string;
  /** Only verdict-bearing commands (ship verify) set this. */
  readonly verdict?: 'Verified' | 'Mismatch' | 'Incomplete' | 'Unknown';
  readonly payload?: P;
  /** Process exit code the CLI adapter maps from the result (0 = ok). */
  readonly exitCode?: number;
}
