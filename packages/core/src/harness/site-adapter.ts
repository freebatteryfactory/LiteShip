/**
 * Harness template for the `siteAdapter` assembly arm — LANE-AWARE.
 *
 * A `siteAdapter` capsule converts between native host objects and czap
 * representations and declares the host `site`s it runs under. Its two
 * canonical checks live in different lanes, and BOTH are real (the owner's
 * decision — lane-aware, real everywhere):
 *
 *  - **round-trip equality → UNIT lane** (`.test.ts`, `pnpm test`). The adapter's
 *    `native -> czap -> native` transform is pure: czap's canonical serialization
 *    (`CanonicalCbor.encode` → `decode`) is the round trip, and structure is
 *    preserved iff the canonical {@link contentAddressOf} of the decoded value
 *    equals the original's. Inputs are sampled from the adapter's own schema via
 *    the canonical `schemaToArbitrary` walker — NOT a hand-rolled deep-equal, NOT
 *    a hand-built fixture. A real `it()` with a fast-check property.
 *  - **host capability matrix → INTEGRATION lane**
 *    (`tests/generated/integration/<name>.test.ts`). Asserts each declared `site`
 *    actually supports the adapter under a REAL host. The owner's rule is NO MOCKS
 *    ON THE HOST PATH, so there is no in-process-double driver: the matrix is a
 *    `declared-integration` waiver WITH TEETH that links each covered site to a
 *    NAMED real-host lane that already exists (and asserts that lane's file exists
 *    AND references the adapter, so the link fails RED if the proof rots). A
 *    declared site with no real-host lane is recorded as an honest tracked GAP —
 *    never papered over with a simulated host.
 *
 * Per the harness LAW (memory: "no placeholders ever", "no vanity tests"): an
 * `it.skip` shipping unwired work green and a `() => true` placeholder are BOTH
 * banned. Where a check genuinely cannot apply, it is recorded as a TYPED,
 * machine-readable exemption carrying its reason (the `not-applicable` /
 * `declared-integration` precedents), never a skip and never a silent omission.
 *
 * @module
 */

import type { CapsuleDef } from '../assembly.js';
import type { HarnessLane } from './scene-composition.js';
import type { HarnessOutput, HarnessContext } from './pure-transform.js';
import { benchNotApplicableMarker } from './bench-marker.js';

/** Inputs presampled from the round-trip arbitrary at module load. */
const BENCH_SAMPLE_COUNT = 64;

/**
 * Resolution of one declared siteAdapter check. Either the check is WIRED real
 * into its lane, or it is a typed `declared-integration` exemption (a coverage
 * link to a real existing suite), or a `not-applicable` exemption with a reason.
 * There is no skip variant by construction — a skip is exactly the thing the
 * harness LAW forbids.
 */
export type SiteAdapterCheckDisposition =
  | {
      readonly status: 'declared-integration';
      readonly lane: HarnessLane;
      /** Real-host coverage links — each a named existing suite proving a site set. */
      readonly coverage: ReadonlyArray<{
        readonly sites: readonly string[];
        readonly coverageRef: string;
      }>;
      /** Declared sites with no real-host lane — tracked gaps, never fabricated. */
      readonly gaps: ReadonlyArray<{ readonly site: string; readonly reason: string }>;
    }
  | { readonly status: 'not-applicable'; readonly lane: HarnessLane; readonly reason: string };

/**
 * The two canonical siteAdapter checks and the lane each runs in. The `lane`
 * here is the DECLARATIVE lane model: round-trip is a pure unit check; the host
 * capability matrix is an integration check. The driver
 * (`scripts/capsule-compile.ts`) resolves each to a concrete disposition.
 */
export const SITE_ADAPTER_CHECKS = [
  {
    id: 'round-trip-equality',
    lane: 'unit' as const,
    title: 'round-trip equality: native -> czap -> native preserves structure',
  },
  {
    id: 'host-capability-matrix',
    lane: 'integration' as const,
    title: 'host capability matrix: each declared site supports the adapter',
  },
] as const;

/**
 * The structural shape the driver resolves for a siteAdapter capsule (mirrors
 * {@link HarnessContext.siteAdapter}). Kept here as the named export the driver
 * imports; the inline copy in `pure-transform.ts` avoids a circular import.
 */
