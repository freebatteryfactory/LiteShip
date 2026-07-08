/**
 * Dev-time boundary-shadowing diagnostic (#114).
 *
 * Detects when a non-boundary CSS rule at equal/higher specificity targets the
 * same properties as boundary output — the crown consumer bug where layout flips
 * at the wrong breakpoint while JS reports the right state.
 *
 * @module
 */

/** One property set emitted by a boundary for a given selector. */
export interface BoundaryRuleSlice {
  readonly selector: string;
  readonly properties: ReadonlySet<string>;
}

const SELECTOR_RE = /([^{}@]+)\{([^}]*)\}/g;
const PROP_RE = /([a-zA-Z-]+)\s*:/g;

function extractRules(css: string): Array<{ selector: string; properties: Set<string> }> {
  const rules: Array<{ selector: string; properties: Set<string> }> = [];
  const inner = css.replace(/@[^{]+\{((?:[^{}]|\{[^{}]*\})*)\}/g, '$1');
  for (const match of inner.matchAll(SELECTOR_RE)) {
    const selector = match[1]?.trim() ?? '';
    const body = match[2] ?? '';
    if (!selector || selector.startsWith('@')) continue;
    const properties = new Set<string>();
    for (const prop of body.matchAll(PROP_RE)) {
      const name = prop[1]?.toLowerCase();
      if (name) properties.add(name);
    }
    if (properties.size > 0) rules.push({ selector, properties });
  }
  return rules;
}

function selectorsOverlap(a: string, b: string): boolean {
  const na = a.replace(/\s+/g, ' ').trim();
  const nb = b.replace(/\s+/g, ' ').trim();
  if (na === nb) return true;
  // Component-exact match only — naive substring inclusion false-positives on
  // `.hero` vs `.hero-title` or `.card` vs `.card-header`.
  const componentsA = na.split(/\s+/);
  const componentsB = nb.split(/\s+/);
  for (const ca of componentsA) {
    for (const cb of componentsB) {
      if (ca === cb) return true;
    }
  }
  return false;
}

/**
 * Compare boundary-emitted CSS against foreign (non-\@quantize) CSS.
 * Returns human-readable warnings for shadowing rules.
 */
export function diagnoseBoundaryShadowing(
  boundaryCss: string,
  foreignCss: string,
  foreignFile: string,
): readonly string[] {
  const boundaryRules = extractRules(boundaryCss);
  const foreignRules = extractRules(foreignCss);
  const warnings: string[] = [];

  for (const foreign of foreignRules) {
    for (const boundary of boundaryRules) {
      if (!selectorsOverlap(foreign.selector, boundary.selector)) continue;
      const shared = [...foreign.properties].filter((p) => boundary.properties.has(p));
      if (shared.length === 0) continue;
      warnings.push(
        `${foreignFile}: rule "${foreign.selector}" shadows boundary output for ${shared.join(', ')} ` +
          `(boundary selector "${boundary.selector}")`,
      );
    }
  }
  return warnings;
}
