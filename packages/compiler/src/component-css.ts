/**
 * Component CSS Compiler -- `ComponentDef` to `StyleCSSResult` with slot + adaptive markers.
 *
 * Delegates to {@link StyleCSSCompiler} for the core style output, then
 * appends slot-marker styling and adaptive container-type declarations so
 * mounted component instances automatically opt into container queries.
 *
 * @module
 */

import type { Component } from '@liteship/core';
import type { StyleCSSResult } from './style-css.js';
import { StyleCSSCompiler } from './style-css.js';

// ---------------------------------------------------------------------------
// ComponentCSSCompiler
// ---------------------------------------------------------------------------

/**
 * Compile a {@link Component} into scoped CSS with slot and adaptive
 * markers appended inside the component's `@layer` block.
 */
function compile(component: Component): StyleCSSResult {
  const base = StyleCSSCompiler.compile(component.styles, component.name);

  // Slot marker: children of [data-liteship-slot] use display: contents to avoid
  // layout interference from the slot wrapper element.
  const slotRule = `[data-liteship-slot] { display: contents; }`;

  // Adaptive container: enables container queries on adaptive-mounted instances.
  const adaptiveRule = `[data-liteship-adaptive="${component.name}"] { container-type: inline-size; }`;

  // Append slot + adaptive rules to the scoped output
  const scoped = [base.scoped, '', slotRule, '', adaptiveRule].join('\n');

  // Append slot + adaptive rules into the existing layer block produced by
  // StyleCSSCompiler instead of wrapping in a second independent block. This
  // prevents duplicate / mis-nested @layer declarations and preserves any
  // @container rules already emitted by the base compiler.
  const layers = base.layers
    ? base.layers.replace(/\}\s*$/, `\n  ${slotRule}\n\n  ${adaptiveRule}\n}`)
    : `@layer liteship.components {\n  ${slotRule}\n\n  ${adaptiveRule}\n}`;

  return {
    scoped,
    layers,
    startingStyle: base.startingStyle,
  };
}

/**
 * Component CSS compiler namespace.
 *
 * Wraps {@link StyleCSSCompiler} with component-scoped conventions: children
 * inside `[data-liteship-slot]` use `display: contents` so slotted content
 * inherits layout from the surrounding parent, and elements tagged
 * `[data-liteship-adaptive="<name>"]` get `container-type: inline-size` so
 * adaptive-mounted instances participate in container queries.
 */
export const ComponentCSSCompiler = {
  /** Compile a component definition into scoped CSS with slot + adaptive markers. */
  compile,
} as const;