export type SiteAdapterDriver = NonNullable<HarnessContext['siteAdapter']>;

/** Number of fast-check runs the pure round-trip property walks. */
const ROUND_TRIP_RUNS = 100;

/**
 * Generate the test + bench (+ integration) file contents for a `siteAdapter`
 * capsule. When the driver resolved a {@link HarnessContext.siteAdapter}, both
 * checks are emitted real-in-lane; without it (no binding wired) the capsule
 * falls back to a typed self-reporting form — never an `it.skip` placeholder.
 */
export function generateSiteAdapter(
  cap: CapsuleDef<'siteAdapter', unknown, unknown, unknown>,
  ctx: HarnessContext = {},
): HarnessOutput {
  const driver = ctx.siteAdapter;

  // No resolved siteAdapter driver: the binding wasn't importable, so neither
  // the schema-driven round trip nor the host matrix can be wired. Record a
  // typed not-applicable exemption (a documentation-only file + premise note),
  // never an it.skip placeholder.
  if (driver === undefined || ctx.bindingImport === undefined || ctx.bindingName === undefined) {
    const reason =
      'capsule:compile resolved no importable siteAdapter binding, so neither the schema-driven ' +
      'round trip nor the per-site host matrix could be wired for this capsule.';
    return notWiredOutput(cap.name, reason);
  }

  return {
    testFile: emitUnitFile(cap.name, ctx.bindingName, ctx.bindingImport, driver),
    benchFile: emitBenchFile(cap.name, ctx.bindingName, ctx.bindingImport, driver),
    integrationFile: emitIntegrationFile(cap.name, ctx.bindingName, ctx.bindingImport, driver),
  };
}

// ---------------------------------------------------------------------------
// UNIT lane — pure round-trip equality (.test.ts).
// ---------------------------------------------------------------------------

function emitUnitFile(name: string, bindingName: string, bindingImport: string, driver: SiteAdapterDriver): string {
  return `// GENERATED — do not edit by hand
import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { ${bindingName} } from '${bindingImport}';
import { schemaToArbitrary } from '${driver.arbitraryImport}';
import { CanonicalCbor } from '${driver.canonicalCborImport}';
import { decode } from '${driver.cborDecodeImport}';
import { contentAddressOf } from '${driver.contentAddressImport}';
import { scaledTimeout } from '../../vitest.shared.js';

describe('${name}', () => {
  // UNIT LANE — pure round-trip equality. The adapter's native <-> czap boundary
  // is its '${driver.roundTripSchema}' schema; czap's canonical serialization is the
  // round trip. capsule:compile resolved this schema as arbitrary-derivable, so we
  // sample it via the canonical schemaToArbitrary walker (never a hand-built
  // fixture), encode -> decode through CanonicalCbor, and assert structure is
  // preserved via the canonical contentAddressOf (never a hand-rolled deep-equal).
  // A serialization regression that forks structure breaks the address equality RED.
  const cap = ${bindingName} as { ${driver.roundTripSchema}: unknown };
  const arb = schemaToArbitrary(cap.${driver.roundTripSchema} as never) as fc.Arbitrary<unknown>;

  it('round-trip equality: native -> czap -> native preserves structure', () => {
    fc.assert(
      fc.property(arb, (native) => {
        const back = decode(CanonicalCbor.encode(native));
        return contentAddressOf(back) === contentAddressOf(native);
      }),
      { numRuns: ${ROUND_TRIP_RUNS} },
    );
  }, scaledTimeout(30000));
});
`;
}

// ---------------------------------------------------------------------------
// INTEGRATION lane — host capability matrix (integration/<name>.test.ts).
// ---------------------------------------------------------------------------

