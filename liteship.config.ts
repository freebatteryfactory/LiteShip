/**
 * liteship.config.ts — unified project configuration hub.
 *
 * Define boundaries, tokens, themes, and styles here.
 * This config is picked up by @liteship/vite and @liteship/astro automatically.
 */
import { defineConfig, Boundary } from '@liteship/core';

const viewport = Boundary.make({
  input: 'viewport.width',
  at: [
    [0,    'mobile'],
    [768,  'tablet'],
    [1280, 'desktop'],
  ] as const,
});

export default defineConfig({
  boundaries: { viewport },
  tokens:     {},
  themes:     {},
  styles:     {},
  vite: {
    hmr: true,
  },
});
