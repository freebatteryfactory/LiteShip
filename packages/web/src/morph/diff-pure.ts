/**
 * Pure DOM diff functions -- Effect-free morph primitives.
 *
 * Extracted from diff.ts for use by client directives that must
 * not ship the Effect runtime. These are the core synchronous
 * DOM manipulation functions with zero external dependencies
 * beyond the browser DOM API.
 *
 * @module
 */

import type { MorphConfig, MorphHints, MorphCallbacks } from '../types.js';
import { createHtmlFragment } from '../security/html-trust.js';
import * as SemanticIdModule from './semantic-id.js';
import { isOpaque, containsOpaque } from './opaque.js';

/**
 * Default morph configuration.
 */
export const defaultConfig: MorphConfig = {
  preserveFocus: true,
  preserveScroll: true,
  preserveSelection: true,
  morphStyle: 'innerHTML',
};

/**
 * Parse an HTML string into a DocumentFragment using a template element.
 */
export const parseHTML = (html: string): DocumentFragment => {
  return createHtmlFragment(html.trim(), { policy: 'sanitized-html' });
};

/**
 * Diff two nodes and determine if they should be considered "same".
 */
export const isSameNode = (oldNode: Element, newNode: Element, hints?: MorphHints): boolean => {
  if (SemanticIdModule.matches(oldNode, newNode)) {
    return true;
  }

  const oldId = SemanticIdModule.get(oldNode);
  const newId = SemanticIdModule.get(newNode);
  if (hints?.semanticIds && oldId && newId) {
    if (hints.semanticIds.includes(oldId) && hints.semanticIds.includes(newId)) {
      return true;
    }
  }

  if (oldNode.tagName === newNode.tagName) {
    const oldId = oldNode.getAttribute('id');
    const newId = newNode.getAttribute('id');
    if (oldId && oldId === newId) {
      return true;
    }
  }

  if (oldNode.tagName !== newNode.tagName) {
    return false;
  }

  if (oldNode instanceof HTMLInputElement && newNode instanceof HTMLInputElement) {
    return oldNode.type === newNode.type && oldNode.name === newNode.name;
  }

  return true;
};

/**
 * Synchronize attributes between nodes.
 */
export const syncAttributes = (oldNode: Element, newNode: Element, callbacks?: MorphCallbacks): void => {
  const oldAttrs = oldNode.attributes;
  for (let i = oldAttrs.length - 1; i >= 0; i--) {
    const attr = oldAttrs[i]!;
    if (!newNode.hasAttribute(attr.name)) {
      const shouldUpdate = callbacks?.beforeAttributeUpdate?.(oldNode, attr.name, null) ?? true;
      if (shouldUpdate) {
        oldNode.removeAttribute(attr.name);
      }
    }
  }

  const newAttrs = newNode.attributes;
  for (let i = 0; i < newAttrs.length; i++) {
    const attr = newAttrs[i]!;
    const oldValue = oldNode.getAttribute(attr.name);

    if (oldValue !== attr.value) {
      const shouldUpdate = callbacks?.beforeAttributeUpdate?.(oldNode, attr.name, attr.value) ?? true;
      if (shouldUpdate) {
        oldNode.setAttribute(attr.name, attr.value);
      }
    }
  }

  if (oldNode instanceof HTMLInputElement && newNode instanceof HTMLInputElement) {
    if (oldNode.value !== newNode.value) {
      oldNode.value = newNode.value;
    }
    if (oldNode.checked !== newNode.checked) {
      oldNode.checked = newNode.checked;
    }
  }

  if (oldNode instanceof HTMLTextAreaElement && newNode instanceof HTMLTextAreaElement) {
    if (oldNode.value !== newNode.value) {
      oldNode.value = newNode.value;
    }
  }

  if (oldNode instanceof HTMLSelectElement && newNode instanceof HTMLSelectElement) {
    if (oldNode.value !== newNode.value) {
      oldNode.value = newNode.value;
    }
  }
};

