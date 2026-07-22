import { defineStyle } from 'liteship';
import { layout } from '../boundaries/layout.boundaries.js';

// A style maps the layout boundary's STATES to per-state CSS OUTPUTS — the second
// half of the author model: states -> outputs. The `base` layer always applies;
// each state overrides it. The `@style card {}` block in src/pages/index.astro
// compiles this to `.liteship-card` CSS at build time (no runtime class toggling).
export const card = defineStyle({
  boundary: layout,
  base: {
    properties: {
      padding: 'var(--liteship-spacing-md)',
      border: '1px solid currentColor',
      'border-radius': '0.5rem',
    },
  },
  states: {
    mobile: { properties: { padding: 'var(--liteship-spacing-sm)' } },
    desktop: { properties: { padding: 'var(--liteship-spacing-lg)' } },
  },
});