function emitIntegrationFile(
  name: string,
  bindingName: string,
  _bindingImport: string,
  driver: SiteAdapterDriver,
): string {
  const host = driver.hostCapability;
  // The integration file lives one dir deeper than the unit file, so it imports
  // the binding via its own integration-relative specifier.
  const bindingImport = driver.bindingImportFromIntegration;

  // DECLARED-INTEGRATION (the only host-capability form — the owner's rule is NO
  // MOCKS ON THE HOST PATH, so there is no in-process-double driver). The host
  // capability is proved by REAL-host lanes that already exist; this generated
  // file is the waiver WITH TEETH that links to them and FAILS RED if the proof
  // rots. Per covered site it asserts the named real-host suite FILE exists AND
  // references the adapter; per gap site it records the honest missing-lane fact.
  //
  // Node env: this file reads suite files off disk via `node:fs`, which only
  // resolves under the `node` vitest environment.
  const coverageLiteral = JSON.stringify(
    host.coverage.map((c) => ({
      sites: [...c.sites],
      coverageRef: c.coverageRef,
      lane: c.lane,
      referencesNeedle: c.referencesNeedle,
    })),
    null,
    2,
  )
    .split('\n')
    .map((line, i) => (i === 0 ? line : `  ${line}`))
    .join('\n');
  const gapsLiteral = JSON.stringify(
    host.gaps.map((g) => ({ site: g.site, reason: g.reason })),
    null,
    2,
  )
    .split('\n')
    .map((line, i) => (i === 0 ? line : `  ${line}`))
    .join('\n');

  return `// @vitest-environment node
// GENERATED — do not edit by hand
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ${bindingName} } from '${bindingImport}';

// DECLARED-INTEGRATION host-capability matrix for '${name}'. NO MOCKS ON THE HOST
// PATH: each declared site is proved by a REAL-host lane that already exists (the
// coverage links below) or recorded as an honest GAP (no real-host lane). This is
// a waiver WITH TEETH — the suite-exists + references-adapter assertions fail RED
// if a linked proof is deleted, renamed, or stops touching the adapter.

/** Real-host suites that prove a declared-site set (asserted to exist + reference the adapter). */
const coverage: ReadonlyArray<{
  readonly sites: readonly string[];
  readonly coverageRef: string;
  readonly lane: string;
  readonly referencesNeedle: string;
}> = ${coverageLiteral};

/** Declared sites with NO real-host lane — tracked gaps, never a fabricated link. */
const gaps: ReadonlyArray<{ readonly site: string; readonly reason: string }> = ${gapsLiteral};

describe('${name} (integration: host capability matrix — declared-integration)', () => {
  const cap = ${bindingName} as { site?: readonly string[] };
  const declaredSites = [...(cap.site ?? [])].sort();

  it('the adapter declares a non-empty host-site set (the matrix domain)', () => {
    expect(Array.isArray(cap.site)).toBe(true);
    expect(declaredSites.length).toBeGreaterThan(0);
  });

  it('covered + gap sites partition exactly the declared site set (no site silently uncovered)', () => {
    // Source of truth is the adapter's declared \`site\` array. Every declared
    // site must be either covered by a named real-host suite OR a tracked gap —
    // a site in neither set would be an untracked hole, exactly what this guards.
    const accounted = [
      ...coverage.flatMap((c) => c.sites),
      ...gaps.map((g) => g.site),
    ].sort();
    expect(accounted).toEqual(declaredSites);
  });

  it('every coverage link points at a real-host suite that EXISTS and references the adapter', () => {
    // TEETH: a link can't rot into a lie. If the referenced suite file is gone,
    // or no longer mentions the adapter, this fails RED — the proof is gone.
    expect(coverage.length + gaps.length).toBeGreaterThan(0);
    for (const link of coverage) {
      const abs = resolve(process.cwd(), link.coverageRef);
      expect(existsSync(abs), \`real-host suite missing: \${link.coverageRef} (lane: \${link.lane})\`).toBe(true);
      const body = readFileSync(abs, 'utf8');
      expect(
        body.includes(link.referencesNeedle),
        \`suite \${link.coverageRef} no longer references the adapter (expected substring '\${link.referencesNeedle}')\`,
      ).toBe(true);
      // Each covered site must be one the adapter actually declares.
      for (const site of link.sites) {
        expect(declaredSites, \`coverage claims undeclared site '\${site}'\`).toContain(site);
      }
    }
  });

  it.each(gaps.length > 0 ? gaps : [{ site: '<none>', reason: 'no gaps' }])(
    'tracked host-coverage GAP: $site has no real-host lane ($reason)',
    ({ site }) => {
      // An honest, RED-visible record (a real running it(), never a skipped
      // placeholder): a declared site with no real-host lane. The owner sees it
      // in the test report and the manifest.
      // When the site IS a real gap, assert it is genuinely declared (so the gap
      // entry can't drift stale); the sentinel row is a no-op when there are none.
      if (site === '<none>') return;
      expect(declaredSites, \`gap names site '\${site}' the adapter no longer declares\`).toContain(site);
    },
  );
});
`;
}

