import type { EntityId, World } from '@liteship/core/ecs';
import {
  SceneParts,
  admitScenePartSeed,
  scenePartSeed,
  type ScenePartName,
  type ScenePartSeed,
} from '../../packages/scene/src/parts.js';

export type SceneSeedRecord = Partial<{
  readonly [K in ScenePartName]: Extract<ScenePartSeed, { readonly part: K }>['value'];
}>;

/** Test-only authored fixture adapter; production compilation emits ScenePartSeed[] directly. */
export function spawnSceneEntity(world: World, components: SceneSeedRecord): EntityId {
  const admitted = Object.entries(components).map(([name, value]) => {
    const part = SceneParts[name as ScenePartName];
    return admitScenePartSeed(scenePartSeed(part, value));
  });
  return world.spawn(...admitted);
}
