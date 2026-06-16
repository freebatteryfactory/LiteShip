// @vitest-environment jsdom
/**
 * `czap({ exclude: [...] })` — route scope guard.
 *
 * Astro's `injectScript` is global (no build-time route filter), so czap's
 * head/page scripts land on every page — including a Starlight `/docs/**`
 * sub-app that never consumes czap, where the GPU probe runs for nothing
 * (the dogfood finding). The fix is a runtime guard: a head-inline script,
 * injected FIRST, sets `window.__CZAP_OFF__` from `location.pathname`, and every
 * czap script short-circuits on it. This proves the guard is wired ahead of the
 * other scripts, that they carry the short-circuit, that it's absent when no
 * routes are excluded, and that the matcher excludes the right paths (and only
 * those — `/documentation` must NOT match `/docs/**`).
 *
 * @module
 */
import { afterEach, describe, expect, test, vi } from 'vitest';
import { integration } from '@czap/astro';

interface Injected {
  readonly stage: string;
  readonly content: string;
}

function runSetup(config?: Parameters<typeof integration>[0], command = 'dev'): Injected[] {
  const scripts: Injected[] = [];
  integration(config).hooks['astro:config:setup']!({
    command,
    updateConfig: () => {},
    addClientDirective: () => {},
    injectScript: (stage: string, content: string) => void scripts.push({ stage, content }),
    logger: { info: () => {} },
  } as never);
  return scripts;
}

/** Run a captured guard script with a stubbed pathname; return the resulting flag. */
function guardFlagFor(guard: string, pathname: string): boolean {
  vi.stubGlobal('location', { pathname });
  (window as unknown as { __CZAP_OFF__?: boolean }).__CZAP_OFF__ = undefined;
  new Function(guard)();
  return (window as unknown as { __CZAP_OFF__?: boolean }).__CZAP_OFF__ === true;
}

describe('czap({ exclude }) route scope guard', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    (window as unknown as { __CZAP_OFF__?: boolean }).__CZAP_OFF__ = undefined;
  });

  test('injects the guard FIRST (head-inline, before the detect script)', () => {
    const scripts = runSetup({ exclude: ['/docs/**'] });
    const guardIdx = scripts.findIndex((s) => s.stage === 'head-inline' && s.content.includes('window.__CZAP_OFF__'));
    const detectIdx = scripts.findIndex((s) => s.stage === 'head-inline' && s.content.includes('__CZAP_DETECT__'));
    expect(guardIdx, 'guard must be injected').toBeGreaterThanOrEqual(0);
    expect(detectIdx, 'detect must be injected').toBeGreaterThanOrEqual(0);
    expect(guardIdx, 'guard must come before detect so the flag is set in time').toBeLessThan(detectIdx);
  });

  test('every czap script short-circuits on the flag', () => {
    const scripts = runSetup({ exclude: ['/docs/**'], wasm: { enabled: true } }, 'dev');
    // detect inline + GPU probe early-return; bootstrap/wasm/inspector gate their effects.
    const detect = scripts.find((s) => s.content.includes('__CZAP_DETECT__') && s.content.includes('provisional'));
    const probe = scripts.find((s) => s.content.includes('gpuTier'));
    const bootstrap = scripts.find((s) => s.content.includes('bootstrapSlots'));
    const wasm = scripts.find((s) => s.content.includes('configureWasmRuntime'));
    const inspector = scripts.find((s) => s.content.includes('installInspectorLoader'));
    expect(detect?.content).toContain('if (window.__CZAP_OFF__) return;');
    expect(probe?.content).toContain('if (window.__CZAP_OFF__) return;');
    expect(wasm?.content).toContain('if (!window.__CZAP_OFF__)');
    expect(inspector?.content).toContain('if (!window.__CZAP_OFF__)');
    // Bootstrap: the initial slot/directive activation is guarded, but policy +
    // swap machinery (installSwapReinit) register UNCONDITIONALLY so a later
    // View Transition to an included route can re-activate after an excluded landing.
    const b = bootstrap!.content;
    expect(b).toContain('if (!window.__CZAP_OFF__)');
    // Paren forms target the CALLS, not the import line. Policy call before the
    // guard, swap-machinery call after it (both unconditional).
    expect(b.indexOf('configureRuntimePolicy(')).toBeLessThan(b.indexOf('if (!window.__CZAP_OFF__)'));
    expect(b.indexOf('installSwapReinit()')).toBeGreaterThan(b.indexOf('if (!window.__CZAP_OFF__)'));
  });

  test('NO guard is injected when no routes are excluded (zero overhead default)', () => {
    // Other scripts always READ the flag (harmless `if (window.__CZAP_OFF__)`);
    // only the guard ASSIGNS it. With no exclude, the guard isn't injected.
    const scripts = runSetup();
    expect(scripts.some((s) => s.content.includes('window.__CZAP_OFF__ = off'))).toBe(false);
  });

  test('the flag is never sticky — re-evaluates on View Transition swaps', () => {
    const [guard] = runSetup({ exclude: ['/docs/**'] })
      .filter((s) => s.stage === 'head-inline' && s.content.includes('window.__CZAP_OFF__'))
      .map((s) => s.content);
    expect(guard).toBeDefined();

    // Land on an excluded path → off. Then swap to an included one → must clear.
    vi.stubGlobal('location', { pathname: '/docs/x' });
    (window as unknown as { __CZAP_OFF__?: boolean }).__CZAP_OFF__ = undefined;
    new Function(guard!)();
    expect((window as unknown as { __CZAP_OFF__?: boolean }).__CZAP_OFF__).toBe(true);

    vi.stubGlobal('location', { pathname: '/' });
    document.dispatchEvent(new Event('astro:after-swap'));
    expect((window as unknown as { __CZAP_OFF__?: boolean }).__CZAP_OFF__).toBe(false);
  });

  test('the guard matches excluded paths — and ONLY those', () => {
    const [guard] = runSetup({ exclude: ['/docs/**', '/blog'] })
      .filter((s) => s.stage === 'head-inline' && s.content.includes('window.__CZAP_OFF__'))
      .map((s) => s.content);
    expect(guard).toBeDefined();

    expect(guardFlagFor(guard!, '/docs/liteship/overview')).toBe(true); // under /docs/**
    expect(guardFlagFor(guard!, '/docs')).toBe(true); // bare /docs matches /docs/**
    expect(guardFlagFor(guard!, '/blog')).toBe(true); // exact
    expect(guardFlagFor(guard!, '/')).toBe(false); // marketing root — czap runs
    expect(guardFlagFor(guard!, '/documentation')).toBe(false); // NOT under /docs/** (prefix-safe)
    expect(guardFlagFor(guard!, '/blog/post')).toBe(false); // exact /blog only, not children
  });
});
