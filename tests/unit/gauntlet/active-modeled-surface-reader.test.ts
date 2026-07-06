/**
 * #132 — active-modeled-surface-has-reader gate: synthetic fixtures + live orphan advisory.
 *
 * @module
 */

import { describe, it, expect } from 'vitest';
import {
  activeModeledSurfaceReaderGate,
  verifyGate,
} from '@czap/gauntlet';
import { buildActiveSurfaceFacts } from '@czap/audit';
import { resolve } from 'node:path';

const REPO_ROOT = resolve(import.meta.dirname, '..', '..', '..');

describe('activeModeledSurfaceReaderGate — field-level orphan (#132)', () => {
  it('RED: flags an active TransitionNode with all fields unread', () => {
    const findings = activeModeledSurfaceReaderGate.run(activeModeledSurfaceReaderGate.fixtures.red.context);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0]?.ruleId).toBe('gauntlet/active-modeled-surface-reader');
    expect(findings[0]?.severity).toBe('error');
    expect(findings[0]?.detail).toContain('routing');
    expect(findings[0]?.detail).toContain('durationMs');
  });

  it('GREEN: passes when all four TransitionNode fields are read', () => {
    const findings = activeModeledSurfaceReaderGate.run(activeModeledSurfaceReaderGate.fixtures.green.context);
    expect(findings).toHaveLength(0);
  });

  it('self-proves via the authority ratchet (red / green / mutation)', () => {
    const proof = verifyGate(activeModeledSurfaceReaderGate);
    expect(proof.selfProven).toBe(true);
    expect(proof.redCaught).toBe(true);
    expect(proof.greenClean).toBe(true);
    expect(proof.mutationKilled).toBe(true);
  });
});

describe('buildActiveSurfaceFacts — live repo TransitionNode orphan (advisory)', () => {
  it('detects routing/durationMs unread in enrolled reader paths', () => {
    const facts = buildActiveSurfaceFacts({ repoRoot: REPO_ROOT, promotion: 'advisory' });
    const transition = facts.surfaces.find((s) => s.family === 'transition');
    expect(transition).toBeDefined();
    expect(transition?.active).toBe(true);
    expect(transition?.readFields).toContain('fromPose');
    expect(transition?.readFields).toContain('toPose');
    expect(transition?.unreadFields).toContain('routing');
    expect(transition?.unreadFields).toContain('durationMs');
    expect(transition?.promotion).toBe('advisory');
  });

  it('live orphan folds to advisory (does not block main)', () => {
    const facts = buildActiveSurfaceFacts({ repoRoot: REPO_ROOT, promotion: 'advisory' });
    const ctx = { repoRoot: REPO_ROOT, readFile: () => undefined, files: () => [], activeSurfaceFacts: facts };
    const findings = activeModeledSurfaceReaderGate.run(ctx);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings.every((f) => f.severity === 'advisory')).toBe(true);
  });
});
