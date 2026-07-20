/**
 * Style CSS Compiler -- `StyleDef` to scoped CSS with `@layer`, `@scope`,
 * `@starting-style`.
 *
 * Emits component-scoped CSS using modern CSS features:
 * - `@layer liteship.components` for cascade ordering
 * - `@scope` for DOM subtree containment
 * - `@starting-style` for entry animations
 * - `@container` queries via {@link CSSCompiler} delegation for boundary states
 *
 * @module
 */

import type { Style, StyleLayer, ShadowLayer } from '@liteship/core';
import { CSSCompiler } from './css.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Output of {@link StyleCSSCompiler.compile}.
 *
 * Three complementary serializations: `scoped` is the raw `@scope`-wrapped
 * rule block, `layers` is the same content re-wrapped in
 * `@layer liteship.components { … }` with any boundary `@container` rules
 * appended, and `startingStyle` is an `@starting-style` block derived from
 * the base layer for entry animations.
 */
export interface StyleCSSResult {
  /** `@scope`-wrapped rule block (or plain rules when no component name). */
  readonly scoped: string;
  /** `@layer liteship.components { … }` block including container queries. */
  readonly layers: string;
  /** `@starting-style { … }` block for entry animations (may be empty). */
  readonly startingStyle: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function serializeDeclarations(props: Record<string, string>, indent: string): string {
  return Object.entries(props)
    .map(([k, v]) => `${indent}${k}: ${v};`)
    .join('\n');
}

function serializeShadowLayers(shadows: readonly ShadowLayer[]): string {
  return shadows
    .map((s) => {
      const inset = s.inset ? 'inset ' : '';
      const spread = s.spread !== undefined ? ` ${s.spread}px` : '';
      return `${inset}${s.x}px ${s.y}px ${s.blur}px${spread} ${s.color}`;
    })
    .join(', ');
}

/**
 * Emit a single style layer's properties + pseudo-selectors + box-shadow.
 */
function emitStyleLayerBlock(layer: StyleLayer, selector: string, indent: string): string[] {
  const lines: string[] = [];
  const declIndent = indent + '  ';

  // Main properties
  const mainProps = { ...layer.properties };
  if (layer.boxShadow && layer.boxShadow.length > 0) {
    mainProps['box-shadow'] = serializeShadowLayers(layer.boxShadow);
  }

  if (Object.keys(mainProps).length > 0) {
    lines.push(`${indent}${selector} {`);
    lines.push(serializeDeclarations(mainProps, declIndent));
    lines.push(`${indent}}`);
  }

  // Pseudo-selectors
  if (layer.pseudo) {
    for (const [pseudo, pseudoProps] of Object.entries(layer.pseudo)) {
      if (Object.keys(pseudoProps).length === 0) continue;
      lines.push(`${indent}${selector}${pseudo} {`);
      lines.push(serializeDeclarations(pseudoProps, declIndent));
      lines.push(`${indent}}`);
    }
  }

  return lines;
}

/**
 * Build the transition shorthand from Style.transition config.
 */
function buildTransition(style: Style): Record<string, string> {
  if (!style.transition) return {};
  const { duration, easing = 'ease', properties } = style.transition;
  const propList = properties && properties.length > 0 ? properties.join(', ') : 'all';
  return { transition: `${propList} ${duration}ms ${easing}` };
}

/**
 * Emit `@starting-style` block with base properties for entry animation.
 */
function emitStartingStyle(layer: StyleLayer, selector: string): string {
  const props = { ...layer.properties };
  if (layer.boxShadow && layer.boxShadow.length > 0) {
    props['box-shadow'] = serializeShadowLayers(layer.boxShadow);
  }

  if (Object.keys(props).length === 0) return '';

  const decls = serializeDeclarations(props, '      ');
  return [`@starting-style {`, `    ${selector} {`, decls, `    }`, `}`].join('\n');
}

/**
 * Emit `@container` rules for boundary states by delegating to {@link CSSCompiler}.
 */
function emitBoundaryStates(style: Style, selector: string): string {
  if (!style.boundary || !style.states) return '';

  const stateMap: Record<string, Record<string, string>> = {};
  for (const [stateName, layer] of Object.entries(style.states)) {
    if (!layer) continue;
    const props = { ...layer.properties };
    if (layer.boxShadow && layer.boxShadow.length > 0) {
      props['box-shadow'] = serializeShadowLayers(layer.boxShadow);
    }
    stateMap[stateName] = props;
  }

  if (Object.keys(stateMap).length === 0) return '';

  const result = CSSCompiler.compile(style.boundary, stateMap, selector);

  return result.raw;
}

// ---------------------------------------------------------------------------
// StyleCSSCompiler
// ---------------------------------------------------------------------------

/**
 * Compile a {@link Style} into layered, scoped CSS.
 *
 * When `componentName` is supplied the output is wrapped in an `@scope`
 * block targeting `.liteship-<name>` and bounded at `[data-liteship-slot]`
 * children. Boundary states are compiled into nested `@container` rules
 * via the core {@link CSSCompiler}.
 */
function compile(style: Style, componentName?: string): StyleCSSResult {
  const selector = componentName ? `.liteship-${componentName}` : ':where(.liteship-styled)';
  const scopeEnd = componentName ? ' to ([data-liteship-slot])' : '';

  // Scoped rules (base layer + pseudo-selectors)
  const scopedLines: string[] = [];

  // Add transition if defined
  const transitionProps = buildTransition(style);
  const baseWithTransition: StyleLayer = {
    ...style.base,
    properties: { ...style.base.properties, ...transitionProps },
  };

  if (componentName) {
    scopedLines.push(`@scope (${selector})${scopeEnd} {`);
    scopedLines.push(...emitStyleLayerBlock(baseWithTransition, ':scope', '  '));
    scopedLines.push(`}`);
  } else {
    scopedLines.push(...emitStyleLayerBlock(baseWithTransition, selector, ''));
  }

  const scoped = scopedLines.join('\n');

  // Layer-wrapped output
  const layerContent: string[] = [scoped];

  // Boundary-based container queries
  const containerRules = emitBoundaryStates(style, selector);
  if (containerRules) {
    layerContent.push('');
    layerContent.push(containerRules);
  }

  const layers = [`@layer liteship.components {`, ...layerContent.map((line) => (line ? `  ${line}` : '')), `}`].join(
    '\n',
  );

  // @starting-style
  const startingStyle = emitStartingStyle(style.base, selector);

  return { scoped, layers, startingStyle };
}

/**
 * Style CSS compiler namespace.
 *
 * Compiles a {@link Style} into cascade-layered, scoped CSS using
 * `@layer`, `@scope`, `@starting-style`, and `@container` — the modern CSS
 * features that let liteship deliver component isolation and state-driven
 * restyling without runtime class toggling.
 */
export const StyleCSSCompiler = {
  /** Compile a style definition into scoped, layered CSS. */
  compile,
} as const;
