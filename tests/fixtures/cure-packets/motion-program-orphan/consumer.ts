import type { System } from './ecs-api.js';

/** Exact escaped shape: a working sampler hidden behind an uninhabited query. */
export function MotionSampleSystem(): System {
  return {
    name: 'MotionSampleSystem',
    query: ['MotionProgram', 'VideoSource'],
    execute() {},
  };
}
