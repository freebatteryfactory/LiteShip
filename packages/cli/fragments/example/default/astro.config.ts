import { defineConfig } from 'astro/config';
import { liteship } from 'liteship/astro';

export default defineConfig({
  integrations: [liteship({ detect: true })],
});
