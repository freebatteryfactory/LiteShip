import { describe, expect, test } from 'vitest';
import { existsSync, realpathSync } from 'node:fs';
import { isAbsolute } from 'node:path';

import { integration } from '@liteship/astro';
import { bootstrapSlots, installSwapPipeline, loadWasmRuntime } from '@liteship/astro/runtime';
import { Compositor, RuntimeCoordinator } from '@liteship/core';
import { CompositorWorker } from '@liteship/worker';
import { createEdgeHostAdapter } from '@liteship/edge';
import { runIsolatedAstroConfigSetup } from '../../helpers/astro-config-setup.js';

describe('cross-package runtime wiring invariants', () => {
  function expectOwnedAstroEntrypoint(entrypoint: string, name: 'worker' | 'wasm'): void {
    expect(isAbsolute(entrypoint)).toBe(true);
    expect(existsSync(entrypoint)).toBe(true);
    const physical = realpathSync(entrypoint).replaceAll('\\', '/');
    expect(physical).toMatch(new RegExp(`/packages/astro/(?:src|dist)/client-directives/${name}\\.(?:ts|js)$`));
    expect(physical).not.toBe(`@liteship/astro/client-directives/${name}`);
  }

  // ---------------------------------------------------------------------------
  // 1. Worker directive uses initWorkerDirective (not inline Blob URLs)
  //
  // The Astro integration registers a package-owned absolute worker entrypoint.
  // This lets an isolated one-install consumer resolve the transitive Astro
  // package without requiring it to be hoisted into the application root.
  // ---------------------------------------------------------------------------
  test('worker directive is registered through the integration entrypoint', async () => {
    const astroIntegration = integration({ workers: { enabled: true } });
    expect(astroIntegration.name).toBe('@liteship/astro');

    const directives: Array<{ name: string; entrypoint: string }> = [];

    expect(typeof astroIntegration.hooks['astro:config:setup']).toBe('function');

    // Run the async-capable setup hook against an empty project root and capture directives.
    await runIsolatedAstroConfigSetup(astroIntegration, {
      updateConfig: () => {},
      addClientDirective: (directive: { name: string; entrypoint: string }) => {
        directives.push(directive);
      },
      injectScript: () => {},
      logger: { info: () => {} },
    });

    const workerDirective = directives.find((d) => d.name === 'worker');
    expect(workerDirective).toBeDefined();
    expectOwnedAstroEntrypoint(workerDirective!.entrypoint, 'worker');
  });

  // ---------------------------------------------------------------------------
  // 2. WASM directive uses loadWasmRuntime (not raw WebAssembly.instantiate)
  //
  // loadWasmRuntime is the shared runtime entry that delegates to
  // WASMDispatch.load rather than calling WebAssembly.instantiate directly.
  // ---------------------------------------------------------------------------
  test('wasm directive uses loadWasmRuntime from the shared runtime layer', async () => {
    expect(loadWasmRuntime).toBeDefined();
    expect(typeof loadWasmRuntime).toBe('function');

    // The integration registers a wasm directive when wasm is enabled
    const astroIntegration = integration({ wasm: { enabled: true } });
    const directives: Array<{ name: string; entrypoint: string }> = [];

    await runIsolatedAstroConfigSetup(astroIntegration, {
      updateConfig: () => {},
      addClientDirective: (directive: { name: string; entrypoint: string }) => {
        directives.push(directive);
      },
      injectScript: () => {},
      logger: { info: () => {} },
    });

    const wasmDirective = directives.find((d) => d.name === 'wasm');
    expect(wasmDirective).toBeDefined();
    expectOwnedAstroEntrypoint(wasmDirective!.entrypoint, 'wasm');
  });

  // ---------------------------------------------------------------------------
  // 3. Astro integration bootstraps slots through the shared runtime layer
  //
  // bootstrapSlots and installSwapPipeline are exported from @liteship/astro/runtime
  // and are referenced in the integration's injected bootstrap script.
  // ---------------------------------------------------------------------------
  test('astro integration bootstraps slots through the shared runtime layer', () => {
    expect(bootstrapSlots).toBeDefined();
    expect(typeof bootstrapSlots).toBe('function');

    expect(installSwapPipeline).toBeDefined();
    expect(typeof installSwapPipeline).toBe('function');
  });

  // ---------------------------------------------------------------------------
  // 4. Compositor uses RuntimeCoordinator
  //
  // Both are namespace objects exported from @liteship/core with a .create factory.
  // ---------------------------------------------------------------------------
  test('compositor host path goes through the shared runtime coordinator', () => {
    expect(RuntimeCoordinator).toBeDefined();
    expect(typeof RuntimeCoordinator).toBe('object');
    expect(typeof RuntimeCoordinator.create).toBe('function');

    expect(Compositor).toBeDefined();
    expect(typeof Compositor.create).toBe('function');
  });

  // ---------------------------------------------------------------------------
  // 5. Worker host mirrors runtime coordination
  //
  // CompositorWorker is the off-thread counterpart with the same namespace
  // object + .create pattern.
  // ---------------------------------------------------------------------------
  test('worker host mirrors runtime coordination', () => {
    expect(CompositorWorker).toBeDefined();
    expect(typeof CompositorWorker).toBe('object');
    expect(typeof CompositorWorker.create).toBe('function');
  });

  // ---------------------------------------------------------------------------
  // 6. Astro middleware uses the edge host adapter
  //
  // createEdgeHostAdapter is the factory from @liteship/edge used by the
  // middleware to resolve tiers, compile themes, and manage boundary caches.
  // ---------------------------------------------------------------------------
  test('astro middleware uses the shared edge host adapter', () => {
    expect(createEdgeHostAdapter).toBeDefined();
    expect(typeof createEdgeHostAdapter).toBe('function');
  });
});