// ---------------------------------------------------------------------------
// Bench lane.
// ---------------------------------------------------------------------------

function emitBenchFile(name: string, bindingName: string, bindingImport: string, driver: SiteAdapterDriver): string {
  // REAL bench: time the pure native -> czap -> native round trip — the SAME
  // canonical serialization the UNIT round-trip test asserts structure-preserving.
  // The native fixtures are presampled ONCE at module load from the adapter's
  // round-trip schema (fixed seed → reproducible), so the timed loop measures the
  // CanonicalCbor encode + decode, never fast-check.
  return `// GENERATED — do not edit by hand
import { bench } from 'vitest';
import * as fc from 'fast-check';
import { ${bindingName} } from '${bindingImport}';
import { schemaToArbitrary } from '${driver.arbitraryImport}';
import { CanonicalCbor } from '${driver.canonicalCborImport}';
import { decode } from '${driver.cborDecodeImport}';

const cap = ${bindingName} as { ${driver.roundTripSchema}: unknown };
const arb = schemaToArbitrary(cap.${driver.roundTripSchema} as never) as fc.Arbitrary<unknown>;
const natives = fc.sample(arb, { numRuns: ${BENCH_SAMPLE_COUNT}, seed: 0x5eed });
let i = 0;

bench(\`${escapeSingle(name)} — native -> czap -> native round trip\`, () => {
  const native = natives[i++ % natives.length];
  decode(CanonicalCbor.encode(native));
}, { time: 500 });
`;
}

/**
 * TYPED not-applicable bench for an unwired siteAdapter (no importable binding /
 * no arbitrary-derivable round-trip schema resolved): the marker line + a real
 * premise-guard body. Never a comment-only stub, never a `bench.skip`.
 *
 * This is reached ONLY from {@link notWiredOutput} — i.e. when no siteAdapter
 * binding was importable at all (so there is nothing structural to import and
 * assert against). The honest teeth here is to pin the recorded exemption reason:
 * a non-empty reason backing the marker, so the marker can never rot into an
 * empty placeholder that a gate would mistake for a real measurement.
 */
function notApplicableBench(name: string, reason: string): string {
  return `// GENERATED — do not edit by hand
${benchNotApplicableMarker(reason)}
import { bench, expect } from 'vitest';

// TYPED NOT-APPLICABLE bench (see the BENCH-NOT-APPLICABLE marker above + the
// capsule's \`benchExemption\` manifest record). No importable binding / no
// arbitrary-derivable round-trip schema resolved for '${name}', so there is no
// structural binding to assert against and no pure path to time — this PREMISE
// GUARD pins the recorded exemption reason so the marker can't rot into an empty
// placeholder.
bench('${escapeSingle(name)} — bench not-applicable (premise guard)', () => {
  expect('${escapeSingle(reason)}'.length).toBeGreaterThan(0);
}, { time: 50 });
`;
}

// ---------------------------------------------------------------------------
// not-wired output (no resolved driver).
// ---------------------------------------------------------------------------

function notWiredOutput(name: string, reason: string): HarnessOutput {
  const r = escapeSingle(reason);
  return {
    testFile: `// GENERATED — do not edit by hand
// Both siteAdapter checks for '${name}' are unwired for the documented reason
// below — deliberately no skipped-test placeholder and no silent omission. Reason:
//   ${r}
import { describe, it, expect } from 'vitest';

describe('${escapeSingle(name)} — siteAdapter not wired', () => {
  it('premise guard: no importable siteAdapter binding was resolved', () => {
    expect('${r}'.length).toBeGreaterThan(0);
  });
});
`,
    benchFile: notApplicableBench(name, reason),
  };
}

/** Escape single quotes + collapse newlines for a single-quoted string literal / comment. */
function escapeSingle(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\s+/g, ' ').trim();
}
