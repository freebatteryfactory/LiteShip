/**
 * capsule inspect / list / verify (CUT A1) — read operations over the capsule
 * manifest, plus generated-test verification. Pure logic returning structured
 * results: the adapter resolves + reads the manifest (honoring
 * CZAP_CAPSULE_MANIFEST) and runs vitest; these handlers parse + decide.
 *
 * @module
 */
import type { CapsuleCommandResult } from '@czap/core';
import type { CommandContext, HandledCommand } from '../registry.js';

/** One capsule-manifest entry. */
export interface CapsuleManifestEntry {
  readonly name: string;
  readonly kind: string;
  readonly source: string;
  readonly generated: { readonly testFile: string; readonly benchFile: string };
}

/** The capsule manifest document. */
export interface CapsuleManifest {
  readonly capsules: readonly CapsuleManifestEntry[];
}

/** Parse the injected manifest source. Null when the manifest is absent. */
function loadManifest(context: CommandContext): CapsuleManifest | null {
  const source = context.manifestSource?.();
  if (!source) return null;
  return JSON.parse(source) as CapsuleManifest;
}

function failed(command: string, error: string, exitCode: number): CapsuleCommandResult {
  return { status: 'failed', command, timestamp: new Date().toISOString(), exitCode, payload: { error } };
}

const INSPECT_SCHEMA = { type: 'object', required: ['id'], properties: { id: { type: 'string' } } } as const;

/** `capsule inspect <id>` — return a single manifest entry. */
export const capsuleInspectCommand: HandledCommand = {
  descriptor: {
    name: 'capsule.inspect',
    summary: 'Inspect a capsule manifest entry.',
    inputSchema: INSPECT_SCHEMA,
    annotations: { readOnly: true, mcpExposed: true, group: 'manifest' },
  },
  handler: async (invocation, context): Promise<CapsuleCommandResult> => {
    const manifest = loadManifest(context);
    if (!manifest) return failed('capsule.inspect', 'manifest missing', 1);
    const id = String(invocation.args.id ?? '');
    const entry = manifest.capsules.find((c) => c.name === id);
    if (!entry) return failed('capsule.inspect', `capsule not found: ${id}`, 1);
    return { status: 'ok', command: 'capsule.inspect', timestamp: new Date().toISOString(), payload: { capsule: entry } };
  },
};

/** `capsule list [--kind=<kind>]` — list manifest entries, optionally filtered. */
export const capsuleListCommand: HandledCommand = {
  descriptor: {
    name: 'capsule.list',
    summary: 'List capsules, optionally filtered by kind.',
    inputSchema: { type: 'object', properties: { kind: { type: 'string' } } },
    annotations: { readOnly: true, mcpExposed: true, group: 'manifest' },
  },
  handler: async (invocation, context): Promise<CapsuleCommandResult> => {
    const manifest = loadManifest(context);
    if (!manifest) return failed('capsule.list', 'manifest missing', 1);
    const kind = typeof invocation.args.kind === 'string' ? invocation.args.kind : undefined;
    const capsules = kind ? manifest.capsules.filter((c) => c.kind === kind) : manifest.capsules;
    return {
      status: 'ok',
      command: 'capsule.list',
      timestamp: new Date().toISOString(),
      payload: { capsules, kind: kind ?? null },
    };
  },
};

/** `capsule verify <id>` — run the capsule's generated test files. */
export const capsuleVerifyCommand: HandledCommand = {
  descriptor: {
    name: 'capsule.verify',
    summary: 'Verify a capsule’s generated tests.',
    inputSchema: INSPECT_SCHEMA,
    annotations: { mcpExposed: true, group: 'manifest' },
  },
  handler: async (invocation, context): Promise<CapsuleCommandResult> => {
    const manifest = loadManifest(context);
    if (!manifest) return failed('capsule.verify', 'manifest missing', 1);
    const id = String(invocation.args.id ?? '');
    const entry = manifest.capsules.find((c) => c.name === id);
    if (!entry) return failed('capsule.verify', `capsule not found: ${id}`, 1);
    if (!context.runVitest) return failed('capsule.verify', 'vitest runner unavailable', 2);
    const { exitCode, stderrTail } = await context.runVitest([entry.generated.testFile]);
    if (exitCode !== 0) {
      return failed('capsule.verify', `generated tests failed${stderrTail ? `: ${stderrTail.trim()}` : ''}`, 2);
    }
    return { status: 'ok', command: 'capsule.verify', timestamp: new Date().toISOString(), payload: { capsuleId: entry.name } };
  },
};
