import { defineAdaptive } from 'liteship';

export const layout = defineAdaptive({
  boundary: {
    input: 'viewport.width',
    at: [[0, 'mobile'], [768, 'tablet'], [1280, 'desktop']],
  },
  style: {
    base: { properties: { display: 'grid', gap: '1rem', 'grid-template-columns': '1fr' } },
    states: {
      tablet: { properties: { 'grid-template-columns': 'repeat(2, 1fr)' } },
      desktop: { properties: { 'grid-template-columns': 'repeat(3, 1fr)' } },
    },
  },
});
