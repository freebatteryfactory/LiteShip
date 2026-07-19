/** Node targets exercised by `pnpm run test:flake`. */
export const FLAKE_NODE_TARGETS = [
  'tests/unit/core/motion/animation.test.ts',
  'tests/unit/astro/astro-runtime.test.ts',
  'tests/unit/astro/astro-directives.test.ts',
  'tests/unit/web/llm-adapter.test.ts',
  'tests/component/worker-host.test.ts',
] as const;

/** Browser targets exercised by `pnpm run test:flake`. */
export const FLAKE_BROWSER_TARGETS = ['tests/browser/astro-stream-llm.test.ts'] as const;
