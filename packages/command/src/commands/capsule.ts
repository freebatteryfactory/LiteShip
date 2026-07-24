/**
 * capsule inspect / list / verify (CUT A1) — read operations over the capsule
 * manifest, plus generated-test verification. Pure logic returning structured
 * results: the adapter resolves + reads the manifest (honoring
 * LITESHIP_CAPSULE_MANIFEST) and runs vitest; these handlers parse + decide.
 *
 * @module
 */
import { type CapsuleCommandResult, type CommandJsonSchema, schema } from '@liteship/core';
import { capabilityUnavailable, defineCommand, failed, ok, type CommandCapability } from '../registry.js';
import { loadManifest, manifestUnavailable, type CapsuleManifestEntry } from './manifest.js';

/** A domain failure whose payload is a single teaching `error` string. */
function fail(command: string, error: string, exitCode: number): CapsuleCommandResult {
  return failed(command, { error }, exitCode);
}

/** `<verb> <id>` args — the single source of the inspect/verify `inputSchema`. */
const INSPECT_SCHEMA = {
  type: 'object',
  properties: { id: { type: 'string' } },
  required: ['id'],
} as const satisfies CommandJsonSchema;

/**
 * `capsule inspect` output: the entry is an opaque manifest object whose internal
 * fields are intentionally NOT mirrored here (decision #2: avoid drift with the
 * manifest). An empty `properties` object keeps the `type:object` teeth without
 * pinning the entry's internal shape.
 */
const CapsuleInspectPayloadSchema = {
  type: 'object',
  properties: { capsule: { type: 'object', properties: {} } },
  required: ['capsule'],
} as const satisfies CommandJsonSchema;

/** `capsule list` output — the entries are opaque manifest objects; `kind` is the nullable filter echo. */
const CapsuleListPayloadSchema = {
  type: 'object',
  properties: {
    capsules: { type: 'array', items: { type: 'object', properties: {} } },
    kind: { type: ['string', 'null'] },
  },
  required: ['capsules', 'kind'],
} as const satisfies CommandJsonSchema;

/** `capsule verify` output — the verified capsule's id. */
const CapsuleVerifyPayloadSchema = {
  type: 'object',
  properties: { capsuleId: { type: 'string' } },
  required: ['capsuleId'],
} as const satisfies CommandJsonSchema;

/**
 * Structured payload returned by `capsule.inspect` — a single manifest entry.
 * The descriptor's outputSchema keeps the entry opaque (decision #2, no drift
 * with the manifest); this TS mirror is the precise real shape, a
 * CapsuleManifestEntry.
 */
export type CapsuleInspectPayload = {
  readonly capsule: CapsuleManifestEntry;
};

/** Structured payload returned by `capsule.list` — the (optionally filtered) entries + the nullable `kind` echo. */
export type CapsuleListPayload = {
  readonly capsules: readonly CapsuleManifestEntry[];
  readonly kind: string | null;
};

/**
 * Structured payload returned by the manifest-tier `capsule.verify` verb — the
 * verified capsule's id. Named distinctly from the `capsule-verify` GATE's
 * CapsuleVerifyPayload (a different command with a different shape).
 */
export type CapsuleVerifyResultPayload = {
  readonly capsuleId: string;
};

/** `capsule inspect <id>` — return a single manifest entry. */
export const capsuleInspectCommand = defineCommand({
  descriptor: {
    name: 'capsule.inspect',
    summary: 'Inspect a capsule manifest entry.',
    inputSchema: INSPECT_SCHEMA,
    // Minimal stable contract (decision #2): the entry is a manifest object;
    // its internal fields are not mirrored here to avoid drift with the manifest.
    outputSchema: CapsuleInspectPayloadSchema,
    annotations: { readOnly: true, mcpExposed: true, group: 'manifest' },
    // CUT D5: link a live MCP Apps view that renders this tool's result (host-injected).
    ui: { resourceUri: 'ui://liteship/app/capsule-inspect' },
  },
  argsSchema: schema.struct({ id: schema.string }),
  handler: async (invocation, context): Promise<CapsuleCommandResult> => {
    const loaded = loadManifest(context);
    if (!loaded.ok) return manifestUnavailable('capsule.inspect', loaded, context);
    const { manifest } = loaded;
    const id = invocation.args.id;
    const entry = manifest.capsules.find((c) => c.name === id);
    if (!entry) return fail('capsule.inspect', `capsule not found: ${id}`, 1);
    return ok('capsule.inspect', { capsule: entry });
  },
});

/** `capsule list [--kind=<kind>]` — list manifest entries, optionally filtered. */
export const capsuleListCommand = defineCommand({
  descriptor: {
    name: 'capsule.list',
    summary: 'List capsules, optionally filtered by kind.',
    inputSchema: {
      type: 'object',
      properties: { kind: { type: 'string' } },
    } as const satisfies CommandJsonSchema,
    outputSchema: CapsuleListPayloadSchema,
    annotations: { readOnly: true, mcpExposed: true, group: 'manifest' },
  },
  argsSchema: schema.struct({ kind: schema.optional(schema.string) }),
  handler: async (invocation, context): Promise<CapsuleCommandResult> => {
    const loaded = loadManifest(context);
    if (!loaded.ok) return manifestUnavailable('capsule.list', loaded, context);
    const { manifest } = loaded;
    const kind = invocation.args.kind;
    const capsules = kind ? manifest.capsules.filter((c) => c.kind === kind) : manifest.capsules;
    return ok('capsule.list', { capsules, kind: kind ?? null });
  },
});

/** `capsule verify <id>` — run the capsule's generated test files. */
export const capsuleVerifyCommand = defineCommand({
  descriptor: {
    name: 'capsule.verify',
    summary: 'Verify a capsule’s generated tests.',
    inputSchema: INSPECT_SCHEMA,
    requires: ['runVitest'] satisfies readonly CommandCapability[],
    outputSchema: CapsuleVerifyPayloadSchema,
    annotations: { mcpExposed: true, group: 'manifest' },
  },
  argsSchema: schema.struct({ id: schema.string }),
  handler: async (invocation, context): Promise<CapsuleCommandResult> => {
    const loaded = loadManifest(context);
    if (!loaded.ok) return manifestUnavailable('capsule.verify', loaded, context);
    const { manifest } = loaded;
    const id = invocation.args.id;
    const entry = manifest.capsules.find((c) => c.name === id);
    if (!entry) return fail('capsule.verify', `capsule not found: ${id}`, 1);
    if (!entry.generated) return fail('capsule.verify', `capsule has no generated tests: ${id}`, 2);
    // Direct-invocation guard; the dispatcher already enforces `requires`.
    if (!context.runVitest) return capabilityUnavailable('capsule.verify', ['runVitest']);
    const { exitCode, stderrTail } = await context.runVitest([entry.generated.testFile]);
    if (exitCode !== 0) {
      return fail('capsule.verify', `generated tests failed${stderrTail ? `: ${stderrTail.trim()}` : ''}`, 2);
    }
    return ok('capsule.verify', { capsuleId: entry.name });
  },
});
