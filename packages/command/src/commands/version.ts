/**
 * version command (CUT A1) — reports czap, Node, and pnpm versions as a
 * structured result. The handler owns no I/O of its own: the host's czap
 * version and the pnpm probe arrive through {@link CommandContext}, so the
 * adapter keeps `node:child_process` and package-resolution on its side.
 *
 * @module
 */
import { wallClock, type CapsuleCommandResult, type CommandJsonSchema } from '@czap/core';
import type { CommandContext, HandledCommand } from '../registry.js';

/**
 * The descriptor `outputSchema` for the version command — hand-written
 * JSON-Schema, byte-parity-pinned against the parity fixture. {@link VersionPayload}
 * is the plain-TS mirror of this shape; the two are kept in step by the
 * output-schema-law payload-conformance test, not by a shared Effect Schema.
 */
export const VersionPayloadSchema = {
  type: 'object',
  properties: {
    czap: { type: 'string' },
    node: { type: 'string' },
    pnpm: { type: ['string', 'null'] },
  },
  required: ['czap', 'node', 'pnpm'],
} as const satisfies CommandJsonSchema;

/** Structured payload returned by the version command. */
export type VersionPayload = {
  readonly czap: string;
  readonly node: string;
  readonly pnpm: string | null;
};

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
    inputSchema: { type: 'object', properties: {} } as const satisfies CommandJsonSchema,
    outputSchema: VersionPayloadSchema,
    annotations: { readOnly: true, group: 'castoff' },
  },
  handler: async (_invocation, context): Promise<CapsuleCommandResult<VersionPayload>> => ({
    status: 'ok',
    command: 'version',
    timestamp: new Date(wallClock.now()).toISOString(),
    payload: {
      czap: context.hostVersion?.() ?? '0.0.0-unknown',
      node: process.versions.node,
      pnpm: await probePnpm(context),
    },
  }),
};
