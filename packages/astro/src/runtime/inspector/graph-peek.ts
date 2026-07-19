/**
 * The read-only, content-addressed DocumentGraph peek section of the inspector.
 *
 * Prefers an injected authored graph (`window.__LITESHIP_INSPECTOR__`) when present;
 * otherwise builds the page-derived graph from the live boundaries using the real
 * `@liteship/core` node-addressing kernel.
 *
 * @module
 */

import type { SerializedBoundary } from '../boundary.js';
import {
  buildGraphPeek,
  deriveActiveTargets,
  readBoundaryPayload,
  readInjectedPayload,
  snapshotElementCasts,
  type CastTarget,
} from '../inspector-panels.js';

/** Render the read-only, content-addressed DocumentGraph peek for the page. */
export function renderGraphPeek(body: HTMLElement, elements: readonly HTMLElement[]): void {
  const section = document.createElement('details');
  section.className = 'section';
  const summary = document.createElement('summary');
  summary.textContent = 'DocumentGraph peek';
  section.appendChild(summary);

  // Prefer an injected authored graph if an integration provided one; else
  // build the page-derived graph from the live boundaries.
  const injected = readInjectedPayload();
  const peek =
    injected?.graph ??
    buildGraphPeek(
      elements
        .map((element) => {
          const payload = readBoundaryPayload(element.getAttribute('data-liteship-boundary'));
          if (!payload) return null;
          const snapshot = snapshotElementCasts(element, null);
          const targets: CastTarget[] = deriveActiveTargets(snapshot).map((a) => a.target);
          return { payload, targets };
        })
        .filter((entry): entry is { payload: Partial<SerializedBoundary>; targets: CastTarget[] } => entry !== null),
    );

  if (peek.nodes.length === 0) {
    const none = document.createElement('div');
    none.className = 'cast-none';
    none.textContent = 'No graph nodes (no boundaries with a parseable payload on this page).';
    section.appendChild(none);
    body.appendChild(section);
    return;
  }

  for (const node of peek.nodes) {
    const row = document.createElement('div');
    row.className = 'graph-node';
    row.title = node.id;
    const fam = document.createElement('span');
    fam.className = 'graph-fam';
    fam.textContent = node.family;
    const label = document.createElement('span');
    label.textContent = node.label;
    const id = document.createElement('span');
    id.className = 'graph-id';
    id.textContent = ` ${node.shortId}`;
    row.appendChild(fam);
    row.appendChild(label);
    row.appendChild(id);
    section.appendChild(row);
  }

  const edges = document.createElement('div');
  edges.className = 'graph-edges';
  edges.textContent =
    peek.edges.length > 0
      ? `${peek.edges.length} edge${peek.edges.length === 1 ? '' : 's'}: ` +
        peek.edges.map((e) => `${e.fromShort} →${e.type}→ ${e.toShort}`).join('  ·  ')
      : 'no edges';
  section.appendChild(edges);

  const disclaimer = document.createElement('div');
  disclaimer.className = 'panel-disclaimer';
  disclaimer.textContent = injected?.graph
    ? 'Injected authored graph (window.__LITESHIP_INSPECTOR__).'
    : 'Page-derived (real @liteship/core content addresses); the authored build-time graph is not serialized per page.';
  section.appendChild(disclaimer);

  body.appendChild(section);
}
