/**
 * explain command — the ONE lookup an agent (or a human) uses to turn a bare
 * diagnostic code or an exported symbol into its meaning.
 *
 * Two resolution arms, tried in order:
 *
 *  (a) DIAGNOSTIC CODE — if the arg is a key of `@liteship/error`'s
 *      {@link DIAGNOSTIC_REGISTRY} (an `area/slug` code), project its
 *      `DiagnosticEntry` (title / explanation / remediation / area) PLUS the
 *      EMITTER that produces it and — where one exists — the negative-control
 *      pointer that proves the emitter can fail. This arm is DATA-ONLY (the
 *      registry from the leaf `@liteship/error` + this package's own
 *      {@link CHECK_REGISTRY}), so it works on every surface: the CLI, and MCP.
 *
 *  (b) EXPORTED SYMBOL — otherwise, if the injected {@link CommandContext.resolveApiSymbol}
 *      capability (the CLI-side api-index) resolves the arg to an owning
 *      package + source file, project that resolution + its one-paragraph TSDoc
 *      summary. The capability is CLI-injected; over MCP it is absent and a symbol
 *      lookup degrades to an `unresolved` result rather than a throw.
 *
 * Neither arm imports the gauntlet gate objects (that would pull the `node:fs`
 * runner into this package's browser-safe main barrel): the emitting-gate identity
 * is DERIVED from the code (a gauntlet code's gate id is its first two
 * `/`-segments; a sub-code appends a third), and the negative-control pointer is
 * read from the {@link CHECK_REGISTRY} entry that proves that gate.
 *
 * @module
 */

import { explainDiagnostic, type DiagnosticArea } from '@liteship/error';
import { type CapsuleCommandResult, type CommandJsonSchema, schema } from '@liteship/core';
import { defineCommand, failed, ok, type ApiSymbolResolution } from '../registry.js';
import { CHECK_REGISTRY } from '../checks/registry.js';
import type { CheckDefinition } from '../checks/definition.js';

/** The gauntlet gate source tree — a check whose `negativeControl` points here proves that gate. */
const GATE_SOURCE_PREFIX = 'packages/gauntlet/src/gates/';

/**
 * The emitter that produces a diagnostic code, plus its negative-control pointer.
 * A flat, nullable shape (not a discriminated union) so it validates cleanly
 * against the structural {@link ExplainPayloadSchema}:
 * - `kind: 'gate'`  — a gauntlet gate ruleId; `id` is the derived gate id, and when
 *   a blocking check proves that gate its `negativeControl` + `provenByCheck` are set.
 * - `kind: 'check'` — a P11 `check/<slug>`; `id`/`owner`/`command`/`authority`/
 *   `negativeControl` come from the {@link CheckDefinition}.
 * - `kind: 'core-runtime'` — a runtime diagnostic emitted by its owning package's
 *   `Diagnostics`; there is no gate/check emitter, so the pointers are null.
 */
export interface ExplainEmitter {
  readonly kind: 'gate' | 'check' | 'core-runtime';
  /** The emitting gate id / check id, or null for a core-runtime diagnostic. */
  readonly id: string | null;
  /** The red-fixture / negative-control file that proves the emitter can fail, or null. */
  readonly negativeControl: string | null;
  /** The check id whose negative control proves this gauntlet gate, or null. */
  readonly provenByCheck: string | null;
  /** The check's owner (where the assertion lives), or null. */
  readonly owner: string | null;
  /** The check's root-script command line, or null. */
  readonly command: string | null;
  /** The check's authority over the verdict (`blocking` / `advisory`), or null. */
  readonly authority: string | null;
}

/** The resolved meaning of a diagnostic code — the `DiagnosticEntry` fields plus its {@link ExplainEmitter}. */
export interface ExplainDiagnostic {
  readonly code: string;
  readonly area: DiagnosticArea;
  readonly title: string;
  readonly explanation: string;
  readonly remediation: string;
  readonly emitter: ExplainEmitter;
}

/** The resolved owner of an exported symbol — a mirror of {@link ApiSymbolResolution}. */
export type ExplainSymbol = ApiSymbolResolution;

/**
 * The descriptor `outputSchema` for the explain command — hand-written JSON-Schema
 * in the structural subset (nullable objects via `type: ['object','null']`).
 * {@link ExplainPayload} is its plain-TS mirror.
 */