/**
 * Morph a single element (attributes + children).
 *
 * Morph-opaque laws:
 * L1 A matched old↔new pair where EITHER side is opaque keeps the old element verbatim.
 * L2 An unmatched old opaque element is never removed — nor is an unmatched ancestor
 *    whose subtree contains one (a cascade removal would destroy the island). The same
 *    rule guards the outerHTML root-replace path: a root containing an opaque island is
 *    kept, not replaced.
 * L3 A new opaque element with no old match inserts wholesale.
 * L4 An opaque morph root is a total no-op for every entry point.
 * L5 Non-opaque siblings/ancestors morph exactly as before.
 */
export function morphElement(
  oldElement: Element,
  newElement: Element,
  hints?: MorphHints,
  callbacks?: MorphCallbacks,
): void {
  if (isOpaque(oldElement as Node) || isOpaque(newElement as Node)) return;
  syncAttributes(oldElement, newElement, callbacks);
  syncChildren(oldElement, newElement, hints, callbacks);
}

function insertBeforeOrAppend(parent: Element, node: Node, referenceNode?: Node): void {
  if (referenceNode?.parentNode === parent) {
    parent.insertBefore(node, referenceNode);
    return;
  }

  parent.appendChild(node);
}

function moveChildIntoPosition(parent: Element, oldChildren: readonly ChildNode[], oldIdx: number, node: Node): void {
  if (oldIdx >= oldChildren.length || oldChildren[oldIdx] === node) {
    return;
  }

  insertBeforeOrAppend(parent, node, oldChildren[oldIdx]);
}

/**
 * Find the best matching node in a list.
 */
export const findBestMatch = (node: Element, candidates: Element[], hints?: MorphHints): Element | null => {
  if (candidates.length === 0) {
    return null;
  }

  const nodeSemanticId = SemanticIdModule.get(node);

  if (nodeSemanticId) {
    for (const candidate of candidates) {
      if (SemanticIdModule.get(candidate) === nodeSemanticId) {
        return candidate;
      }
    }
  }

  const nodeId = node.getAttribute('id');
  if (nodeId) {
    for (const candidate of candidates) {
      if (candidate.getAttribute('id') === nodeId) {
        return candidate;
      }
    }
  }

  for (const candidate of candidates) {
    if (isSameNode(node, candidate, hints)) {
      return candidate;
    }
  }

  return null;
};

/**
 * Synchronize children between nodes using diff algorithm.
 */
