/**
 * THE CAPABILITY-LINK ORACLE — proves every sanctioned capability-gated skip's GUARD DERIVES FROM its
 * declared capability's probe (codex round-8, #1b), via the checker dataflow `linker`. The avionics
 * answer to "conditional ≠ gated-by-the-declared-capability": an `if (Math.random()) { it.skip("ffmpeg…") }`
 * is conditional but links to NO capability probe — caught here, not laundered.
 *
 * The canonical capability symbol table (the SET of modules the linker reads) IS the registry — each
 * export's name is its capability id; the repo tells on itself. This suite pins:
 *  1. REAL REPO — every `SANCTIONED_SKIPS` site links to the capability it declares (the consolidation
 *     of the per-file probes into the canonical modules holds);
 *  2. ADVERSARIAL — an unrelated runtime guard (`Math.random()`) claiming a capability links to NOTHING;
 *  3. MISLABEL — a genuine probe guard under the WRONG capability label links to the OTHER capability,
 *     not the declared one (the proof catches mislabels, which a name/keyword heuristic could not).
 */

import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { detectSkipsAST, buildCapabilityLinkFacts, type CapabilitySkipSite } from '@czap/audit';
import { SANCTIONED_SKIPS, normalizeSiteLine, SKIP_CAPABILITIES } from '@czap/gauntlet';

const REPO_ROOT = fileURLToPath(new URL('../../..', import.meta.url));
/** The canonical capability symbol-table modules — the SET the linker reads (per-runtime). */
const CAPABILITY_MODULES = [
  'tests/helpers/capabilities.ts',
  'tests/helpers/capabilities.browser.ts',
  'tests/helpers/ffmpeg.ts',
];
const CAPABILITY_IDS = [...SKIP_CAPABILITIES];

/** Resolve every enumerated sanctioned skip to its (file, line) by matching the normalized site text. */
function resolveSanctionedSites(): CapabilitySkipSite[] {
  return SANCTIONED_SKIPS.map((s) => {
    const lines = readFileSync(resolve(REPO_ROOT, s.file), 'utf8').split('\n');
    let line = -1;
    for (const m of detectSkipsAST(lines.join('\n'))) {
      if (normalizeSiteLine(lines[m.line - 1] ?? '') === normalizeSiteLine(s.site)) {
        line = m.line;
        break;
      }
    }
    return { file: s.file, line, declaredCapability: s.capability };
  });
}

describe('capability-link oracle — the dataflow proof', () => {
  it('every sanctioned skip links to its DECLARED capability (the real repo)', () => {
    const sites = resolveSanctionedSites();
    expect(sites.every((s) => s.line > 0), `unresolved lines: ${JSON.stringify(sites.filter((s) => s.line <= 0))}`).toBe(true);
    const facts = buildCapabilityLinkFacts({
      repoRoot: REPO_ROOT,
      capabilityModules: CAPABILITY_MODULES,
      capabilityIds: CAPABILITY_IDS,
      sites,
    });
    const unlinked = facts.results.filter((r) => !r.linked);
    expect(
      unlinked,
      `unlinked sanctioned skips (guard does not derive from the declared capability's probe):\n${unlinked
        .map((r) => `  ${r.file}:${r.line} [${r.declaredCapability}] guard="${r.guardText}" -> {${r.linkedCapabilities.join(',')}}`)
        .join('\n')}`,
    ).toEqual([]);
    // The symbol table self-assembled from the canonical modules covers every declared capability.
    expect(facts.definedCapabilities.sort()).toEqual([...CAPABILITY_IDS].sort());
  });

  it('an UNRELATED runtime guard (if(Math.random())) claiming a capability links to NOTHING (caught)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'caplink-adv-'));
    try {
      const file = join(dir, 'adv.test.ts');
      writeFileSync(file, 'import { it } from "vitest";\nif (Math.random() > 0.5) {\n  it.skip("ffmpeg render probe", () => {});\n}\n');
      const facts = buildCapabilityLinkFacts({
        repoRoot: REPO_ROOT,
        capabilityModules: CAPABILITY_MODULES.map((m) => resolve(REPO_ROOT, m)),
        capabilityIds: CAPABILITY_IDS,
        sites: [{ file, line: 3, declaredCapability: 'ffmpeg-absent' }],
      });
      expect(facts.results[0]?.linked).toBe(false);
      expect(facts.results[0]?.linkedCapabilities).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('a MISLABELED skip (a genuine ffmpeg guard declared wasm-absent) is caught', () => {
    // Take a real ffmpeg-gated site but DECLARE it wasm-absent: the guard derives from ffmpeg-absent's
    // probe, not wasm-absent's, so it links to the wrong capability — `linked: false`.
    const sites = resolveSanctionedSites().filter((s) => s.declaredCapability === 'ffmpeg-absent' && s.line > 0);
    expect(sites.length).toBeGreaterThan(0);
    const mislabeled = { ...sites[0]!, declaredCapability: 'wasm-absent' };
    const facts = buildCapabilityLinkFacts({
      repoRoot: REPO_ROOT,
      capabilityModules: CAPABILITY_MODULES,
      capabilityIds: CAPABILITY_IDS,
      sites: [mislabeled],
    });
    expect(facts.results[0]?.linked).toBe(false);
    expect(facts.results[0]?.linkedCapabilities).toEqual(['ffmpeg-absent']);
  });
});
