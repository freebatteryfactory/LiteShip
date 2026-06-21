/**
 * version command (CUT A1) — reports czap, Node, and pnpm versions as a
 * structured result. The handler owns no I/O of its own: the host's czap
 * version and the pnpm probe arrive through {@link CommandContext}, so the
 * adapter keeps `node:child_process` and package-resolution on its side.
 *
 * @module
 */
import { Schema } from 'effect';
import { schemaToJsonSchema, type CapsuleCommandResult } from '@czap/core';
import type { CommandContext, HandledCommand } from '../registry.js';

/**
 * Structured payload returned by the version command — ONE Effect Schema is the
 * source of both {@link VersionPayload} and the descriptor's `outputSchema`.
 */
export const VersionPayloadSchema = Schema.Struct({
  czap: Schema.String,
  node: Schema.String,
  pnpm: Schema.NullOr(Schema.String),
});

/** Structured payload returned by the version command. */
export type VersionPayload = Schema.Schema.Type<typeof VersionPayloadSchema>;

/** Probe pnpm via the injected spawn capability. Returns null when unavailable. */
async function probePnpm(context: CommandContext): Promise<string | null> {
  if (!context.spawnCapture) return null;
  const result = await context.spawnCapture('pnpm', ['--version']).catch(() => null);
  if (!result || result.exitCode !== 0) return null;
  return result.stdout.trim() || null;
}

/** The version command: descriptor + handler returning a structured result. */
export const versionCommand: HandledCommand = {
  descriptor: {
    name: 'version',
    summary: 'Report czap, Node, and pnpm versions.',
    inputSchema: schemaToJsonSchema(Schema.Struct({})),
    outputSchema: schemaToJsonSchema(VersionPayloadSchema),
    annotations: { readOnly: true, group: 'castoff' },
  },
  handler: async (_invocation, context): Promise<CapsuleCommandResult<VersionPayload>> => ({
    status: 'ok',
    command: 'version',
    timestamp: new Date().toISOString(),
    payload: {
      czap: context.hostVersion?.() ?? '0.0.0-unknown',
      node: process.versions.node,
      pnpm: await probePnpm(context),
    },
  }),
};
