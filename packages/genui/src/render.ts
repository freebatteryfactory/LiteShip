/**
 * Trusted catalog renderer — no model HTML, allowlisted attributes only.
 *
 * Interactions emit `genui:interaction` CustomEvents; the host decides what they mean.
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

const applyProps = (element: HTMLElement, node: GeneratedUINode, catalog: ComponentCatalog, eventRoot: HTMLElement): void => {
  for (const [key, value] of Object.entries(node.props)) {
    const def = catalog.components[node.name];
    const propDef = def?.props[key];
    if (!propDef) {
      continue;
    }

    if (key === 'onClick' || key.startsWith('on')) {
      element.addEventListener('click', () => {
        eventRoot.dispatchEvent(
          new CustomEvent('genui:interaction', {
            detail: { componentName: node.name, propKey: key, value },
            bubbles: true,
          }),
        );
      });
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
): HTMLElement => {
  const def = catalog.components[node.name]!;
  const tag = def.tag ?? 'div';
  const element = document.createElement(tag);
  applyProps(element, node, catalog, eventRoot);

  if (node.children) {
    for (const child of node.children) {
      element.appendChild(renderNode(child, catalog, eventRoot));
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
  if (options.clear !== false) {
    options.target.replaceChildren();
  }

  options.target.appendChild(renderNode(node, options.catalog, eventRoot));
  return true;
}
