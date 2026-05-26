/**
 * Command language re-anchored from `@czap/_spine` (the canonical type source,
 * ADR-0010). The shared command registry runtime lives in `@czap/command`; these
 * are the declaration-only contract types the CLI and MCP adapters share. (CUT A1)
 *
 * @module
 */
import type {
  CapsuleCommandDescriptor as _CapsuleCommandDescriptor,
  CapsuleCommandInvocation as _CapsuleCommandInvocation,
  CapsuleCommandResult as _CapsuleCommandResult,
  CapsuleResultReceipt as _CapsuleResultReceipt,
  CapsuleResultMetaKey as _CapsuleResultMetaKey,
  CommandAnnotations as _CommandAnnotations,
  CommandExecutionKind as _CommandExecutionKind,
  CommandJsonSchema as _CommandJsonSchema,
  WallClockTimestamp as _WallClockTimestamp,
} from '@czap/_spine';

/** Minimal JSON-Schema object shape for a command's input/output contract. */
export type CommandJsonSchema = _CommandJsonSchema;
/** Surface hints (longRunning/readOnly/destructive/cliOnly/mcpExposed) carried as data. */
export type CommandAnnotations = _CommandAnnotations;
/** Execution shape: `handler` (finite structured) vs `cli-orchestration` (CLI-owned). */
export type CommandExecutionKind = _CommandExecutionKind;
/** Identity + contract driving CLI listing AND MCP tools/list from one source. */
export type CapsuleCommandDescriptor = _CapsuleCommandDescriptor;
/** Transport-neutral request: a command name + already-parsed args. */
export type CapsuleCommandInvocation = _CapsuleCommandInvocation;
/** Structured command outcome; CLI serializes `payload`, MCP returns it as structuredContent. */
export type CapsuleCommandResult<P = unknown> = _CapsuleCommandResult<P>;
/** LiteShip result identity carried in an MCP result's `_meta` (CUT D1). */
export type CapsuleResultReceipt = _CapsuleResultReceipt;
/** Reverse-DNS `_meta` key for the result receipt. */
export type CapsuleResultMetaKey = _CapsuleResultMetaKey;
/** Volatile wall-clock ISO stamp (CUT B2) — identity-irrelevant; never an HLC. */
export type WallClockTimestamp = _WallClockTimestamp;
