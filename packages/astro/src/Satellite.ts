/**
 * Satellite -- server-side helper for rendering adaptive container divs.
 *
 * A satellite is czap's island primitive: a plain div annotated with
 * data-czap-* attributes that the client directive hydrates by evaluating
 * live signals and updating `data-czap-state`. CSS transitions handle
 * the visual changes -- zero JS layout work.
 *
 * @module
 */

import type { Boundary, Component } from '@czap/core';
import type { DirectiveName } from './runtime/directive-boot.js';
import type { WgslUniformValue } from './runtime/boundary.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Server-render props for a satellite container. Astro components
 * typically destructure these and pass them to {@link satelliteAttrs}.
 */
export interface SatelliteProps {
  /** Boundary whose state the satellite tracks. */
  readonly boundary?: Boundary.Shape;
  /** Component definition used to identify the satellite on the client. */
  readonly component?: Component.Shape;
  /** Extra CSS class names to merge with `czap-satellite`. */
  readonly class?: string;
  /** Server-side initial state (serialised into `data-czap-state`). */
  readonly initialState?: string;
  /**
   * Which client directive the boot scanner should activate for this
   * satellite (serialised into `data-czap-directive`). Defaults to
   * `'satellite'` when a boundary is present — a serialized boundary
   * with no evaluator is exactly the inert-island bug. Pass `false`
   * for a CSS-only shell that ships zero runtime.
   */
  readonly directive?: DirectiveName | false;
  /**
   * Authored per-state ARIA/data attributes (`@aria` blocks) for this boundary,
   * keyed by state then attribute. The `<Satellite>` component supplies this
   * automatically via a content-address join against the build manifest; pass
   * it explicitly when calling `satelliteAttrs` directly. The initial state's
   * attributes are SSR'd onto the element; the client updates them live.
   */
  readonly aria?: Readonly<Record<string, Readonly<Record<string, string>>>>;
  /**
   * Authored per-state GLSL uniform values (`@glsl` blocks) for this boundary,
   * keyed by state then `u_*` uniform name. The `<Satellite>` component supplies
   * this automatically via the same content-address join as `aria`; pass it
   * explicitly when calling `satelliteAttrs` directly. Rides the boundary payload
   * so the client resolves `glslStateUniforms[currentState]` and the GPU runtime
   * updates uniforms live on every crossing — the GLSL analog of `aria`.
   */
  readonly glsl?: Readonly<Record<string, Readonly<Record<string, number>>>>;
  /**
   * Authored per-state WGSL uniform binding values (`@wgsl` blocks) for this
   * boundary, keyed by state then bare snake_case field name (e.g.
   * `{ mobile: { blur_radius: 2.0 } }`). Mirrors {@link aria}: joined onto the
   * satellite from the build manifest by content address. Rides the boundary
   * payload (`stateWgsl`) so the `client:gpu` WGSL runtime resolves the live
   * uniform-buffer values for the current state on every crossing — never
   * SSR-frozen.
   */
  readonly wgsl?: Readonly<Record<string, Readonly<Record<string, WgslUniformValue>>>>;
  /**
   * Emitted GLSL preamble (`GLSLCompileResult.declarations`: `#define STATE_*` +
   * `uniform <type> u_*;` lines) for this boundary's `@glsl` cast. The
   * `<Satellite>` component supplies it from the build manifest's
   * `outputs[].glsl.declarations` via the same content-address join as
   * {@link glsl}; pass it explicitly when calling `satelliteAttrs` directly.
   * Rides the boundary payload (`glslDeclarations`) so the `client:gpu` GLSL
   * runtime PREPENDS the compiler's own uniform vocabulary to the fragment
   * source before `createProgram` — the author no longer hand-types `u_*`
   * declarations that must happen to match the compiler's. The single source of
   * truth (the compiler) produces both the declarations and the per-state values.
   */
  readonly glslDeclarations?: string;
  /**
   * Emitted WGSL preamble (`WGSLCompileResult.declarations`: state consts + the
   * uniform struct + `@group(0) @binding(0)`) for this boundary's `@wgsl` cast.
   * Supplied by `<Satellite>` from the manifest's `outputs[].wgsl.declarations`,
   * the WGSL analog of {@link glslDeclarations}. Rides the payload
   * (`wgslDeclarations`) so the WGSL `client:gpu` runtime prepends the compiler's
   * own struct to the shader module before `createShaderModule`.
   */
  readonly wgslDeclarations?: string;
}

