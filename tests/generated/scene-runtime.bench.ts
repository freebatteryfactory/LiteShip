// GENERATED — do not edit by hand
import { bench } from 'vitest';
import { compileIntro } from '../../examples/scenes/intro.js';
import { SceneRuntime } from '../../packages/scene/src/runtime.js';

// REAL bench: time the runtime-backed transition — SceneRuntime.build(...).tick(dt).
// The compiled descriptor is pure data (built once); the handle is built in setup
// and ticked one frame per iteration, so the loop measures the real ECS tick.
const compiled = compileIntro();
const dtMs = 1000 / (compiled as { fps: number }).fps;
let handle;

bench(
  `scene.runtime — tick() throughput`,
  async () => {
    await handle.tick(dtMs);
  },
  {
    time: 2000,
    setup: async () => {
      handle = await SceneRuntime.build(compiled);
    },
    teardown: async () => {
      await handle.release();
    },
  },
);
