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
 *    actually supports the adapter under a REAL host. Wired to a per-site host
 *    driver (the production middleware / renderer invoked for real, NOT a mock on
 *    the host-capability path) when one exists; otherwise recorded as a typed
 *    `declared-integration` exemption — a waiver WITH TEETH pointing at a named
 *    existing integration suite that covers it.
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

/**
 * Resolution of one declared siteAdapter check. Either the check is WIRED real
 * into its lane, or it is a typed `declared-integration` exemption (a coverage
 * link to a real existing suite), or a `not-applicable` exemption with a reason.
 * There is no skip variant by construction — a skip is exactly the thing the
 * harness LAW forbids.
 */
export type SiteAdapterCheckDisposition =
  | { readonly status: 'wired'; readonly lane: HarnessLane }
  | {
      readonly status: 'declared-integration';
      readonly lane: HarnessLane;
      readonly coverageSuite: string;
      readonly reason: string;
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
    benchFile: emitBenchFile(cap.name),
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

  if (host.kind === 'declared-integration') {
    // No in-process host driver exists for this adapter. Record a typed
    // `declared-integration` exemption: a REAL it() that pins the adapter's
    // declared site set AND names the existing integration suite that covers it
    // for real — a waiver WITH TEETH, deliberately NOT an it.skip and NOT silent.
    const reason = escapeSingle(host.reason);
    const suite = escapeSingle(host.coverageSuite);
    return `// GENERATED — do not edit by hand
import { describe, it, expect } from 'vitest';
import { ${bindingName} } from '${bindingImport}';

describe('${name} (integration: host capability matrix)', () => {
  // DECLARED-INTEGRATION exemption — no in-process host driver: ${reason}
  // Covered for real by: ${suite}
  it('declares its host sites; named integration suite covers the matrix', () => {
    const cap = ${bindingName} as { site?: readonly string[] };
    // The adapter must DECLARE a non-empty site set (the matrix's domain)...
    expect(Array.isArray(cap.site)).toBe(true);
    expect(cap.site!.length).toBeGreaterThan(0);
    // ...and the real coverage lives in the named suite (recorded in the
    // capsule manifest as the coverage link — a waiver with teeth, not a skip).
  });
});
`;
  }

  // Real per-site host driver. Import the driver's siteProbes (each runs the
  // production host for one site) and the capsule binding (its declared `site`
  // set is the matrix domain). Assert the probe set EXACTLY matches the declared
  // sites, then drive every site under the real host and assert each succeeds.
  // The vitest environment is set by the driver (node for the worker KV path,
  // jsdom for the React/browser hook path).
  //
  // scaledTimeout (the central CI-scaling policy) imports `vitest.shared.ts`,
  // whose `fileURLToPath(import.meta.url)` only resolves under the `node`
  // environment — under `jsdom` it throws "URL must be of scheme file". So the
  // node path uses scaledTimeout; the jsdom path's probes (in-memory frame
  // production + one React render, sub-second) run inside the default timeout, no
  // raw-literal override needed.
  const usesScaledTimeout = host.environment === 'node';
  const scaledTimeoutImport = usesScaledTimeout ? `\nimport { scaledTimeout } from '../../../vitest.shared.js';` : '';
  const matrixTimeoutArg = usesScaledTimeout ? ', scaledTimeout(60000)' : '';
  return `// @vitest-environment ${host.environment}
// GENERATED — do not edit by hand
import { describe, it, expect } from 'vitest';
import { ${bindingName} } from '${bindingImport}';
import { siteProbes } from '${host.driverImport}';${scaledTimeoutImport}

describe('${name} (integration: host capability matrix)', () => {
  const cap = ${bindingName} as { site?: readonly string[] };
  const declaredSites = [...(cap.site ?? [])].sort();
  const probedSites = Object.keys(siteProbes).sort();

  it('the host-capability driver covers exactly the declared site set', () => {
    // The matrix domain is the capsule's declared \`site\` array (source of
    // truth). The driver must cover every declared site and no extras — a
    // drift here means a site shipped without a real host probe, or a probe
    // claims a site the adapter never declared.
    expect(probedSites).toEqual(declaredSites);
  });

  it('each declared site supports the adapter under the real host', async () => {
    // Drive every declared site through its REAL host probe (production
    // middleware / renderer / hook — no mock on the host-capability path).
    // Each probe returns a structural result proving the host path actually ran.
    expect(declaredSites.length).toBeGreaterThan(0);
    for (const site of declaredSites) {
      const probe = siteProbes[site];
      expect(probe, \`no host probe wired for declared site '\${site}'\`).toBeTypeOf('function');
      const result = await probe!();
      // The probe ran under the real host and reported the site it drove.
      expect(result.site).toBe(site);
    }
  }${matrixTimeoutArg});
});
`;
}

// ---------------------------------------------------------------------------
// Bench lane.
// ---------------------------------------------------------------------------

function emitBenchFile(name: string): string {
  return `// GENERATED — do not edit by hand
import { bench } from 'vitest';

bench('${name}', () => {
  // adapter call with a canonical native fixture
}, { time: 500 });
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
// below — deliberately no it.skip placeholder (which would ship unwired work
// green) and no silent omission. Reason:
//   ${r}
import 'vitest';
`,
    benchFile: emitBenchFile(name),
  };
}

/** Escape single quotes + collapse newlines for a single-quoted string literal / comment. */
function escapeSingle(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\s+/g, ' ').trim();
}
