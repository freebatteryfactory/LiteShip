/**
 * REGRESSION GUARD — the `mintValidated` subpath leak (lesson #12: the
 * RUNG_TARGETS-style `./*` wildcard subpath leak).
 *
 * THE LOAD-BEARING SECURITY PROPERTY of the AI-cast envelope: a `ValidatedProposal`
 * is the ONLY artifact a host's apply/admission layer acts on, and the ONLY way to
 * construct one is {@link mintValidated}, which lives in `validated-output.ts` and is
 * the sole holder of the module-private `ApplyToken` witness. `mintValidated` is
 * DELIBERATELY not re-exported from the package index, so no consumer can forge a
 * proposal and bypass validation.
 *
 * THE ORIGINAL SCAR: `@czap/core`'s `package.json` `exports` once carried a `"./*"`
 * wildcard, which — absent an explicit deny — made EVERY `src/*.ts` module importable
 * as a subpath (`@czap/core/validated-output`), re-exposing `mintValidated` to any
 * consumer and defeating the whole envelope.
 *
 * THE LAYOUT-LOCK: the wildcard is now GONE. The `exports` map is a CLOSED allowlist —
 * only `.`, `./testing`, and `./harness` are importable; no internal module leaks as a
 * public subpath, so the layout can be refactored freely. The `"./validated-output":
 * null` deny is retained as belt-and-suspenders (Node honors `null` to deny a subpath;
 * internal relative imports `./validated-output.js` are unaffected).
 *
 * This guard pins EVERY half so the leak cannot silently return:
 *  1. the `exports` map carries NO wildcard key (nothing containing `*`);
 *  2. the ONLY deep-subpath exports are the sanctioned allowlist (`./testing`,
 *     `./harness`, `./simulation`) — a new internal subpath cannot be added without
 *     a reviewer amending this LAW;
 *  3. the package-manifest deny entry for `./validated-output` survives;
 *  4. `mintValidated` is absent from the public `@czap/core` surface;
 *  5. the index re-exports the SAFE consumer symbols (the envelope is usable without
 *     the minter).
 *
 * @module
 */
import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import * as Core from '@czap/core';

const here = dirname(fileURLToPath(import.meta.url));
// tests/unit/meta → repo root is three up.
const repoRoot = resolve(here, '../../..');
const corePkgPath = resolve(repoRoot, 'packages/core/package.json');

describe('REGRESSION GUARD: the mintValidated subpath leak (lesson #12)', () => {
  test('package.json exports map carries NO wildcard key (the layout is locked)', () => {
    const pkg = JSON.parse(readFileSync(corePkgPath, 'utf8')) as {
      exports: Record<string, unknown>;
    };
    const keys = Object.keys(pkg.exports);

    // A `"./*"` (or any `*`-bearing) key would re-expose EVERY `src/*.ts` module as a
    // public subpath, leaking the internal layout and re-arming the mintValidated leak.
    const wildcardKeys = keys.filter((k) => k.includes('*'));
    expect(wildcardKeys).toEqual([]);
  });

  test('the ONLY deep-subpath exports are the sanctioned allowlist (./testing, ./harness, ./simulation)', () => {
    const pkg = JSON.parse(readFileSync(corePkgPath, 'utf8')) as {
      exports: Record<string, unknown>;
    };
    const keys = Object.keys(pkg.exports);

    // Every importable deep subpath (a key past the bare `.` root) must be on the
    // allowlist. `./validated-output` maps to `null` — a DENY, not an export — so it is
    // not importable and is excluded. Adding a new internal subpath must require a
    // reviewer to amend THIS list, which is the layout-lock LAW.
    const ALLOWED_SUBPATHS = ['./testing', './harness', './simulation'];
    const importableSubpaths = keys.filter(
      (k) => k !== '.' && pkg.exports[k] !== null,
    );
    expect(importableSubpaths.sort()).toEqual([...ALLOWED_SUBPATHS].sort());
  });

  test('package.json retains the ./validated-output deny (belt-and-suspenders)', () => {
    const pkg = JSON.parse(readFileSync(corePkgPath, 'utf8')) as {
      exports: Record<string, unknown>;
    };
    // The sensitive internal stays explicitly denied (Node honors `null`) even though
    // the wildcard is gone — defense in depth against a future wildcard re-introduction.
    expect(pkg.exports['./validated-output']).toBeNull();
  });

  test('mintValidated is NOT on the public @czap/core surface (the sole mint site stays private)', () => {
    // The forger function must not be reachable through the package index by any
    // name — surfacing it would let a consumer mint a ValidatedProposal without
    // running a validator.
    expect('mintValidated' in Core).toBe(false);
    expect((Core as Record<string, unknown>)['mintValidated']).toBeUndefined();
  });

  test('the SAFE envelope symbols ARE exported (the envelope is usable without the minter)', () => {
    // Consumers get the binding guard + accessors, never the minter — proving the
    // deny does not over-rotate and hide the public surface.
    expect(typeof (Core as Record<string, unknown>)['assertTokenBinds']).toBe('function');
    expect(typeof (Core as Record<string, unknown>)['unwrapValidated']).toBe('function');
    expect(typeof (Core as Record<string, unknown>)['proposalSubject']).toBe('function');
    expect(typeof (Core as Record<string, unknown>)['proposalReceiptSubject']).toBe('function');
  });

  test('the validated-output source DOES export mintValidated (deny is the ONLY barrier — keep it)', () => {
    // mintValidated must remain in validated-output.ts (only it holds the private
    // witness): if a refactor relocated/removed it, the deny entry would be guarding
    // nothing and a reviewer should re-confirm the envelope still has one mint site.
    const src = readFileSync(resolve(repoRoot, 'packages/core/src/validated-output.ts'), 'utf8');
    expect(src).toMatch(/export function mintValidated\b/);
  });
});
