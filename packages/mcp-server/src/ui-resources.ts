/**
 * MCP Apps UI resource registry (CUT D4) — LiteShip adopts the MCP Apps extension
 * (`io.modelcontextprotocol/ui`, stable 2026-01-26) on top of MCP core 2025-11-25.
 *
 * These are STANDALONE STATIC UI resources: the visible (`text/html;profile=mcp-app`)
 * twins of D3's discoverable (`application/json`) resources, projecting the SAME
 * fixed backing data. D4 links NO tool to a UI template — a static tool template
 * could only render a shell until D5 adds the `ui/notifications/tool-result` bridge,
 * which would imply an interactivity that does not exist yet.
 *
 * `_meta.ui.csp` (CSP) lives HERE on the resource, never on tool metadata. Self-
 * contained widgets declare a default-deny CSP (no external domains).
 *
 * @module
 */
import { COMMAND_CATALOG, GLOSSARY_ENTRIES } from '@liteship/command';
import { DEMO_COMPONENT_CATALOG } from '@liteship/genui';
import { NotFoundError } from '@liteship/error';
import { renderCommandCatalog, renderComponentCatalog, renderGlossary } from './ui-render.js';

/** The MCP Apps UI content type (exact literal per SEP-1865 2026-01-26). */
const UI_MIME = 'text/html;profile=mcp-app' as const;

/** Content-Security-Policy for a UI resource (SEP-1865 `_meta.ui.csp`; camelCase domain allowlists). */
export interface McpUiResourceCsp {
  readonly connectDomains: readonly string[];
  readonly resourceDomains: readonly string[];
  readonly frameDomains: readonly string[];
  readonly baseUriDomains: readonly string[];
}

/** MCP Apps UI permissions (SEP-1865). Default-deny when empty. */
export type McpUiPermissions = readonly (
  'camera' | 'microphone' | 'geolocation' | 'clipboard-read' | 'clipboard-write'
)[];

/** MCP Apps resource metadata — CSP/permissions ride here on the RESOURCE, never on a tool. */
export interface McpUiResourceMeta {
  readonly ui: {
    readonly csp: McpUiResourceCsp;
    readonly permissions?: McpUiPermissions;
    readonly domain?: string;
    readonly prefersBorder?: boolean;
  };
}

/** An MCP Apps UI resource descriptor as emitted by `resources/list`. */
export interface McpUiResource {
  readonly uri: string;
  readonly name: string;
  readonly description: string;
  readonly mimeType: typeof UI_MIME;
  readonly _meta: McpUiResourceMeta;
}

/** The `resources/read` envelope for a UI resource (carries CSP meta alongside the markup). */
export interface McpUiResourceContents {
  readonly contents: ReadonlyArray<{
    readonly uri: string;
    readonly mimeType: string;
    readonly text: string;
    readonly _meta: McpUiResourceMeta;
  }>;
}

/** Self-contained static widget: default-deny CSP + permissions; sandbox hints for hosts. */
const SELF_CONTAINED_META: McpUiResourceMeta = {
  ui: {
    csp: { connectDomains: [], resourceDomains: [], frameDomains: [], baseUriDomains: [] },
    permissions: [],
    prefersBorder: true,
  },
};

interface UiEntry {
  readonly resource: McpUiResource;
  readonly render: () => string;
}

/** The two static UI resources, in stable order. Computed once. */
const REGISTRY: readonly UiEntry[] = [
  {
    resource: {
      uri: 'ui://liteship/registry/commands',
      name: 'registry/commands (UI)',
      description: 'Static MCP Apps view of the LiteShip command catalog (HTML twin of liteship://registry/commands).',
      mimeType: UI_MIME,
      _meta: SELF_CONTAINED_META,
    },
    render: () => renderCommandCatalog(COMMAND_CATALOG),
  },
  {
    resource: {
      uri: 'ui://liteship/registry/components',
      name: 'registry/components (UI)',
      description:
        'Static MCP Apps view of the LiteShip demo generated-UI catalog (HTML twin of liteship://registry/components).',
      mimeType: UI_MIME,
      _meta: SELF_CONTAINED_META,
    },
    render: () => renderComponentCatalog(DEMO_COMPONENT_CATALOG),
  },
  {
    resource: {
      uri: 'ui://liteship/glossary',
      name: 'glossary (UI)',
      description: 'Static MCP Apps view of the LiteShip ontology (HTML twin of liteship://glossary).',
      mimeType: UI_MIME,
      _meta: SELF_CONTAINED_META,
    },
    render: () => renderGlossary(GLOSSARY_ENTRIES),
  },
];

const BY_URI = new Map(REGISTRY.map((entry) => [entry.resource.uri, entry]));

/** Project the UI registry into `resources/list` descriptors (stable order). */
export function listUiResources(): readonly McpUiResource[] {
  return REGISTRY.map((entry) => entry.resource);
}

/** Read one UI resource by exact `ui://` URI. Unknown URI → `NotFoundError` (→ -32002), as for D3. */
export function readUiResource(uri: string): McpUiResourceContents {
  const entry = BY_URI.get(uri);
  if (!entry) throw NotFoundError('resource', uri);
  return { contents: [{ uri, mimeType: entry.resource.mimeType, text: entry.render(), _meta: entry.resource._meta }] };
}
