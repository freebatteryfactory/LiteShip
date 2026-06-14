/**
 * Projection vocabulary — the single source of the per-quantizer output KEY
 * naming used across every cast target (CSS custom property, GLSL uniform,
 * ARIA/data attribute).
 *
 * Before this, the convention was hand-inlined in four places that had already
 * drifted: `compositor.ts` minted `glslKey` as the raw `u_${name}`, the worker
 * blob scripts copied that, and `astro/gpu.ts` re-derived it with a different
 * (hyphen-only) transform — none matching the GLSL compiler's `toUniformName`,
 * which produces the identifier the shader actually declares. GLSL identifiers
 * cannot contain hyphens, so the raw form was a latent bug.
 *
 * This module is the one home for that vocabulary — the Projection entity's
 * seed. {@link glslIdent} is the canonical GLSL-uniform sanitizer (shared with
 * `@czap/compiler`'s GLSL arm); {@link wgslIdent} is its WGSL twin (the bare
 * snake_case struct field the WGSL compiler's `toFieldName` declares — same
 * fold, no `u_` prefix); {@link PROJECTION_KEYS_SOURCE} is the inlinable
 * worker-blob twin (the P0 pattern). Cross-surface agreement is locked by
 * `tests/unit/core/projection.test.ts`.
 *
 * @module
 */

/** The per-quantizer output keys, one per cast target. */
export interface ProjectionKeys {
  /** CSS custom property:  `--czap-<name>` (name preserved verbatim). */
  readonly cssKey: string;
  /** GLSL uniform:         `u_<snake>` (the identifier the shader declares). */
  readonly glslKey: string;
  /** WGSL struct field:    `<snake>` (the bare field name the buffer declares). */
  readonly wgslKey: string;
  /** ARIA/data attribute:  `data-czap-<name>` (name preserved verbatim). */
  readonly ariaKey: string;
}

/**
 * Kebab/camelCase folded to snake_case, lowercased — the shared snake fold both
 * {@link glslIdent} (which prefixes `u_`) and {@link wgslIdent} (which does not)
 * build on. Matches the GLSL compiler's `toUniformName` and the WGSL compiler's
 * `toFieldName`, so the one site of the transform cannot drift between arms.
 */
function snakeFold(name: string): string {
  return name
    .replace(/-/g, '_')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase();
}

/**
 * Canonical GLSL uniform identifier for a name: prefix `u_`, kebab/camelCase
 * folded to snake_case, lowercased. This is the exact identifier the GLSL
 * compiler declares, so runtime values key onto the right uniform. Shared by
 * `@czap/compiler`'s GLSL arm (`toUniformName`) and the runtime so the build
 * and runtime cannot disagree.
 */
export function glslIdent(name: string): string {
  return `u_${snakeFold(name)}`;
}

/**
 * Canonical WGSL struct-field identifier for a name: kebab/camelCase folded to
 * snake_case, lowercased, with NO prefix. This is the exact field name the WGSL
 * compiler declares (`toFieldName` in `@czap/compiler`'s WGSL arm), so the
 * compositor's `wgsl` output keys onto the right `@group/@binding` uniform
 * struct member. WGSL bindings are bare field names (unlike GLSL's `u_` prefix).
 */
export function wgslIdent(name: string): string {
  return snakeFold(name);
}

/** Derive the {@link ProjectionKeys} for a quantizer/satellite name. */
export function projectionKeys(name: string): ProjectionKeys {
  return {
    cssKey: `--czap-${name}`,
    glslKey: glslIdent(name),
    wgslKey: wgslIdent(name),
    ariaKey: `data-czap-${name}`,
  };
}

/**
 * Worker-blob twin of {@link projectionKeys} as an inlinable JavaScript source
 * string (classic-worker scope, no ES imports). The worker/render blob scripts
 * interpolate this so they cannot drift from the core convention. Must stay
 * byte-equivalent to {@link projectionKeys}; the projection parity test executes
 * it via `new Function(...)` and asserts agreement.
 */
export const PROJECTION_KEYS_SOURCE = `\
/**
 * Per-quantizer output keys, matching @czap/core projectionKeys / glslIdent / wgslIdent.
 * @param {string} name
 * @returns {{ cssKey: string, glslKey: string, wgslKey: string, ariaKey: string }}
 */
function projectionKeys(name) {
  const snake = name.replace(/-/g, "_").replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
  return { cssKey: "--czap-" + name, glslKey: "u_" + snake, wgslKey: snake, ariaKey: "data-czap-" + name };
}`;
