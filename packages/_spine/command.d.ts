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
  /**
   * Explicit opt-in: the command is exposed as an MCP tool. Absent / false means
   * not exposed. (The exposed set is a deliberate curation, not derivable from
   * longRunning/cliOnly — e.g. glossary is read-only but intentionally CLI-only.)
   */
  readonly mcpExposed?: boolean;
  /**
   * Presentation phase used to group the command in the CLI help chart
   * ("the chart: CLI verb table grouped by phase"). Identity, not chrome: the
   * adapter maps a group key to a human label + order. Surfaces that don't group
   * (MCP, describe) ignore it.
   */
  readonly group?: string;
  /**
   * The command's execution is owned by the CLI (terminal-streaming
   * orchestration, destructive workflow, visible repair, long-running launch, or
   * a catalog projection) — it intentionally has NO `@czap/command` handler. The
   * registry still carries its descriptor for identity/discovery. This makes
   * "descriptor without handler" an explicit, tested choice rather than a silent
   * gap: a finite structured command missing its handler is a bug; a `cliOwned`
   * one is by design.
   */
  readonly cliOwned?: boolean;
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
