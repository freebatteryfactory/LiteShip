/**
 * Meta-test for the plumb-completeness gate (scripts/plumb-gate.ts).
 *
 * The gate is the regression guard the gauntlet never had: a built-not-plumbed
 * subsystem (the scene/stage class — a whole package a consumer never runs) or a
 * newly-unwired capsule can no longer ship green unclassified. This test pins
 * the ledger's hygiene so the gate itself can't rot.
 */
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runPlumbGate } from '../../../scripts/plumb-gate.js';
import { PACKAGE_PLUMB, PLUMB_FLOOR } from '../../../scripts/plumb-registry.js';

describe('plumb gate', () => {
  it('passes on the current tree (no drift, every package classified)', () => {
    const result = runPlumbGate();
    expect(result.unclassified).toEqual([]);
    expect(result.added).toEqual([]);
    expect(result.removed).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('every deferred package carries a tracking issue (no silent deferral)', () => {
    for (const [name, entry] of Object.entries(PACKAGE_PLUMB)) {
      if (entry.status === 'deferred') {
        expect(entry.issue, `${name} is deferred but has no issue`).toBeTruthy();
      }
      expect(entry.reason.length, `${name} needs a reason`).toBeGreaterThan(0);
    }
  });

  it('the floor holds only capsule entries (orphan noise is not gated here)', () => {
    for (const entry of PLUMB_FLOOR) {
      expect(entry.startsWith('capsule:'), `unexpected floor entry: ${entry}`).toBe(true);
    }
  });

  // FINDING 5 [Major]: the gate must read the manifest through the CANONICAL
  // resolver (`getCapsuleManifestPath`, honoring CZAP_CAPSULE_MANIFEST) — the SAME
  // path the writer (scripts/capsule-compile.ts) emits to — not a hardcoded
  // `reports/capsule-manifest.json`. Point the resolver at a temp manifest with an
  // unwired capsule and assert the gate reads IT (proving it follows the override).
  describe('reads the canonical (CZAP_CAPSULE_MANIFEST) path the writer emits to', () => {
    const prev = process.env.CZAP_CAPSULE_MANIFEST;
    afterEach(() => {
      if (prev === undefined) delete process.env.CZAP_CAPSULE_MANIFEST;
      else process.env.CZAP_CAPSULE_MANIFEST = prev;
    });

    it('inventories an unwired capsule from the overridden manifest path', () => {
      const dir = mkdtempSync(join(tmpdir(), 'czap-plumb-gate-'));
      const manifestPath = join(dir, 'capsule-manifest.json');
      // A manifest the hardcoded `reports/...` path would NEVER find — only the
      // canonical resolver (which honors the env override) reaches it.
      writeFileSync(
        manifestPath,
        JSON.stringify({ capsules: [{ name: 'finding5-probe', wired: false }] }),
        'utf8',
      );
      // The override is ABSOLUTE, so `root` doesn't matter for the manifest read.
      process.env.CZAP_CAPSULE_MANIFEST = manifestPath;
      const result = runPlumbGate();
      // The probe capsule is unwired + not on the floor → it surfaces as `added`,
      // which proves the gate read the overridden manifest (a hardcoded path would
      // read the repo's real manifest and never see this probe).
      expect(result.added).toContain('capsule:finding5-probe');
    });
  });

  it('scene is plumbed live and stage is a complete build tool as of 0.4.0', () => {
    // The headline subsystems are no longer test-only: @czap/scene is imported by
    // the astro runtime (scene→live bridge + SVG directive), and @czap/stage's
    // headless encode is filled (a build/CI proof tool). The ledger reflects it.
    expect(PACKAGE_PLUMB['@czap/scene']?.status).toBe('runtime');
    expect(PACKAGE_PLUMB['@czap/stage']?.status).toBe('tooling');
  });
});
