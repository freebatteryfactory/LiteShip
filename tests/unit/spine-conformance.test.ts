/**
 * Spine conformance — runtime existence + the type-level checks the relation gate
 * does NOT cover.
 *
 * WAVE 8.5 — THE PINS WERE ABSORBED. The type-by-type bidirectional `IsEqual` /
 * assignability MIRROR pins that used to live here (CompositeState, VideoConfig,
 * CaptureResult, CapSet, Codec, Config, Token/Theme/Style, and the
 * ~23 edge host types) are GONE — they are now derived MECHANICALLY over the complete
 * admitted set by the two-axis spine relation gate:
 *   - the gate + facts: `packages/gauntlet/src/gates/spine-relation.ts`
 *   - the ts.Program probe host: `packages/audit/src/spine-relation-build.ts`
 *   - the frozen admission table: `tests/fixtures/spine-relation-admissions.ts`
 *   - the RED-FIRST acceptance (green on the real spine; red on the three historical
 *     drift fixtures — CapSet Set→array, Millis brand loss, WGSL omission):
 *     `tests/unit/audit/spine-relation.test.ts`
 * The pins were absorbed only AFTER that gate went green over the three drift fixtures
 * (the S-conflict discipline — never delete a pin ahead of a green gate that subsumes
 * it). This closes Conflict-1 / S5.2. See ADR-0010 (spine as canonical type source)
 * and `docs/plan/convergence-constitution.md` §7.3–7.4.
 *
 * WHAT STAYS HERE, because the relation gate does NOT subsume it:
 *  1. Type-UTILITY / error-PORT asserts that are not a mirror↔runtime relation: the
 *     `Prettify` utility (no runtime twin) and the in-`Codec` `Result` / `ParseError`
 *     structural ports pinned against `@liteship/error` (the relation gate classifies the
 *     whole `Codec`, but these pin the exact error-port parity explicitly).
 *  2. Runtime-EXISTENCE checks — a relation gate over TYPES cannot prove a VALUE export
 *     EXISTS and is callable (`defineConfig`, `Boundary`, `resolvePrimitive`,
 *     `dispatch`), so those `describe` blocks are KEPT PERMANENTLY.
 */

import { describe, test, expect } from 'vitest';
import type * as SpineCore from '@liteship/_spine';
import * as CoreImpl from '@liteship/core';
import * as ViteImpl from '@liteship/vite';
import * as CompilerImpl from '@liteship/compiler';

// Runtime truth for the @liteship/core Codec error PORTS. The spine's structural
// `Codec.Result` / `Codec.ParseError` ports mirror `@liteship/error`'s `Result` /
// `ParseError` EXACTLY; the relation gate classifies the whole `Codec`, but this
// pins the error-port parity explicitly (a distinct concern from the mirror shape).
import type { Result as RtResult, ParseError as RtParseError } from '@liteship/error';

type IsEqual<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? (<T>() => T extends B ? 1 : 2) extends <T>() => T extends A ? 1 : 2
      ? true
      : false
    : false;
type Assert<T extends true> = T;

// The `Prettify` type utility (spine-owned, no runtime twin — not a mirror relation,
// so the relation gate does not cover it): merging an intersection collapses to a
// single flat object type.
type _prettifyCoverage = Assert<
  IsEqual<SpineCore.Prettify<{ readonly a: 1 } & { readonly b: 2 }>, { readonly a: 1; readonly b: 2 }>
>;
void (0 as unknown as _prettifyCoverage);

// The spine's structural Codec error ports mirror @liteship/error's Result/ParseError
// EXACTLY. These were the Effect-shed proof (the spine once declared Effect here); kept
// as an explicit error-port parity pin alongside the relation gate's whole-shape check.
type _codecResultParity = Assert<IsEqual<SpineCore.Codec.Result<1, 2>, RtResult<1, 2>>>;
type _codecParseErrorParity = Assert<IsEqual<SpineCore.Codec.ParseError, RtParseError>>;
void (0 as unknown as _codecResultParity);
void (0 as unknown as _codecParseErrorParity);

// Factory runtime values satisfy the spine (a VALUE-satisfies-spine check via the
// package index — the relation gate classifies TYPES, not that a factory's OUTPUT is
// assignable to the spine surface): `defineConfig` / `defineConfig` outputs are
// assignable to the spine `Config`.
const _coreConfig: SpineCore.Config = CoreImpl.defineConfig({});
const _plugin: ReturnType<typeof CoreImpl.defineConfig> = CoreImpl.defineConfig({});
void _coreConfig;
void _plugin;

// ─────────────────────────────────────────────────────────────────────────────
// Runtime existence checks — a relation gate over TYPES cannot prove a VALUE export
// EXISTS and is callable, so these stay here permanently.
// ─────────────────────────────────────────────────────────────────────────────

describe('spine conformance — @liteship/core', () => {
  test('defineConfig exported and callable', () => {
    expect(typeof CoreImpl.defineConfig).toBe('function');
    const cfg = CoreImpl.defineConfig({});
    expect(cfg._tag).toBe('ConfigDef');
    expect(cfg.id).toMatch(/^fnv1a:/);
  });

  test('Config.toViteConfig exported and callable', () => {
    expect(typeof CoreImpl.Config.toViteConfig).toBe('function');
    const cfg = CoreImpl.defineConfig({});
    expect(CoreImpl.Config.toViteConfig(cfg)).toBeDefined();
  });

  test('defineConfig exported and callable', () => {
    expect(typeof CoreImpl.defineConfig).toBe('function');
  });

  test('Boundary exported from @liteship/core (regression guard)', () => {
    expect(typeof CoreImpl.defineBoundary).toBe('function');
  });
});

describe('spine conformance — @liteship/vite', () => {
  test('resolvePrimitive exported and callable', () => {
    expect(typeof ViteImpl.resolvePrimitive).toBe('function');
  });

  test('plugin exported and callable', () => {
    expect(typeof ViteImpl.plugin).toBe('function');
  });
});

describe('spine conformance — @liteship/compiler', () => {
  test('dispatch exported and callable', () => {
    expect(typeof CompilerImpl.dispatch).toBe('function');
  });
});
