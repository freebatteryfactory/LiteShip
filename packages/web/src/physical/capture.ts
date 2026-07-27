/**
 * Physical State Capture
 *
 * Captures DOM physical state (focus, scroll, selection, IME)
 * before morphing to restore afterward.
 */

import { Lifetime, attachLifetime, type AsyncOwnedResource } from '@liteship/core';
import type { PhysicalState, ScrollPosition, SelectionState, IMEState, FocusState } from '../types.js';
import { ATTR } from '../morph/semantic-id.js';
import * as SemanticIdModule from '../morph/semantic-id.js';

interface ActiveIMEState {
  readonly element: HTMLInputElement | HTMLTextAreaElement;
  text: string;
  readonly start: number;
  readonly end: number;
}

/**
 * Explicit host-owned IME and physical-state capture controller.
 *
 * Creating a tracker installs three capture-phase composition listeners on the
 * supplied document. Awaiting {@link dispose} removes all three listeners and
 * clears the tracked composition synchronously. Importing this module performs
 * no active work.
 */
export interface PhysicalStateTracker extends AsyncOwnedResource {
  /** Capture focus, selection, scroll, and this tracker's current IME state. */
  capture(root: Element): PhysicalState;
  /** Capture only this tracker's current IME composition, if one is active. */
  captureIME(): IMEState | null;
}

function projectIME(active: ActiveIMEState | null): IMEState | null {
  if (!active) return null;
  return {
    elementPath: elementToPath(active.element),
    text: active.text,
    start: active.start,
    end: active.end,
  };
}

/**
 * Install document-level IME tracking under one explicit async-uniform owner.
 * Separate trackers never share mutable state; disposing one cannot disable a
 * sibling owned by another host.
 */
export function createPhysicalStateTracker(ownerDocument: Document): PhysicalStateTracker {
  const lifetime = Lifetime.make();
  const ownerWindow = ownerDocument.defaultView;
  let active: ActiveIMEState | null = null;

  const onCompositionStart = (event: CompositionEvent): void => {
    const target = event.target;
    const Input = ownerWindow?.HTMLInputElement;
    const TextArea = ownerWindow?.HTMLTextAreaElement;
    if ((Input && target instanceof Input) || (TextArea && target instanceof TextArea)) {
      const editable = target as HTMLInputElement | HTMLTextAreaElement;
      active = {
        element: editable,
        text: '',
        start: editable.selectionStart ?? 0,
        end: editable.selectionEnd ?? 0,
      };
    }
  };

  const onCompositionUpdate = (event: CompositionEvent): void => {
    if (active && event.data) active.text = event.data;
  };

  const onCompositionEnd = (): void => {
    active = null;
  };

  ownerDocument.addEventListener('compositionstart', onCompositionStart, true);
  lifetime.add(() => ownerDocument.removeEventListener('compositionstart', onCompositionStart, true));
  ownerDocument.addEventListener('compositionupdate', onCompositionUpdate, true);
  lifetime.add(() => ownerDocument.removeEventListener('compositionupdate', onCompositionUpdate, true));
  ownerDocument.addEventListener('compositionend', onCompositionEnd, true);
  lifetime.add(() => ownerDocument.removeEventListener('compositionend', onCompositionEnd, true));
  lifetime.add(() => {
    active = null;
  });

  return attachLifetime(
    {
      capture(root: Element): PhysicalState {
        return capture(root, projectIME(active));
      },
      captureIME(): IMEState | null {
        return projectIME(active);
      },
    },
    lifetime,
  );
}

/**
 * Capture passive physical state of an element and its descendants. Pass an
 * IME snapshot supplied by a host-owned tracker to include composition state.
 */
export const capture = (root: Element, ime: IMEState | null = null): PhysicalState => {
  const activeElementPath = captureActiveElement();
  const focusState = captureFocusState();
  const scrollPositions = captureScrollPositionsSync(root);
  const selection = captureSelection();
  return {
    activeElementPath,
    focusState,
    scrollPositions,
    selection,
    ime,
  };
};

/**
 * Capture the currently focused element as a path.
 */
export const captureActiveElement = (): string | null => {
  const active = document.activeElement;
  if (!active || active === document.body) {
    return null;
  }
  return elementToPath(active);
};

/**
 * Capture detailed focus state including cursor position and selection.
 */
