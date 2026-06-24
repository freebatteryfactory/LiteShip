// GENERATED — do not edit by hand
import { bench } from 'vitest';
import { compileIntro } from '../../examples/scenes/intro.js';
import { intro } from '../../examples/scenes/intro.js';
import { SceneRuntime } from '../../packages/scene/src/runtime.js';

// BENCH LANE: per-frame budget is a perf contract, not a unit assertion. It
// ticks the REAL scene runtime one frame per bench iteration; the vitest bench
// reporter surfaces p95, compared against the capsule's declared budget
// (cap.budgets.p95Ms — read from the binding, the source of truth).
const compiled = compileIntro();
const declaredP95Ms = (intro as { budgets?: { p95Ms?: number } }).budgets?.p95Ms;
let handle;

bench(
  `examples.intro — per-frame tick (p95 vs declared budget ${declaredP95Ms ?? 'n/a'}ms)`,
  async () => {
    await handle.tick(1000 / compiled.fps);
  },
  {
    time: 2000,
    setup: async () => {
      handle = await SceneRuntime.build(compiled, { sampleRate: 48000 });
    },
    teardown: async () => {
      await handle.release();
    },
  },
);
