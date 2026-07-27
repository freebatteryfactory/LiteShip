/**
 * Live MCP Apps app-resource registry (CUT D5) — a SEPARATE class from the D4
 * static UI resources, so D4's `listUiResources()` and its pin stay frozen and
 * its static-only guard keeps full teeth. App resources (`ui://liteship/app/…`)
 * embed a view-side bridge script and expect host tool-result injection.
 *
 * Reuses the MCP Apps resource types from `ui-resources.ts` (same wire shape;
 * only the URI class + interactive body differ).
 *
 * @module
 */
import { NotFoundError } from '@liteship/error';
import { renderCapsuleInspectWidget } from './app-render.js';
import type { McpUiResource, McpUiResourceContents, McpUiResourceMeta } from './ui-resources.js';

const UI_MIME = 'text/html;profile=mcp-app' as const;

/** Self-contained: default-deny CSP — the widget needs only postMessage-to-parent + same-origin DOM. */
const SELF_CONTAINED_META: McpUiResourceMeta = {
  ui: { csp: { connectDomains: [], resourceDomains: [], frameDomains: [], baseUriDomains: [] } },
};

interface AppEntry {
  readonly resource: McpUiResource;
  readonly render: () => string;
}

/** The D5 app resources, in stable order. Computed once. */
const REGISTRY: readonly AppEntry[] = [
  {
    resource: {
      uri: 'ui://liteship/app/capsule-inspect',
      name: 'app/capsule-inspect',
      description:
        'Live MCP Apps view that renders a capsule.inspect result (host-injected via ui/notifications/tool-result).',
      mimeType: UI_MIME,
      _meta: SELF_CONTAINED_META,
    },
    render: renderCapsuleInspectWidget,
  },
];

const BY_URI = new Map(REGISTRY.map((entry) => [entry.resource.uri, entry]));

/** Project the app registry into `resources/list` descriptors (stable order). */
export function listAppResources(): readonly McpUiResource[] {
  return REGISTRY.map((entry) => entry.resource);
}

/** Read one app resource by exact `ui://liteship/app/…` URI. Unknown → `NotFoundError` (→ -32002). */
export function readAppResource(uri: string): McpUiResourceContents {
  const entry = BY_URI.get(uri);
  if (!entry) throw NotFoundError('resource', uri);
  return { contents: [{ uri, mimeType: entry.resource.mimeType, text: entry.render(), _meta: entry.resource._meta }] };
}
