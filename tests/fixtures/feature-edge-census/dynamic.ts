import type { System, World } from '../cure-packets/motion-program-orphan/ecs-api.js';

declare const dynamicNames: readonly string[];

export function dynamicSystem(): System {
  return { name: 'dynamic', query: dynamicNames, execute() {} };
}

export function dynamicProducer(world: World, components: Readonly<Record<string, unknown>>): void {
  world.spawn(components);
}
