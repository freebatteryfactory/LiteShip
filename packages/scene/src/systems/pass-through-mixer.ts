/**
 * PassThroughMixer — liteship's only shipped mixer. Forwards each audio
 * entity's Volume/Pan components verbatim to a receipt sink. Proves
 * the mix vocabulary + system-contract wiring end-to-end without
 * performing any signal processing. Real DSP is user-provided.
 *
 * @module
 */

import { defineSystem, type System } from '@liteship/core/ecs';
import { AudioSourcePart, PanPart, VolumePart } from '../parts.js';

type FrameSource = number | (() => number);
const readFrame = (source: FrameSource): number => (typeof source === 'function' ? source() : source);

/** Mix receipt shape emitted by PassThroughMixer per entity per tick. */
export interface MixReceipt {
  readonly frame: number;
  readonly entity: string;
  readonly volume: number;
  readonly pan: number;
}

/** Build a PassThroughMixer keyed to a frame index + receipt sink. */
export function PassThroughMixer(frameIndex: FrameSource, sink: (receipt: MixReceipt) => void): System {
  return defineSystem({
    name: 'PassThroughMixer',
    query: [AudioSourcePart, VolumePart, PanPart],
    reads: [],
    writes: [],
    execute: (entities, context) => {
      const frame = readFrame(frameIndex);
      for (const e of entities) {
        sink({
          frame,
          entity: e.id,
          volume: context.read(e, VolumePart),
          pan: context.read(e, PanPart),
        });
      }
    },
  });
}
