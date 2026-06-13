/**
 * Trusted catalog renderer — no model HTML, allowlisted attributes only.
 *
 * Interaction props (`onClick`, …) carry opaque action-id strings; the host
 * interprets them via `genui:interaction` CustomEvents.
 *
 * @module
 */

import type { ComponentCatalog, GeneratedUINode } from './types.js';
import { validateGeneratedUITree } from './validate.js';

/** Options for {@link renderFromCatalog}. */
export interface RenderFromCatalogOptions {
  readonly catalog: ComponentCatalog;
  readonly target: HTMLElement;
  /** Root element that receives `genui:interaction` events. Defaults to `target`. */
  readonly eventRoot?: HTMLElement;
  readonly clear?: boolean;
}

const ALLOWED_ATTRS = new Set([
  'class',
  'id',
  'title',
  'lang',
  'dir',
  'role',
  'href',
  'type',
  'value',
  'disabled',
  'aria-label',
  'aria-labelledby',
  'aria-describedby',
  'aria-hidden',
  'aria-expanded',
  'aria-pressed',
  'aria-current',
]);

const isAllowedAttr = (name: string): boolean =>
  ALLOWED_ATTRS.has(name) || name.startsWith('data-') || name.startsWith('aria-');

const isInteractionProp = (key: string): boolean => key === 'onClick' || key.startsWith('on');

/** Prior render interaction listeners keyed by mount target — aborted on re-render. */
const renderInteractionScopes = new WeakMap<HTMLElement, AbortController>();

const applyProps = (
  element: HTMLElement,
  node: GeneratedUINode,
  catalog: ComponentCatalog,
  eventRoot: HTMLElement,
  signal: AbortSignal,
): void => {
  for (const [key, value] of Object.entries(node.props)) {
    const def = catalog.components[node.name];
    const propDef = def?.props[key];
    if (!propDef) {
      continue;
    }

    if (isInteractionProp(key)) {
      if (typeof value !== 'string' || key !== 'onClick') {
        continue;
      }
      element.addEventListener(
        'click',
        () => {
          eventRoot.dispatchEvent(
            new CustomEvent('genui:interaction', {
              detail: { componentName: node.name, propKey: key, actionId: value, value },
              bubbles: true,
            }),
          );
        },
        { signal },
      );
      continue;
    }

    if (propDef.type === 'string' && (key === 'text' || key === 'label')) {
      element.textContent = value as string;
      continue;
    }

    if (propDef.type === 'string' && isAllowedAttr(key)) {
      element.setAttribute(key, value as string);
    }
  }
};

const renderNode = (
  node: GeneratedUINode,
  catalog: ComponentCatalog,
  eventRoot: HTMLElement,
  signal: AbortSignal,
): HTMLElement => {
  const def = catalog.components[node.name]!;
  const tag = def.tag ?? 'div';
  const element = document.createElement(tag);
  applyProps(element, node, catalog, eventRoot, signal);

  if (node.children) {
    for (const child of node.children) {
      element.appendChild(renderNode(child, catalog, eventRoot, signal));
    }
  }

  if (node.slots) {
    for (const [slotName, slotValue] of Object.entries(node.slots)) {
      const slotHost = document.createElement('div');
      slotHost.setAttribute('data-czap-genui-slot', slotName);
      const slotNodes = Array.isArray(slotValue) ? slotValue : [slotValue];
      for (const slotNode of slotNodes) {
        slotHost.appendChild(renderNode(slotNode, catalog, eventRoot, signal));
      }
      element.appendChild(slotHost);
    }
  }

  return element;
};

/**
 * Validate and render a generated UI tree into `target`.
 * Returns `false` when validation fails (target left unchanged unless `clear` already ran).
 */
export function renderFromCatalog(node: GeneratedUINode, options: RenderFromCatalogOptions): boolean {
  const result = validateGeneratedUITree(node, options.catalog);
  if (!result.ok) {
    return false;
  }

  const eventRoot = options.eventRoot ?? options.target;
  renderInteractionScopes.get(options.target)?.abort();
  const interactionScope = new AbortController();
  renderInteractionScopes.set(options.target, interactionScope);
  if (options.clear !== false) {
    options.target.replaceChildren();
  }

  options.target.appendChild(renderNode(node, options.catalog, eventRoot, interactionScope.signal));
  return true;
}