// ---------------------------------------------------------------------------
// Attribute Generation
// ---------------------------------------------------------------------------

/**
 * Generate the HTML attributes for a satellite container div.
 * Used by framework integrations (Astro, etc.) to render the satellite wrapper.
 *
 * The returned record maps directly to DOM attributes -- spread it onto your
 * container element and the client directive picks up the rest.
 */
export function satelliteAttrs(props: SatelliteProps): Record<string, string> {
  const attrs: Record<string, string> = {};

  attrs['class'] = ['czap-satellite', props.class].filter(Boolean).join(' ');

  if (props.component) {
    attrs['data-czap-satellite'] = props.component.name;
  }

  if (props.boundary) {
    attrs['data-czap-boundary'] = JSON.stringify({
      id: props.boundary.id,
      input: props.boundary.input,
      thresholds: props.boundary.thresholds,
      states: props.boundary.states,
      hysteresis: props.boundary.hysteresis,
      // Authored ARIA rides the boundary payload so the client reader resolves
      // it live (the same content-addressed projection the manifest holds).
      ...(props.aria ? { stateAttributes: props.aria } : {}),
      // Authored per-state GLSL uniforms ride alongside ARIA so the GPU runtime
      // resolves `glslStateUniforms[currentState]` live on every crossing.
      ...(props.glsl ? { glslStateUniforms: props.glsl } : {}),
      // Authored WGSL uniform binding values ride the payload the same way, so
      // the WGSL `client:gpu` runtime resolves the live uniform buffer per state.
      ...(props.wgsl ? { stateWgsl: props.wgsl } : {}),
      // The emitted shader preamble (the compiler's `declarations`) rides the
      // payload so the GPU runtime prepends the compiler's OWN uniform vocabulary
      // to the fragment/module before compile — the uniform names the runtime
      // binds and the names the compiler emits are then two views of one source,
      // not a hand-typed mirror that must happen to agree.
      ...(props.glslDeclarations ? { glslDeclarations: props.glslDeclarations } : {}),
      ...(props.wgslDeclarations ? { wgslDeclarations: props.wgslDeclarations } : {}),
    });
    if (props.directive !== false) {
      attrs['data-czap-directive'] = props.directive ?? 'satellite';
    }
    const initial = props.initialState ?? resolveInitialStateFallback(props.boundary);
    attrs['data-czap-state'] = initial;
    // SSR the initial state's authored ARIA so first paint is accessible before
    // hydration; `applyBoundaryState` updates these on every crossing.
    const initialAria = props.aria?.[initial];
    if (initialAria) {
      for (const [attribute, value] of Object.entries(initialAria)) {
        attrs[attribute] = value;
      }
    }
  } else if (props.initialState) {
    attrs['data-czap-state'] = props.initialState;
  }

  return attrs;
}

// ---------------------------------------------------------------------------
// SSR State Resolution
// ---------------------------------------------------------------------------

/**
 * Resolve initial state from a boundary for SSR.
 *
 * Uses a first-state heuristic since the server has no live signal value.
 * For smarter resolution with client hints and user agent parsing, use
 * `resolveInitialState` from `./quantize.js` instead.
 */
export function resolveInitialStateFallback(boundary: Boundary.Shape): string {
  // Boundary.make() guarantees at least one state for every Boundary.Shape.
  return boundary.states[0]!;
}
