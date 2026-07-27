import type { World } from './ecs-api.js';

/** Historical runtime produced VideoSource but never MotionProgram. */
export function seedScene(world: World): void {
  world.spawn({ VideoSource: { src: 'fixture.mp4' } });
}
