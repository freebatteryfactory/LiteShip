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
import {
  LITESHIP_EXPORT_REQUIRED_FIELDS,
  LITESHIP_TRANSITION_REQUIRED_FIELDS,
} from '../../../packages/cli/src/lib/active-surface-policy.js';
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

describe('buildActiveSurfaceFacts — live repo TransitionNode (#132 green)', () => {
  it('reads all four TransitionNode fields in enrolled reader paths', () => {
    const facts = buildActiveSurfaceFacts({
      repoRoot: REPO_ROOT,
      promotion: 'blocking',
      transitionRequiredFields: LITESHIP_TRANSITION_REQUIRED_FIELDS,
      exportRequiredFields: LITESHIP_EXPORT_REQUIRED_FIELDS,
    });
    const transition = facts.surfaces.find((s) => s.family === 'transition');
    expect(transition).toBeDefined();
    expect(transition?.active).toBe(true);
    expect(transition?.readFields).toContain('fromPose');
    expect(transition?.readFields).toContain('toPose');
    expect(transition?.readFields).toContain('routing');
    expect(transition?.readFields).toContain('durationMs');
    expect(transition?.unreadFields).toHaveLength(0);
  });

  it('reads enrolled ExportNode fields in reader paths', () => {
    const facts = buildActiveSurfaceFacts({
      repoRoot: REPO_ROOT,
      promotion: 'blocking',
      transitionRequiredFields: LITESHIP_TRANSITION_REQUIRED_FIELDS,
      exportRequiredFields: LITESHIP_EXPORT_REQUIRED_FIELDS,
    });
    const exportSurface = facts.surfaces.find((s) => s.family === 'export');
    expect(exportSurface).toBeDefined();
    expect(exportSurface?.readFields).toContain('sourceRefs');
    expect(exportSurface?.readFields).toContain('artifactDigest');
    expect(exportSurface?.unreadFields).toHaveLength(0);
  });

  it('live repo emits no findings when all fields are read (blocking promotion)', () => {
    const facts = buildActiveSurfaceFacts({
      repoRoot: REPO_ROOT,
      promotion: 'blocking',
      transitionRequiredFields: LITESHIP_TRANSITION_REQUIRED_FIELDS,
    });
    const ctx = { repoRoot: REPO_ROOT, readFile: () => undefined, files: () => [], activeSurfaceFacts: facts };
    const findings = activeModeledSurfaceReaderGate.run(ctx);
    expect(findings).toHaveLength(0);
  });
});
