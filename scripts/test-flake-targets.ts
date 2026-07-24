/** One owned runtime-sensitive target exercised by `pnpm run test:flake`. */
export interface FlakeTarget {
  readonly path: string;
  readonly kind: 'node' | 'browser';
  readonly owner: string;
  readonly provingScar: string;
  readonly remediation: string;
}

/**
 * Single authored flake-target truth. The path-only projections below preserve
 * the existing Vitest runner contract while evidence retains ownership and the
 * exact regression scar that justified repeated execution.
 */
export const FLAKE_TARGETS: readonly FlakeTarget[] = Object.freeze([
  {
    path: 'tests/unit/core/motion/animation.test.ts',
    kind: 'node',
    owner: 'packages/core/src/motion',
    provingScar: 'motion scheduling must remain deterministic across repeated event-loop turns',
    remediation: 'repair the motion scheduler or its deterministic clock seam, then rerun this exact target',
  },
  {
    path: 'tests/unit/astro/astro-runtime.test.ts',
    kind: 'node',
    owner: 'packages/astro/src/runtime',
    provingScar: 'Astro runtime startup and teardown previously exposed timing-sensitive failures',
    remediation: 'repair Astro runtime lifecycle ownership, then rerun this exact target',
  },
  {
    path: 'tests/unit/astro/astro-directives.test.ts',
    kind: 'node',
    owner: 'packages/astro/src',
    provingScar: 'Astro directive state projection must not depend on process timing',
    remediation: 'repair directive state projection at the Astro owner, then rerun this exact target',
  },
  {
    path: 'tests/unit/web/llm-adapter.test.ts',
    kind: 'node',
    owner: 'packages/web/src',
    provingScar: 'streamed LLM adaptation must preserve ordering under repeated schedules',
    remediation: 'repair the web streaming adapter ordering seam, then rerun this exact target',
  },
  {
    path: 'tests/component/worker-host.test.ts',
    kind: 'node',
    owner: 'packages/worker/src',
    provingScar: 'worker host startup and disposal must remain deterministic across process runs',
    remediation: 'repair worker host lifecycle ownership, then rerun this exact target',
  },
  {
    path: 'tests/browser/astro-stream-llm.test.ts',
    kind: 'browser',
    owner: 'packages/astro/src/runtime',
    provingScar: 'browser streaming startup and completion must remain deterministic across real browser runs',
    remediation: 'repair the browser streaming lifecycle seam, then rerun this exact target',
  },
]);

/** Node targets exercised by `pnpm run test:flake`. */
export const FLAKE_NODE_TARGETS = Object.freeze(
  FLAKE_TARGETS.filter((target) => target.kind === 'node').map((target) => target.path),
);

/** Browser targets exercised by `pnpm run test:flake`. */
export const FLAKE_BROWSER_TARGETS = Object.freeze(
  FLAKE_TARGETS.filter((target) => target.kind === 'browser').map((target) => target.path),
);
