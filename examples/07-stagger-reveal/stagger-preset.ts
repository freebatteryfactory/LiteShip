/**
 * Stagger reveal preset — committed as data for the #124 dogfood vertical slice.
 *
 * @module
 */

import { Stagger } from '@czap/core';

/** List reveal stagger preset used by examples/07-stagger-reveal and its compile test. */
export const staggerRevealPreset = Stagger.intent({
  trigger: { type: 'view', range: ['entry 0%', 'cover 50%'] },
  children: [
    { target: 'item-0', from: { opacity: 0, translateY: '16px' }, to: { opacity: 1, translateY: '0px' } },
    { target: 'item-1', from: { opacity: 0, translateY: '16px' }, to: { opacity: 1, translateY: '0px' } },
    { target: 'item-2', from: { opacity: 0, translateY: '16px' }, to: { opacity: 1, translateY: '0px' } },
  ],
  stepMs: 80,
  transition: { durationMs: 300, easing: 'ease' },
  policy: { reducedMotion: 'settle', motionTier: 'transitions' },
});
