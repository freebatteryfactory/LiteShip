/**
 * Browser global mocks for testing device detection.
 *
 * Provides mockNavigator, mockMatchMedia, and mockWebGL
 * for testing packages/detect without a real browser.
 *
 * Production contracts mirrored here:
 * - navigator capability reads in packages/detect/src/detect.ts
 * - matchMedia listener semantics used by runtime detection/bootstrap code
 * - canvas.getContext('webgl'|'webgl2') probing used by GPU/detect paths
 *
 * The connection override is typed against {@link NavigatorConnectionInfo} —
 * the structural shape @czap/detect's connection probe actually reads — so
 * probe/double drift breaks the build.
 */
import type { NavigatorConnectionInfo } from '../../packages/detect/src/detect.js';

// ---------------------------------------------------------------------------
// Navigator mock
// ---------------------------------------------------------------------------

export interface NavigatorOverrides {
  hardwareConcurrency?: number;
  deviceMemory?: number;
  maxTouchPoints?: number;
  gpu?: boolean;
  connection?: Partial<NavigatorConnectionInfo>;
}

/**
 * Install a mock navigator and return a cleanup function.
 */
export function mockNavigator(overrides: NavigatorOverrides = {}): () => void {
  const original = globalThis.navigator;
  const mock = {
    hardwareConcurrency: overrides.hardwareConcurrency ?? 4,
    deviceMemory: overrides.deviceMemory ?? 8,
    maxTouchPoints: overrides.maxTouchPoints ?? 0,
    gpu: overrides.gpu ? {} : undefined,
    connection: overrides.connection
      ? ({
          effectiveType: overrides.connection.effectiveType ?? '4g',
          downlink: overrides.connection.downlink ?? 10,
          saveData: overrides.connection.saveData ?? false,
        } satisfies NavigatorConnectionInfo)
      : undefined,
    userAgent: 'MockBrowser/1.0',
  };

  Object.defineProperty(globalThis, 'navigator', {
    value: mock,
    writable: true,
    configurable: true,
  });

  return () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: original,
      writable: true,
      configurable: true,
    });
  };
}

// ---------------------------------------------------------------------------
// matchMedia mock
// ---------------------------------------------------------------------------

export interface MockMediaQueryList {
  readonly media: string;
  matches: boolean;
  addEventListener(type: string, cb: (e: { matches: boolean }) => void): void;
  removeEventListener(type: string, cb: (e: { matches: boolean }) => void): void;
  /** Test-only: change matches and fire listeners. */
  _setMatches(val: boolean): void;
}

// Deliberately NOT intersected with `typeof globalThis`: these mocks install
// subset doubles into the global slots, and the lib.dom declarations would
// otherwise demand the full interfaces. This alias is the seam where the
// double meets the ambient global.
type RuntimeBrowserGlobals = {
  matchMedia?: (query: string) => MockMediaQueryList;
  document?: { createElement?: (tag: string) => unknown };
  innerWidth?: number;
  innerHeight?: number;
  devicePixelRatio?: number;
};

/**
 * Install a mock matchMedia and return a cleanup function.
 *
 * @param defaults - Map from media query string to initial `matches` value.
 */
export function mockMatchMedia(defaults: Record<string, boolean> = {}): () => void {
  const runtime = globalThis as unknown as RuntimeBrowserGlobals;
  const original = runtime.matchMedia;
  const queries = new Map<string, MockMediaQueryList>();

  runtime.matchMedia = (query: string): MockMediaQueryList => {
    const existing = queries.get(query);
    if (existing) return existing;

    const listeners = new Set<(e: { matches: boolean }) => void>();
    const mql: MockMediaQueryList = {
      media: query,
      matches: defaults[query] ?? false,
      addEventListener(_type: string, cb: (e: { matches: boolean }) => void) {
        listeners.add(cb);
      },
      removeEventListener(_type: string, cb: (e: { matches: boolean }) => void) {
        listeners.delete(cb);
      },
      _setMatches(val: boolean) {
        mql.matches = val;
        for (const cb of listeners) cb({ matches: val });
      },
    };

    queries.set(query, mql);
    return mql;
  };

  return () => {
    runtime.matchMedia = original;
  };
}

// ---------------------------------------------------------------------------
// WebGL mock
// ---------------------------------------------------------------------------

/**
 * Install a mock WebGL context that returns a configurable renderer string.
 * Returns a cleanup function.
 */
export function mockWebGL(renderer = 'ANGLE (NVIDIA GeForce GTX 1060)'): () => void {
  const RENDERER = 0x1f01;
  const UNMASKED_RENDERER_WEBGL = 0x9246;

  const runtime = globalThis as unknown as RuntimeBrowserGlobals;
  const original = runtime.document;

  const mockContext = {
    getParameter(pname: number): string | null {
      if (pname === RENDERER || pname === UNMASKED_RENDERER_WEBGL) {
        return renderer;
      }
      return null;
    },
    getExtension(name: string): object | null {
      if (name === 'WEBGL_debug_renderer_info') {
        return { UNMASKED_RENDERER_WEBGL };
      }
      return null;
    },
  };

  // Minimal document mock
  if (typeof runtime.document === 'undefined') {
    runtime.document = {};
  }

  const origCreateElement = runtime.document.createElement;

  runtime.document.createElement = (tag: string) => {
    if (tag === 'canvas') {
      return {
        getContext(type: string) {
          if (type === 'webgl' || type === 'webgl2') return mockContext;
          return null;
        },
      };
    }
    return origCreateElement?.call(runtime.document, tag);
  };

  return () => {
    if (origCreateElement) {
      runtime.document!.createElement = origCreateElement;
    } else if (original === undefined) {
      delete runtime.document;
    }
  };
}

// ---------------------------------------------------------------------------
// Window mock helpers
// ---------------------------------------------------------------------------

/**
 * Install mock window dimensions and return a cleanup function.
 */
export function mockViewport(width = 1920, height = 1080, devicePixelRatio = 1): () => void {
  const runtime = globalThis as unknown as RuntimeBrowserGlobals;
  const origW = runtime.innerWidth;
  const origH = runtime.innerHeight;
  const origDpr = runtime.devicePixelRatio;

  runtime.innerWidth = width;
  runtime.innerHeight = height;
  runtime.devicePixelRatio = devicePixelRatio;

  return () => {
    runtime.innerWidth = origW;
    runtime.innerHeight = origH;
    runtime.devicePixelRatio = origDpr;
  };
}