export const syncChildren = (
  oldParent: Element,
  newParent: Element,
  hints?: MorphHints,
  callbacks?: MorphCallbacks,
): void => {
  const oldChildren = Array.from(oldParent.childNodes);
  const newChildren = Array.from(newParent.childNodes);

  const oldElementChildren = oldChildren.filter((n): n is Element => n instanceof Element);
  const oldSemanticIndex = new Map<string, Element>();

  for (const child of oldElementChildren) {
    const semanticId = SemanticIdModule.get(child);
    if (semanticId) {
      oldSemanticIndex.set(semanticId, child);
    }
  }

  const matched = new Set<Node>();

  let oldIdx = 0;
  for (let i = 0; i < newChildren.length; i++) {
    const newChild = newChildren[i]!;

    if (newChild instanceof Text) {
      const newText = newChild.data;

      if (oldIdx < oldChildren.length) {
        const oldChild = oldChildren[oldIdx]!;

        if (oldChild.nodeType === Node.TEXT_NODE) {
          if (oldChild.textContent !== newText) {
            oldChild.textContent = newText;
          }
          matched.add(oldChild);
          oldIdx++;
          continue;
        }
      }

      const textNode = document.createTextNode(newText);
      insertBeforeOrAppend(oldParent, textNode, oldChildren[oldIdx]);
      callbacks?.afterAdd?.(textNode);
      continue;
    }

    if (newChild instanceof Element) {
      const newElement = newChild;
      const semanticId = SemanticIdModule.get(newElement);

      if (semanticId && oldSemanticIndex.has(semanticId)) {
        const oldElement = oldSemanticIndex.get(semanticId)!;

        morphElement(oldElement, newElement, hints, callbacks);
        matched.add(oldElement);

        moveChildIntoPosition(oldParent, oldChildren, oldIdx, oldElement);
        oldIdx++;
        continue;
      }

      const remainingOldChildren = oldElementChildren.filter((c) => !matched.has(c));
      const bestMatch = findBestMatch(newElement, remainingOldChildren, hints);

      if (bestMatch) {
        morphElement(bestMatch, newElement, hints, callbacks);
        matched.add(bestMatch);

        moveChildIntoPosition(oldParent, oldChildren, oldIdx, bestMatch);
        oldIdx++;
        continue;
      }

      const clonedElement = newElement.cloneNode(true);
      /* v8 ignore next — `newElement` is already an Element in this branch, and
         Element.cloneNode(true) always returns an Element of the same kind; the
         instanceof guard narrows the DOM `Node` return type for TypeScript. */
      if (clonedElement instanceof Element) {
        insertBeforeOrAppend(oldParent, clonedElement, oldChildren[oldIdx]);
        callbacks?.afterAdd?.(clonedElement);
      }
      continue;
    }

    oldIdx++;
  }

  for (const oldChild of oldChildren) {
    if (!matched.has(oldChild) && oldChild.parentNode === oldParent) {
      // L2, including ancestors: removing a container whose subtree holds an opaque island
      // would destroy the island via cascade — the container is preserved with it.
      if (oldChild instanceof Element && (isOpaque(oldChild) || containsOpaque(oldChild))) {
        continue;
      }
      if (oldChild instanceof Element && callbacks?.beforeRemove?.(oldChild) === false) {
        continue;
      }
      oldParent.removeChild(oldChild);
    }
  }
};

/**
 * Apply a morph: parse new HTML and sync into the target element.
 * This is the Effect-free equivalent of Morph.morph().
 */
export const morphPure = (
  oldNode: Element,
  newHTML: string,
  config?: Partial<MorphConfig>,
  hints?: MorphHints,
): void => {
  const finalConfig = { ...defaultConfig, ...config };
  if (isOpaque(oldNode as Node)) return;
  const fragment = parseHTML(newHTML);
  const newNodes = Array.from(fragment.childNodes);

  if (newNodes.length === 0) {
    return;
  }

  if (hints?.idMap) {
    for (const node of newNodes) {
      if (node instanceof Element) {
        SemanticIdModule.applyIdMap(node, hints.idMap);
      }
    }
  }

  if (finalConfig.morphStyle === 'outerHTML') {
    const firstNode = newNodes[0];
    if (newNodes.length === 1 && firstNode instanceof Element) {
      if (isSameNode(oldNode, firstNode, hints)) {
        // Route the ROOT pair through morphElement so the opaque law (L1) holds by
        // construction at the root, not by a hand-mirrored per-entry-point guard.
        morphElement(oldNode, firstNode, hints, finalConfig.callbacks);
      } else if (!containsOpaque(oldNode) && (finalConfig.callbacks?.beforeRemove?.(oldNode) ?? true)) {
        // A root replace is a remove+add: L2's ancestor rule wins first (replacing a root
        // whose subtree holds an opaque island would cascade-destroy the island, exactly
        // like the removal loop), then the beforeRemove veto, then afterAdd on the new
        // root — same order as any other reconciled node.
        oldNode.replaceWith(firstNode);
        finalConfig.callbacks?.afterAdd?.(firstNode);
      }
    }
  } else {
    const tempParent = document.createElement(oldNode.tagName);
    tempParent.append(parseHTML(newHTML));
    syncChildren(oldNode, tempParent, hints, finalConfig.callbacks);
  }
};