export const captureFocusState = (): FocusState | null => {
  const active = document.activeElement;
  if (!active || active === document.body) {
    return null;
  }

  const semanticId = SemanticIdModule.get(active);
  const elementId = semanticId ?? elementToPath(active);

  if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
    return {
      elementId,
      cursorPosition: active.selectionEnd ?? 0,
      selectionStart: active.selectionStart ?? 0,
      selectionEnd: active.selectionEnd ?? 0,
      selectionDirection: active.selectionDirection ?? 'none',
    };
  }

  if (active instanceof HTMLElement && active.isContentEditable) {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const preRange = document.createRange();
      preRange.selectNodeContents(active);
      preRange.setEnd(range.startContainer, range.startOffset);
      const start = preRange.toString().length;
      preRange.setEnd(range.endContainer, range.endOffset);
      const end = preRange.toString().length;

      return {
        elementId,
        cursorPosition: selection.isCollapsed ? start : 0,
        selectionStart: start,
        selectionEnd: end,
        selectionDirection: getSelectionDirection(selection),
      };
    }
  }

  return {
    elementId,
    cursorPosition: 0,
    selectionStart: 0,
    selectionEnd: 0,
    selectionDirection: 'none',
  };
};

/**
 * Capture scroll positions of all scrollable elements (sync version).
 */
const captureScrollPositionsSync = (root: Element): Record<string, ScrollPosition> => {
  const scrollables = findScrollable(root);
  const positions: Record<string, ScrollPosition> = {};

  for (const el of scrollables) {
    const semanticId = SemanticIdModule.get(el);
    const key = semanticId ?? elementToPath(el);

    positions[key] = {
      top: el.scrollTop,
      left: el.scrollLeft,
    };
  }

  return positions;
};

/**
 * Capture text selection state.
 */
export const captureSelection = (): SelectionState | null => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const container = range.commonAncestorContainer;

  const element = container instanceof Element ? container : container.parentElement;

  if (!element) {
    return null;
  }

  const elementPath = elementToPath(element);
  const { start, end } = computeSelectionOffsets(range, element);

  return {
    elementPath,
    start,
    end,
    direction: getSelectionDirection(selection),
  };
};

/**
 * Compute selection offsets relative to a container element.
 */
function computeSelectionOffsets(range: Range, element: Element): { start: number; end: number } {
  const preRange = document.createRange();
  preRange.selectNodeContents(element);
  preRange.setEnd(range.startContainer, range.startOffset);
  const start = preRange.toString().length;

  preRange.setEnd(range.endContainer, range.endOffset);
  const end = preRange.toString().length;

  return { start, end };
}

/**
 * Determine selection direction based on focus/anchor positions.
 */
function getSelectionDirection(selection: Selection): string {
  if (selection.isCollapsed) {
    return 'none';
  }

  if (selection.anchorNode === selection.focusNode && selection.focusOffset > selection.anchorOffset) {
    return 'forward';
  }

  const position = selection.anchorNode?.compareDocumentPosition(selection.focusNode!);

  if (!position) {
    return 'none';
  }

  if (position & Node.DOCUMENT_POSITION_PRECEDING) {
    return 'backward';
  }

  if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
    return 'forward';
  }

  return 'none';
}

/**
 * Generate a unique path selector for an element.
 *
 * Priority:
 * 1. data-liteship-id attribute (semantic ID, stable across morphs)
 * 2. id attribute (HTML id)
 * 3. Position-based path (nth-child selectors)
 */
export const elementToPath = (element: Element, root?: Element): string => {
  const parts: string[] = [];
  let current: Element | null = element;
  const boundary = root ?? document.body;

  while (current && current !== boundary && current !== document.documentElement) {
    const fxId = current.getAttribute(ATTR);
    if (fxId) {
      parts.unshift(`[${ATTR}="${fxId}"]`);
      break;
    }

    const id = current.getAttribute('id');
    if (id) {
      parts.unshift(`#${CSS.escape(id)}`);
      break;
    }

    const parent: Element | null = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children);
      const index = siblings.indexOf(current);
      const tagName = current.tagName.toLowerCase();
      parts.unshift(`${tagName}:nth-child(${index + 1})`);
    }

    current = parent;
  }

  return parts.join(' > ');
};

/**
 * Find scrollable elements within a root.
 */
export const findScrollable = (root: Element): Element[] => {
  const scrollables: Element[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);

  let current: Node | null = walker.currentNode;
  while (current) {
    if (current instanceof Element && isScrollable(current)) {
      scrollables.push(current);
    }
    current = walker.nextNode();
  }

  return scrollables;
};

/**
 * Check if an element is scrollable.
 */
function isScrollable(element: Element): boolean {
  const style = window.getComputedStyle(element);
  const overflowX = style.overflowX;
  const overflowY = style.overflowY;

  const hasOverflow = overflowX === 'scroll' || overflowX === 'auto' || overflowY === 'scroll' || overflowY === 'auto';

  if (!hasOverflow) {
    return false;
  }

  const hasScrollableContent = element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth;

  return hasScrollableContent;
}
