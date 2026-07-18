/**
 * Static MCP Apps UI renderers (CUT D4) — tiny, deterministic HTML emitters that
 * project FIXED LiteShip catalog/glossary data into self-contained markup for an
 * MCP Apps UI resource (`text/html;profile=mcp-app`).
 *
 * Hard rules (the static/D4 line — interactivity is D5):
 *   - deterministic: pure function of the input data, no clock/random/env;
 *   - NO `<script>`, NO inline event handlers (`on*=`), NO external network
 *     (`<link>`/`<img>`/remote `src`/`href`), NO bridge hooks (postMessage, etc.);
 *   - NO arbitrary/user HTML — every interpolated value is escaped;
 *   - structural HTML only (no `<style>`/inline `style=`): the host's CSP/style
 *     policy for `text/html;profile=mcp-app` is not yet confirmed, so we ship
 *     semantic markup that renders readably without a style mechanism. A safe
 *     style channel can be added in a later cut once proven against the spec;
 *   - never routed through `@czap/web`'s `sanitizeHTML` (that is an ingest
 *     sanitizer for live DOM, not this emitter).
 *
 * @module
 */
import type { CapsuleCommandDescriptor } from '@czap/core';
import type { GlossaryEntry } from '@czap/command';
import type { ComponentCatalog } from '@czap/genui';
import { escapeHtml } from '@czap/web';

/** Wrap body markup in a minimal self-contained HTML document (no external head resources). */
function htmlDocument(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body>
${body}
</body>
</html>
`;
}

/** Static HTML view of the command catalog — the visible twin of `liteship://registry/commands`. */
export function renderCommandCatalog(descriptors: readonly CapsuleCommandDescriptor[]): string {
  const rows = descriptors
    .map((d) => {
      const exec = d.executionKind === 'handler' ? 'handler' : 'cli-orchestration';
      const exposed = d.annotations?.mcpExposed === true ? 'yes' : 'no';
      return `<tr><td><code>${escapeHtml(d.name)}</code></td><td>${escapeHtml(exec)}</td><td>${exposed}</td><td>${escapeHtml(d.summary)}</td></tr>`;
    })
    .join('\n');
  const body = `<h1>LiteShip Command Catalog</h1>
<p>${descriptors.length} commands &mdash; a static MCP Apps view of <code>liteship://registry/commands</code>.</p>
<table>
<thead><tr><th>Command</th><th>Execution</th><th>MCP-exposed</th><th>Summary</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>`;
  return htmlDocument('LiteShip — Command Catalog', body);
}

/** Static HTML view of the ontology — the visible twin of `liteship://glossary`. Terms sorted for determinism. */
export function renderGlossary(entries: readonly GlossaryEntry[]): string {
  const sorted = [...entries].sort((a, b) => a.term.localeCompare(b.term));
  const items = sorted
    .map(
      (e) =>
        `<dt><strong>${escapeHtml(e.term)}</strong> <em>(${escapeHtml(e.category)})</em></dt>\n<dd>${escapeHtml(e.definition)}</dd>`,
    )
    .join('\n');
  const body = `<h1>LiteShip Glossary</h1>
<p>${sorted.length} terms &mdash; a static MCP Apps view of <code>liteship://glossary</code>.</p>
<dl>
${items}
</dl>`;
  return htmlDocument('LiteShip — Glossary', body);
}

/** Static HTML view of the demo generated-UI catalog — twin of `liteship://registry/components`. */
export function renderComponentCatalog(catalog: ComponentCatalog): string {
  const rows = Object.entries(catalog.components)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, def]) => {
      const props = Object.keys(def.props).sort().join(', ') || '(none)';
      return `<tr><td><code>${escapeHtml(name)}</code></td><td>${escapeHtml(def.tag ?? 'div')}</td><td>${escapeHtml(props)}</td></tr>`;
    })
    .join('\n');
  const body = `<h1>LiteShip Generated UI Catalog</h1>
<p>Version <code>${escapeHtml(catalog.version)}</code>, hash <code>${escapeHtml(String(catalog.catalogHash))}</code> &mdash; static MCP Apps view of <code>liteship://registry/components</code>.</p>
<table>
<thead><tr><th>Component</th><th>Tag</th><th>Props</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>`;
  return htmlDocument('LiteShip — Generated UI Catalog', body);
}
