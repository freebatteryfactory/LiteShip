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
 * THE SCAR: `@czap/core`'s `package.json` `exports` carries a `"./*"` wildcard, which
 * — absent an explicit deny — would make EVERY `src/*.ts` module importable as a
 * subpath (`@czap/core/validated-output`), re-exposing `mintValidated` to any consumer
 * and defeating the whole envelope. The fix is a `"./validated-output": null` deny
 * ENTRY ordered BEFORE the wildcard (Node honors `null` to deny a subpath; internal
 * relative imports `./validated-output.js` are unaffected).
 *
 * This guard pins BOTH halves so the leak cannot silently return:
 *  1. the package-manifest deny entry exists and precedes the `"./*"` wildcard;
 *  2. `mintValidated` is absent from the public `@czap/core` surface;
 *  3. the index re-exports the SAFE consumer symbols (the envelope is usable without
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
  test('package.json denies the ./validated-output subpath BEFORE the ./* wildcard', () => {
    const pkg = JSON.parse(readFileSync(corePkgPath, 'utf8')) as {
      exports: Record<string, unknown>;
    };
    const keys = Object.keys(pkg.exports);

    // The sensitive internal must be explicitly denied (Node honors `null`).
    expect(pkg.exports['./validated-output']).toBeNull();

    // Order matters: a deny entry AFTER the wildcard would never be reached.
    const denyIdx = keys.indexOf('./validated-output');
    const wildcardIdx = keys.indexOf('./*');
    expect(denyIdx).toBeGreaterThanOrEqual(0);
    expect(wildcardIdx).toBeGreaterThanOrEqual(0);
    expect(denyIdx).toBeLessThan(wildcardIdx);
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
