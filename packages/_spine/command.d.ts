/**
 * @czap command spine — declaration-only contract for the shared command
 * registry (CUT A1). One canonical command language: `@czap/command` owns the
 * runtime (registry + dispatcher + handlers); `@czap/cli` and `@czap/mcp-server`
 * are projection adapters. These types carry no runtime behavior.
 */

import type { ContentAddress } from './core.d.ts';

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
}

/**
 * What execution shape a command is — the central command law:
 *
 *   - `handler`: finite structured invocation → returns a `CapsuleCommandResult`
 *     via a `@czap/command` handler. The only kind eligible for MCP exposure.
 *   - `cli-orchestration`: terminal UX, inherited stdio, long-running servers,
 *     destructive workflows, visible repairs, streaming receipts, or catalog
 *     projections. Registry-described for identity/discovery, but intentionally
 *     has NO handler — the CLI owns its execution. Never MCP-exposed.
 *
 * Making this explicit (vs. inferring "no handler ⇒ fine") means a finite
 * command that lost its handler is a detectable bug, not a silent gap.
 */
export type CommandExecutionKind = 'handler' | 'cli-orchestration';

/** Identity + contract that drives CLI listing AND MCP tools/list from ONE source. */
export interface CapsuleCommandDescriptor {
  /** Canonical dotted id, e.g. `scene.render`. */
  readonly name: string;
  readonly summary: string;
  readonly inputSchema: CommandJsonSchema;
  readonly outputSchema?: CommandJsonSchema;
  readonly annotations?: CommandAnnotations;
  /** Execution shape — `handler` (structured) vs `cli-orchestration` (CLI-owned). */
  readonly executionKind?: CommandExecutionKind;
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

/**
 * LiteShip result identity carried in an MCP tool result's `_meta` under the
 * reverse-DNS key {@link CapsuleResultMetaKey} (CUT D1). Provenance, NOT the
 * semantic payload: `structuredContent` carries the payload (what an
 * `outputSchema` will describe in D2); this carries who produced it plus a
 * content-addressed identity. A cross-adapter pure type — the MCP skin
 * populates it now; the CLI may project the same identity later.
 */
export interface CapsuleResultReceipt {
  /** Canonical command id that produced the result. */
  readonly command: string;
  /**
   * Content address over the STABLE result (command + status + payload +
   * verdict? + exitCode?). Excludes the volatile `timestamp` so identical
   * outcomes share an id (idempotency). Advisory identity, not an integrity digest.
   */
  readonly resultId: ContentAddress;
  /** ISO timestamp the command stamped — carried as-is, NOT part of `resultId`. */
  readonly timestamp: string;
  readonly verdict?: 'Verified' | 'Mismatch' | 'Incomplete' | 'Unknown';
  readonly exitCode?: number;
}

/** Reverse-DNS `_meta` key under which a {@link CapsuleResultReceipt} rides on an MCP result. */
export type CapsuleResultMetaKey = 'dev.heyoub.liteship/result';
