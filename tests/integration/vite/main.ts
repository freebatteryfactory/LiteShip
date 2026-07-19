/**
 * Minimal entry point that imports @liteship/core to prove the vite plugin
 * can process a project that depends on liteship packages.
 */
import { Boundary } from '@liteship/core';

const boundary = Boundary.make({
  input: 'container-width',
  at: [
    [0, 'compact'],
    [481, 'full'],
  ],
});

document.getElementById('app')!.textContent = `liteship boundary: ${boundary.states.join(', ')}`;
console.log('[liteship-vite-test] boundary loaded:', boundary.states);
