/**
 * DOM-reading probes for the dev inspector — the helpers that consult the live
 * document (stylesheets, element attributes) rather than pure data.
 *
 * Kept separate from the pure LAWS in `./boundary-edit.ts` so the seam between
 * "reads the DOM" and "pure value → value" stays legible.
 *
 * @module
 */

const DIRECTIVE_ATTR = 'data-liteship-directive';
const LEGACY_DIRECTIVE_PREFIX = 'client:';

/** Whether any stylesheet declares the given container name. */
export function hasContainerNameDeclared(containerName: string, root: Document = document): boolean {
  for (const sheet of Array.from(root.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      // Cross-origin stylesheets deny cssRules access; they cannot carry
      // the project's @quantize container declarations, so skip them.
      continue;
    }
    for (let index = 0; index < rules.length; index++) {
      const rule = rules[index];
      if (!(rule instanceof CSSStyleRule)) {
        continue;
      }
      const declared = rule.style.getPropertyValue('container-name');
      if (declared.split(/\s+/).includes(containerName)) {
        return true;
      }
      if (rule.cssText.includes('container-name') && rule.cssText.includes(containerName)) {
        return true;
      }
    }
  }
  return false;
}

/** Teaching text when quantize CSS has no matching container declaration. */
export function containerNotDeclaredMessage(input: string, containerName: string): string {
  const heightAxis = input === 'height' || input.endsWith('.height');
  const containment = heightAxis ? 'size' : 'inline-size';
  if (input.startsWith('viewport.') || input === 'viewport') {
    return (
      `@quantize compiled rules use @container ${containerName}, but no stylesheet declares ` +
      `container-name: ${containerName} on :root — the rules will match nothing until the ` +
      `build emits the viewport containment rule (re-run the dev server after adding @quantize).`
    );
  }
  return (
    `@quantize compiled rules use @container ${containerName}, but no ancestor declares ` +
    `container-type: ${containment}; container-name: ${containerName}; — add that declaration ` +
    `on the element whose size this boundary measures.`
  );
}

/** Whether an element carries a (canonical or legacy) directive marker the runtime evaluates. */
export function isDirectiveActive(element: HTMLElement): boolean {
  if (element.hasAttribute(DIRECTIVE_ATTR)) {
    return true;
  }
  for (const attribute of element.getAttributeNames()) {
    if (attribute.startsWith(LEGACY_DIRECTIVE_PREFIX)) {
      return true;
    }
  }
  return element.hasAttribute('data-liteship-directive-bound');
}
