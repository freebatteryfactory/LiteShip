/**
 * glossary command (CUT A1) — terminal access to the LiteShip prose register,
 * mirroring GLOSSARY.md. Pure data + lookup returning a structured result;
 * the CLI adapter owns pretty rendering and stdout emission.
 *
 * @module
 */
import { type CapsuleCommandResult, type CommandJsonSchema, schema } from '@liteship/core';
import { defineCommand, failed, ok } from '../registry.js';

/** One ontology term. Mirrors a row in GLOSSARY.md. */
export type GlossaryEntry = {
  readonly term: string;
  readonly category: 'naming' | 'primitive' | 'translator-note';
  readonly definition: string;
  readonly seeAlso?: readonly string[];
};

/**
 * The descriptor `outputSchema` for the glossary command — hand-written
 * JSON-Schema, byte-parity-pinned against the parity fixture. {@link GlossaryPayload}
 * is its plain-TS mirror (the `entries` element mirrors {@link GlossaryEntry}).
 */
export const GlossaryPayloadSchema = {
  type: 'object',
  properties: {
    term: { type: ['string', 'null'] },
    entries: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          term: { type: 'string' },
          category: { enum: ['naming', 'primitive', 'translator-note'] },
          definition: { type: 'string' },
          seeAlso: { type: 'array', items: { type: 'string' } },
        },
        required: ['term', 'category', 'definition'],
      },
    },
  },
  required: ['term', 'entries'],
} as const satisfies CommandJsonSchema;

/** Structured payload returned by the glossary command. */
export type GlossaryPayload = {
  readonly term: string | null;
  readonly entries: readonly GlossaryEntry[];
};

/** The canonical ontology catalog (single source; the CLI re-exports it). */
export const GLOSSARY_ENTRIES: readonly GlossaryEntry[] = [
  {
    term: 'LiteShip',
    category: 'naming',
    definition:
      'The one brand: product, distribution, engine, and architecture. Use this name in READMEs, social posts, ADRs, and anywhere a reader adopts the framework.',
    seeAlso: ['@liteship/*'],
  },
  {
    term: '@liteship/*',
    category: 'naming',
    definition: 'npm namespace. Used in install lines, imports, and package lists. Never renamed in prose.',
    seeAlso: ['LiteShip'],
  },
  {
    term: 'boundary',
    category: 'primitive',
    definition: 'A definition that partitions one continuous input into a small set of named states.',
    seeAlso: ['state', 'signal'],
  },
  {
    term: 'state',
    category: 'primitive',
    definition: 'A named discrete result selected by evaluating a boundary at one input value.',
    seeAlso: ['boundary', 'style'],
  },
  {
    term: 'token',
    category: 'primitive',
    definition: 'A material of the design language: axes, fallbacks, craft vocabulary.',
    seeAlso: ['theme', 'style'],
  },
  {
    term: 'style',
    category: 'primitive',
    definition: 'Base and named-state properties owned by one boundary.',
    seeAlso: ['boundary', 'cast', 'theme'],
  },
  {
    term: 'theme',
    category: 'primitive',
    definition: 'Coordinated token-space variants for one presentation mode.',
    seeAlso: ['token', 'style'],
  },
  {
    term: 'cast',
    category: 'translator-note',
    definition:
      'Verb only — project a definition into a target output surface (CSS, GLSL, ARIA, etc.). Always carries a target. Not theatrical-cast, not type-coercion.',
    seeAlso: ['surface', 'compile path'],
  },
  {
    term: 'surface',
    category: 'translator-note',
    definition: 'Noun — a runtime target the compiler emits to (CSS surface, ARIA surface). Not the verb sense.',
    seeAlso: ['cast', 'compile path'],
  },
  {
    term: 'hot path',
    category: 'primitive',
    definition:
      'Per-tick runtime code whose steady state avoids allocation. See ADR-0002 for the pool, dirty-flag, and dense-ECS discipline.',
  },
  {
    term: 'compile path',
    category: 'primitive',
    definition: 'Projection of authored intent to CSS, GLSL, WGSL, ARIA, AI, or another target artifact.',
    seeAlso: ['cast', 'surface'],
  },
  {
    term: 'capsule',
    category: 'primitive',
    definition:
      'Content-addressed unit of dispatch (ADR-0008). Seven assembly kinds: pureTransform, receiptedMutation, stateMachine, siteAdapter, policyGate, cachedProjection, sceneComposition.',
    seeAlso: ['receipt'],
  },
  {
    term: 'receipt',
    category: 'primitive',
    definition:
      'JSON record emitted by a CLI command or capsule run. Status, command, timestamp, plus command-specific fields.',
    seeAlso: ['capsule'],
  },
  {
    term: 'gauntlet',
    category: 'primitive',
    definition:
      'The full release-grade test gate (`pnpm run gauntlet:full`). Runs the ordered phase sequence from the initial environment check through to `flex:verify PASSED — project is 10/10`.',
  },
] as const;

/** Match entries: exact term wins, else substring over term + definition. */
export function matchGlossaryEntries(query: string | null): readonly GlossaryEntry[] {
  if (!query) return GLOSSARY_ENTRIES;
  const q = query.toLowerCase();
  const exact = GLOSSARY_ENTRIES.filter((entry) => entry.term.toLowerCase() === q);
  if (exact.length > 0) return exact;
  return GLOSSARY_ENTRIES.filter(
    (entry) => entry.term.toLowerCase().includes(q) || entry.definition.toLowerCase().includes(q),
  );
}

/** The glossary command: descriptor + handler returning a structured result. */
export const glossaryCommand = defineCommand({
  descriptor: {
    name: 'glossary',
    summary: 'Look up a term in the LiteShip technical and product vocabulary.',
    inputSchema: {
      type: 'object',
      properties: { term: { type: 'string' } },
    } as const satisfies CommandJsonSchema,
    outputSchema: GlossaryPayloadSchema,
    annotations: { readOnly: true, group: 'setup' },
  },
  argsSchema: schema.struct({ term: schema.optional(schema.string) }),
  handler: async (invocation): Promise<CapsuleCommandResult<GlossaryPayload>> => {
    // `term` arrives already decoded (string | undefined) from the argsSchema.
    const raw = invocation.args.term;
    const term = raw && raw.length > 0 ? raw : null;
    const entries = matchGlossaryEntries(term);
    if (entries.length === 0) return failed('glossary', { term, entries: [] }, 1);
    return ok('glossary', { term, entries });
  },
});
