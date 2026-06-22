/**
 * capsule inspect / list / verify (CUT A1) — read operations over the capsule
 * manifest, plus generated-test verification. Pure logic returning structured
 * results: the adapter resolves + reads the manifest (honoring
 * CZAP_CAPSULE_MANIFEST) and runs vitest; these handlers parse + decide.
 *
 * @module
 */
import { Schema } from 'effect';
import { schemaToJsonSchema, wallClock, type CapsuleCommandResult } from '@czap/core';
import { capabilityUnavailable, type CommandCapability, type HandledCommand } from '../registry.js';
import { loadManifest, manifestUnavailable } from './manifest.js';

function failed(command: string, error: string, exitCode: number): CapsuleCommandResult {
  return {
    status: 'failed',
    command,
    timestamp: new Date(wallClock.now()).toISOString(),
    exitCode,
    payload: { error },
  };
}

/** `<verb> <id>` args — the single source of the inspect/verify `inputSchema`. */
const INSPECT_SCHEMA = schemaToJsonSchema(Schema.Struct({ id: Schema.String }));

/**
 * `capsule inspect` output: the entry is an opaque manifest object whose internal
 * fields are intentionally NOT mirrored here (decision #2: avoid drift with the
 * manifest). `Schema.Struct({})` keeps the `type:object` teeth without pinning
 * the entry's internal shape.
 */
const CapsuleInspectPayloadSchema = Schema.Struct({ capsule: Schema.Struct({}) });

/** `capsule list` output — the entries are opaque manifest objects; `kind` is the nullable filter echo. */
const CapsuleListPayloadSchema = Schema.Struct({
  capsules: Schema.Array(Schema.Struct({})),
  kind: Schema.NullOr(Schema.String),
});

/** `capsule verify` output — the verified capsule's id. */
const CapsuleVerifyPayloadSchema = Schema.Struct({ capsuleId: Schema.String });

/** `capsule inspect <id>` — return a single manifest entry. */
export const capsuleInspectCommand: HandledCommand = {
  descriptor: {
    name: 'capsule.inspect',
    summary: 'Inspect a capsule manifest entry.',
    inputSchema: INSPECT_SCHEMA,
    // Minimal stable contract (decision #2): the entry is a manifest object;
    // its internal fields are not mirrored here to avoid drift with the manifest.
    outputSchema: schemaToJsonSchema(CapsuleInspectPayloadSchema),
    annotations: { readOnly: true, mcpExposed: true, group: 'manifest' },
    // CUT D5: link a live MCP Apps view that renders this tool's result (host-injected).
    ui: { resourceUri: 'ui://liteship/app/capsule-inspect' },
  },
  handler: async (invocation, context): Promise<CapsuleCommandResult> => {
    const loaded = loadManifest(context);
    if (!loaded.ok) return manifestUnavailable('capsule.inspect', loaded, context);
    const { manifest } = loaded;
    const id = String(invocation.args.id ?? '');
    const entry = manifest.capsules.find((c) => c.name === id);
    if (!entry) return failed('capsule.inspect', `capsule not found: ${id}`, 1);
    return {
      status: 'ok',
      command: 'capsule.inspect',
      timestamp: new Date(wallClock.now()).toISOString(),
      payload: { capsule: entry },
    };
  },
};

/** `capsule list [--kind=<kind>]` — list manifest entries, optionally filtered. */
export const capsuleListCommand: HandledCommand = {
  descriptor: {
    name: 'capsule.list',
    summary: 'List capsules, optionally filtered by kind.',
    inputSchema: schemaToJsonSchema(Schema.Struct({ kind: Schema.optional(Schema.String) })),
    outputSchema: schemaToJsonSchema(CapsuleListPayloadSchema),
    annotations: { readOnly: true, mcpExposed: true, group: 'manifest' },
  },
  handler: async (invocation, context): Promise<CapsuleCommandResult> => {
    const loaded = loadManifest(context);
    if (!loaded.ok) return manifestUnavailable('capsule.list', loaded, context);
    const { manifest } = loaded;
    const kind = typeof invocation.args.kind === 'string' ? invocation.args.kind : undefined;
    const capsules = kind ? manifest.capsules.filter((c) => c.kind === kind) : manifest.capsules;
    return {
      status: 'ok',
      command: 'capsule.list',
      timestamp: new Date(wallClock.now()).toISOString(),
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
    requires: ['runVitest'] satisfies readonly CommandCapability[],
    outputSchema: schemaToJsonSchema(CapsuleVerifyPayloadSchema),
    annotations: { mcpExposed: true, group: 'manifest' },
  },
  handler: async (invocation, context): Promise<CapsuleCommandResult> => {
    const loaded = loadManifest(context);
    if (!loaded.ok) return manifestUnavailable('capsule.verify', loaded, context);
    const { manifest } = loaded;
    const id = String(invocation.args.id ?? '');
    const entry = manifest.capsules.find((c) => c.name === id);
    if (!entry) return failed('capsule.verify', `capsule not found: ${id}`, 1);
    if (!entry.generated) return failed('capsule.verify', `capsule has no generated tests: ${id}`, 2);
    // Direct-invocation guard; the dispatcher already enforces `requires`.
    if (!context.runVitest) return capabilityUnavailable('capsule.verify', ['runVitest']);
    const { exitCode, stderrTail } = await context.runVitest([entry.generated.testFile]);
    if (exitCode !== 0) {
      return failed('capsule.verify', `generated tests failed${stderrTail ? `: ${stderrTail.trim()}` : ''}`, 2);
    }
    return {
      status: 'ok',
      command: 'capsule.verify',
      timestamp: new Date(wallClock.now()).toISOString(),
      payload: { capsuleId: entry.name },
    };
  },
};
