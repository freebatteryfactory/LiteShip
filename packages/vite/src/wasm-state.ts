/**
 * Explicit WASM state machine for the liteship Vite plugin.
 *
 * The compute-binary wiring was previously three free `let`s
 * (`resolvedWasm` / `wasmEnabled` / `emittedWasmRefId`) written in
 * `configResolved` + `buildStart` and read in `load`. This module lifts that
 * into one explicit {@link WasmState} record plus standalone transition
 * functions, injected into the standalone hooks — so the state is a value you
 * can construct and assert on, not hidden mutable closure variables.
 *
 * Composition over inheritance: a record (the `config` intent + a mutable
 * `resolution` cell) and pure transition functions, no classes.
 *
 * The `mode` (`'on' | 'off' | 'auto'`) separates the three user stances so the
 * "auto" default can defer the enable decision until the project root is
 * known:
 *
 * - `'on'`   — explicitly requested; a missing binary is a `buildStart` warning.
 * - `'off'`  — explicitly disabled; never touches the filesystem.
 * - `'auto'` — omitted: enable iff a binary is found, silently otherwise.
 *
 * @module
 */

import { resolveWASM } from './wasm-resolve.js';

/** A resolved WASM binary, or `null` when none was found / WASM is off. */
export type WasmResolution = ReturnType<typeof resolveWASM>;

/**
 * Normalised WASM intent (the immutable part of {@link WasmState}): which of
 * the three stances the user chose, and an optional explicit binary path.
 */
export interface WasmConfig {
  readonly mode: 'on' | 'off' | 'auto';
  readonly path?: string;
}

/**
 * Live WASM wiring state for one plugin instance. `config` is the fixed user
 * intent; the `resolution` cell holds the last filesystem resolve result and
 * the build-emitted asset ref id, both updated in place by the transition
 * functions as the project root becomes known and the build emits the asset.
 */
export interface WasmState {
  readonly config: WasmConfig;
  readonly resolution: {
    /** Last resolved binary (re-resolved once the real root is known). */
    resolved: WasmResolution;
    /**
     * Whether WASM is wired up: always true in `'on'`, true in `'auto'` iff a
     * binary resolved, never in `'off'`.
     */
    enabled: boolean;
    /** Rollup asset ref id for the emitted binary (build only), else `null`. */
    emittedRefId: string | null;
  };
}

/**
 * Normalise the public `wasm` option into a {@link WasmConfig}.
 *
 * `{ path }` (or `{}`) with no explicit `enabled` is treated as `auto` — the
 * search still runs, so a supplied path is honoured without a second flag.
 */
export function normalizeWasmConfig(
  wasm?: boolean | { readonly enabled?: boolean; readonly path?: string },
): WasmConfig {
  if (wasm === true) return { mode: 'on' };
  if (wasm === false) return { mode: 'off' };
  if (wasm === undefined) return { mode: 'auto' };
  if (wasm.enabled === true) return { mode: 'on', path: wasm.path };
  if (wasm.enabled === false) return { mode: 'off', path: wasm.path };
  return { mode: 'auto', path: wasm.path };
}

/**
 * Whether WASM should be considered enabled given a resolution outcome:
 * always in `'on'`, in `'auto'` iff a binary resolved, never in `'off'`.
 */
function computeEnabled(mode: WasmConfig['mode'], resolved: WasmResolution): boolean {
  return mode === 'on' || (mode === 'auto' && resolved !== null);
}

/**
 * Build the initial {@link WasmState} for a plugin instance. Resolves once up
 * front for `on`/`auto` against the current working directory (the
 * `configResolved` transition re-resolves with the real project root);
 * `off` never touches the filesystem.
 */
export function createWasmState(config: WasmConfig, initialRoot: string): WasmState {
  const resolved = config.mode === 'off' ? null : resolveWASM(initialRoot, config.path);
  return {
    config,
    resolution: {
      resolved,
      enabled: computeEnabled(config.mode, resolved),
      emittedRefId: null,
    },
  };
}

/**
 * `configResolved` transition: re-resolve against the real project root.
 * `off` stays `null`/disabled without touching the filesystem.
 */
export function resolveWasmForRoot(state: WasmState, projectRoot: string): void {
  const resolved = state.config.mode === 'off' ? null : resolveWASM(projectRoot, state.config.path);
  state.resolution.resolved = resolved;
  state.resolution.enabled = computeEnabled(state.config.mode, resolved);
}

/**
 * `buildStart` transition: re-resolve, then in `'on'`/`'auto'` re-derive
 * `enabled` from presence-of-binary alone (mirroring the original
 * `wasmEnabled = wasmMode === 'on' || resolvedWasm !== null`). A no-op for
 * `off`. Returns the resolution so the caller can decide whether to warn.
 */
export function refreshWasmAtBuildStart(state: WasmState, projectRoot: string): WasmResolution {
  if (state.config.mode === 'off') return null;
  const resolved = resolveWASM(projectRoot, state.config.path);
  state.resolution.resolved = resolved;
  state.resolution.enabled = state.config.mode === 'on' || resolved !== null;
  return resolved;
}

/** Record the Rollup asset ref id for the emitted compute binary (build mode). */
export function setEmittedWasmRef(state: WasmState, refId: string): void {
  state.resolution.emittedRefId = refId;
}
