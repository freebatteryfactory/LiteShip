/**
 * MCP resource projection (CUT D3) — `liteship://` resources are PROJECTIONS of
 * existing sources of truth, never a hand-maintained parallel surface:
 *
 *   - `liteship://registry/commands` ← `COMMAND_CATALOG` (the full 19-descriptor
 *     superset of `tools/list`: includes CLI-owned commands + executionKind +
 *     annotations + group);
 *   - `liteship://server/info`       ← `serverInfo()` + the shared `PROTOCOL_VERSION`
 *     + `SERVER_CAPABILITIES` (same source `initialize` advertises — no drift);
 *   - `liteship://glossary`          ← `GLOSSARY_ENTRIES` index (the public ontology);
 *   - `liteship://glossary/<term>`   ← one `GLOSSARY_ENTRIES` entry, listed as a
 *     CONCRETE resource per term (so `resources/templates/list` stays unimplemented).
 *
 * All resources HERE are `application/json` non-widget data resources. The set is
 * static and small → a single `resources/list` page (no cursor machinery). The
 * `ui://` MCP Apps UI resources are a SEPARATE projection class and live in
 * `ui-resources.ts` (CUT D4) — `liteship://` = JSON data, `ui://` = UI.
 *
 * @module
 */
import { COMMAND_CATALOG, GLOSSARY_ENTRIES } from '@czap/command';
import { serverInfo } from './server-info.js';
import { PROTOCOL_VERSION, SERVER_CAPABILITIES } from './capabilities.js';
import { ResourceNotFoundError } from './errors.js';

/** Product-owned resource URI scheme (no maintainer identity). */
const SCHEME = 'liteship://';

/** An MCP resource descriptor as emitted by `resources/list`. */
export interface McpResource {
  readonly uri: string;
  readonly name: string;
  readonly description: string;
  readonly mimeType: string;
}

/** The `resources/read` result envelope. */
export interface McpResourceContents {
  readonly contents: ReadonlyArray<{ readonly uri: string; readonly mimeType: string; readonly text: string }>;
}

interface ResourceEntry {
  readonly resource: McpResource;
  /** Lazy projection of the backing source of truth into the resource body (pretty JSON). */
  readonly read: () => string;
}

const JSON_MIME = 'application/json';

function json(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

/** `liteship://glossary/<term>` — the term is percent-encoded so special chars (`@czap/*`) stay URI-safe + unique. */
function glossaryTermUri(term: string): string {
  return `${SCHEME}glossary/${encodeURIComponent(term)}`;
}

/** Glossary entries sorted by term for a deterministic, stable listing/index. */
const SORTED_GLOSSARY = [...GLOSSARY_ENTRIES].sort((a, b) => a.term.localeCompare(b.term));

/**
 * The resource registry, in stable listing order: registry/commands, server/info,
 * glossary index, then the glossary terms (term-sorted). Computed once.
 */
const REGISTRY: readonly ResourceEntry[] = [
  {
    resource: {
      uri: `${SCHEME}registry/commands`,
      name: 'registry/commands',
      description: 'The full LiteShip command catalog (superset of tools/list): every descriptor with executionKind, annotations, and schemas.',
      mimeType: JSON_MIME,
    },
    read: () => json(COMMAND_CATALOG),
  },
  {
    resource: {
      uri: `${SCHEME}server/info`,
      name: 'server/info',
      description: 'LiteShip MCP server identity: name, version, protocol revision, and declared capabilities.',
      mimeType: JSON_MIME,
    },
    read: () => json({ ...serverInfo(), protocolVersion: PROTOCOL_VERSION, capabilities: SERVER_CAPABILITIES }),
  },
  {
    resource: {
      uri: `${SCHEME}glossary`,
      name: 'glossary',
      description: 'Index of the LiteShip/CZAP public ontology — every term and its resource URI.',
      mimeType: JSON_MIME,
    },
    read: () => json({ terms: SORTED_GLOSSARY.map((e) => ({ term: e.term, uri: glossaryTermUri(e.term) })) }),
  },
  ...SORTED_GLOSSARY.map((entry) => ({
    resource: {
      uri: glossaryTermUri(entry.term),
      name: `glossary/${entry.term}`,
      description: `Ontology entry for "${entry.term}" (${entry.category}).`,
      mimeType: JSON_MIME,
    },
    read: () => json(entry),
  })),
];

const BY_URI = new Map(REGISTRY.map((entry) => [entry.resource.uri, entry]));

/** Project the resource registry into the `resources/list` descriptor set (stable order). */
export function listResources(): readonly McpResource[] {
  return REGISTRY.map((entry) => entry.resource);
}

/** Read one resource by exact URI. Throws {@link ResourceNotFoundError} (→ -32002) for an unknown URI. */
export function readResource(uri: string): McpResourceContents {
  const entry = BY_URI.get(uri);
  if (!entry) throw new ResourceNotFoundError(uri);
  return { contents: [{ uri, mimeType: entry.resource.mimeType, text: entry.read() }] };
}
