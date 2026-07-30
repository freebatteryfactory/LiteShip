// @vitest-environment jsdom
/**
 * Directive boot scheduling (issue #155) — the three structural laws that
 * fragment the former single synchronous boot frame:
 *
 *  1. ONE DOM traversal per scan (the O(directives × document) re-walks are dead).
 *  2. The main thread YIELDS between eager directive batches.
 *  3. Non-visual directives (llm, graph) boot at the IDLE deadline, strictly
 *     after every eager directive — and still complete before the scan resolves.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Diagnostics } from '@liteship/core';
import { DIRECTIVE_BOOT_PRIORITY, scanAndBootDirectives } from '../../../packages/astro/src/runtime/directive-boot.js';
import { DIRECTIVE_NAMES } from '../../../packages/astro/src/runtime/directive-bound.js';
import type { DirectiveName } from '../../../packages/astro/src/runtime/directive-bound.js';

type MutableGlobal = {
  scheduler?: { yield?: () => Promise<void> };
  requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
};

const globalHost = globalThis as MutableGlobal;
const savedScheduler = globalHost.scheduler;
const savedIdle = globalHost.requestIdleCallback;

afterEach(() => {
  globalHost.scheduler = savedScheduler;
  globalHost.requestIdleCallback = savedIdle;
  Diagnostics.reset();
  document.body.innerHTML = '';
});

beforeEach(() => {
  document.body.innerHTML = '';
});

/** A page carrying one marked element per directive name. */
const markAll = (names: readonly DirectiveName[]): void => {
  for (const name of names) {
    const element = document.createElement('div');
    element.setAttribute('data-liteship-directive', name);
    document.body.append(element);
  }
};

/** Scripted loaders that record boot order — no client-directive modules load. */
const recordingLoaders = (booted: string[]) =>
  Object.fromEntries(
    DIRECTIVE_NAMES.map((name) => [
      name,
      () =>
        Promise.resolve({
          default: () => {
            booted.push(name);
          },
        }),
    ]),
  );

describe('directive boot scheduling (#155)', () => {
  it('scans the DOM in exactly ONE traversal regardless of directive count', async () => {
    markAll([...DIRECTIVE_NAMES]);
    const root = document.body;
    const realQuery = root.querySelectorAll.bind(root);
    let starQueries = 0;
    let totalQueries = 0;
    (root as { querySelectorAll: typeof root.querySelectorAll }).querySelectorAll = ((selector: string) => {
      totalQueries += 1;
      if (selector === '*') starQueries += 1;
      return realQuery(selector);
    }) as typeof root.querySelectorAll;

    globalHost.scheduler = { yield: () => Promise.resolve() };
    globalHost.requestIdleCallback = (callback) => {
      callback();
      return 1;
    };
    await scanAndBootDirectives([...DIRECTIVE_NAMES], root, recordingLoaders([]));

    // One '*' walk feeds the diagnostics pass AND every directive bucket. Any
    // regression back to per-directive or per-attribute re-walks fails here.
    expect(starQueries).toBe(1);
    expect(totalQueries).toBe(1);
  });

  it('yields between eager batches (each directive activation is its own task)', async () => {
    const eagerNames = DIRECTIVE_NAMES.filter((name) => DIRECTIVE_BOOT_PRIORITY[name] === 'eager');
    markAll(eagerNames);
    let yields = 0;
    globalHost.scheduler = {
      yield: () => {
        yields += 1;
        return Promise.resolve();
      },
    };
    await scanAndBootDirectives(eagerNames, document.body, recordingLoaders([]));
    expect(yields).toBe(eagerNames.length - 1);
  });

  it('llm is IDLE class; every paint-affecting directive — INCLUDING graph — is eager', () => {
    expect(DIRECTIVE_BOOT_PRIORITY.llm).toBe('idle');
    // graph seeds visual state (applyBoundaryState writes data-liteship-state +
    // per-state CSS at boot), so idle-deferring it was a first-paint regression
    // (PR #189 review, confirmed).
    for (const name of ['adaptive', 'stream', 'gpu', 'graph', 'motion', 'svg', 'wasm', 'worker'] as const) {
      expect(DIRECTIVE_BOOT_PRIORITY[name], `${name} must stay eager`).toBe('eager');
    }
  });

  it('idle directives boot ONLY after the idle deadline, strictly after every eager batch — and the scan still resolves fully booted', async () => {
    markAll([...DIRECTIVE_NAMES]);
    const booted: string[] = [];
    globalHost.scheduler = { yield: () => Promise.resolve() };
    let idleCallback: (() => void) | undefined;
    globalHost.requestIdleCallback = (callback) => {
      idleCallback = callback;
      return 1;
    };

    const scan = scanAndBootDirectives([...DIRECTIVE_NAMES], document.body, recordingLoaders(booted));

    // Drain the eager pass (loader promises are microtasks under the stubbed yield).
    for (let hop = 0; hop < 20; hop += 1) await Promise.resolve();
    const eagerNames = DIRECTIVE_NAMES.filter((name) => DIRECTIVE_BOOT_PRIORITY[name] === 'eager');
    expect(booted).toEqual([...eagerNames]);
    expect(booted).not.toContain('llm');
    expect(idleCallback, 'the idle pass must be parked on requestIdleCallback').toBeDefined();

    idleCallback!();
    await scan;
    expect(booted).toEqual([...eagerNames, 'llm']);
  });

  it('the idle deadline carries a bounded timeout so a starved rIC cannot hang the scan (PR #189 review)', async () => {
    // The defect class: requestIdleCallback without { timeout } may never fire
    // on a busy or throttled page — idle directives never activate and the
    // scan promise never resolves. The law: the host is always told to force
    // the callback after a bounded delay.
    markAll([...DIRECTIVE_NAMES]);
    let receivedTimeout: number | undefined;
    globalHost.scheduler = { yield: () => Promise.resolve() };
    globalHost.requestIdleCallback = (callback, options) => {
      receivedTimeout = options?.timeout;
      callback();
      return 1;
    };
    await scanAndBootDirectives([...DIRECTIVE_NAMES], document.body, recordingLoaders([]));
    expect(receivedTimeout).toBeTypeOf('number');
    expect(receivedTimeout!).toBeGreaterThan(0);
    expect(receivedTimeout!).toBeLessThanOrEqual(10_000);
  });

  it('a root detached while the scan is parked on the idle deadline does NOT boot (PR #189 review)', async () => {
    // The defect class: an Astro navigation replaces the document while an
    // unawaited scan is parked on rIC; releasing the idle callback then booted
    // the captured, detached roots — recreating listeners and runtime
    // resources outside the next lifecycle's teardown.
    markAll([...DIRECTIVE_NAMES]);
    const booted: string[] = [];
    globalHost.scheduler = { yield: () => Promise.resolve() };
    let idleCallback: (() => void) | undefined;
    globalHost.requestIdleCallback = (callback) => {
      idleCallback = callback;
      return 1;
    };

    const scan = scanAndBootDirectives([...DIRECTIVE_NAMES], document.body, recordingLoaders(booted));
    for (let hop = 0; hop < 20; hop += 1) await Promise.resolve();
    expect(idleCallback).toBeDefined();

    // Navigation: the document body is replaced while llm is still parked.
    document.body.innerHTML = '';

    idleCallback!();
    await scan;
    expect(booted).not.toContain('llm');
  });
});
