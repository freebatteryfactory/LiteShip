/**
 * liteship.config.ts — unified project configuration hub.
 *
 * Define boundaries, tokens, themes, and styles here. Picked up automatically by
 * liteship/astro (and liteship/vite). Its presence also marks this directory as a
 * LiteShip consumer app for `liteship build` and `liteship check`.
 */
import { defineConfig } from 'liteship';
import { layout } from './src/adaptive.js';

export default defineConfig({
  boundaries: { layout: layout.boundary },
  styles: { layout: layout.style },
  vite: {
    hmr: true,
  },
});