export const ExplainPayloadSchema = {
  type: 'object',
  properties: {
    query: { type: 'string' },
    kind: { enum: ['diagnostic', 'symbol', 'unresolved'] },
    diagnostic: {
      type: ['object', 'null'],
      properties: {
        code: { type: 'string' },
        area: { type: 'string' },
        title: { type: 'string' },
        explanation: { type: 'string' },
        remediation: { type: 'string' },
        emitter: {
          type: 'object',
          properties: {
            kind: { enum: ['gate', 'check', 'core-runtime'] },
            id: { type: ['string', 'null'] },
            negativeControl: { type: ['string', 'null'] },
            provenByCheck: { type: ['string', 'null'] },
            owner: { type: ['string', 'null'] },
            command: { type: ['string', 'null'] },
            authority: { type: ['string', 'null'] },
          },
          required: ['kind', 'id', 'negativeControl', 'provenByCheck', 'owner', 'command', 'authority'],
        },
      },
      required: ['code', 'area', 'title', 'explanation', 'remediation', 'emitter'],
    },
    symbol: {
      type: ['object', 'null'],
      properties: {
        symbol: { type: 'string' },
        package: { type: 'string' },
        subpath: { type: 'string' },
        file: { type: 'string' },
        kind: { type: 'string' },
        summary: { type: 'string' },
        packageDescription: { type: 'string' },
      },
      required: ['symbol', 'package', 'subpath', 'file', 'kind', 'summary', 'packageDescription'],
    },
  },
  required: ['query', 'kind', 'diagnostic', 'symbol'],
} as const satisfies CommandJsonSchema;

/** Structured payload returned by the explain command. */
export type ExplainPayload = {
  readonly query: string;
  readonly kind: 'diagnostic' | 'symbol' | 'unresolved';
  readonly diagnostic: ExplainDiagnostic | null;
  readonly symbol: ExplainSymbol | null;
};

/**
 * Derive the emitting GATE id from a gauntlet diagnostic code: the gate id is the
 * first two `/`-segments (`gauntlet/no-bare-throw`); a sub-code appends a third
 * (`gauntlet/traceability/untraced` → gate `gauntlet/traceability`).
 */
function gateIdOf(code: string): string {
  const parts = code.split('/');
  return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : code;
}

/** The check (if any) whose negative control is the source file of the given gauntlet gate. */
function checkProvingGate(gateId: string): CheckDefinition | undefined {
  const slug = gateId.split('/')[1];
  if (slug === undefined || slug === '') return undefined;
  const source = `${GATE_SOURCE_PREFIX}${slug}.ts`;
  return CHECK_REGISTRY.find((definition) => definition.negativeControl === source);
}

/** Build the {@link ExplainEmitter} for a code, keyed by its {@link DiagnosticArea}. */
function buildEmitter(code: string, area: DiagnosticArea): ExplainEmitter {
  if (area === 'check') {
    const definition = CHECK_REGISTRY.find((entry) => entry.id === code);
    return {
      kind: 'check',
      id: definition?.id ?? code,
      negativeControl: definition?.negativeControl ?? null,
      provenByCheck: null,
      owner: definition?.owner ?? null,
      command: definition?.command ?? null,
      authority: definition?.authority ?? null,
    };
  }
  if (area === 'gauntlet') {
    const gateId = gateIdOf(code);
    const proving = checkProvingGate(gateId);
    return {
      kind: 'gate',
      id: gateId,
      negativeControl: proving?.negativeControl ?? null,
      provenByCheck: proving?.id ?? null,
      owner: null,
      command: null,
      authority: null,
    };
  }
  // core / schema / compiler / astro / cli / migrate — a runtime `Diagnostics` code
  // emitted by its owning package; there is no gate/check emitter to point at.
  return {
    kind: 'core-runtime',
    id: null,
    negativeControl: null,
    provenByCheck: null,
    owner: null,
    command: null,
    authority: null,
  };
}

/** Resolve one diagnostic code into its explained payload arm (DATA-ONLY; works on every surface). */
function explainDiagnosticPayload(code: string): ExplainDiagnostic | null {
  const entry = explainDiagnostic(code);
  if (entry === undefined) return null;
  return {
    code,
    area: entry.area,
    title: entry.title,
    explanation: entry.explanation,
    remediation: entry.remediation,
    emitter: buildEmitter(code, entry.area),
  };
}

/** The explain command: descriptor + handler returning a structured result. */
export const explainCommand = defineCommand({
  descriptor: {
    name: 'explain',
    summary:
      'Explain a diagnostic code (its meaning + emitter + negative control) or an exported symbol (its owner + TSDoc).',
    inputSchema: {
      type: 'object',
      required: ['query'],
      properties: { query: { type: 'string' } },
    } as const satisfies CommandJsonSchema,
    outputSchema: ExplainPayloadSchema,
    annotations: { readOnly: true, mcpExposed: true, group: 'setup' },
  },
  argsSchema: schema.struct({ query: schema.string }),
  handler: async (invocation, context): Promise<CapsuleCommandResult<ExplainPayload>> => {
    const { query } = invocation.args;

    // (a) DIAGNOSTIC CODE — data-only, resolvable on every surface.
    const diagnostic = explainDiagnosticPayload(query);
    if (diagnostic !== null) {
      return ok('explain', { query, kind: 'diagnostic', diagnostic, symbol: null });
    }

    // (b) EXPORTED SYMBOL — CLI-injected capability; absent over MCP → unresolved.
    const symbol = context.resolveApiSymbol?.(query) ?? null;
    if (symbol !== null) {
      return ok('explain', { query, kind: 'symbol', diagnostic: null, symbol });
    }

    return failed('explain', { query, kind: 'unresolved', diagnostic: null, symbol: null }, 1);
  },
});
