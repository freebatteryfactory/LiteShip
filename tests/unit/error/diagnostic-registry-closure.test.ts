// @vitest-environment node
/**
 * The diagnostic registry is the closed stable-identity surface shared by
 * runtime diagnostics, schema issues, migration results, checks, and gates.
 *
 * PROVES: INV-DIAGNOSTIC-CODE-CLOSED
 */
// PROVES: INV-DIAGNOSTIC-CODE-CLOSED

import { describe, expect, it } from 'vitest';
import {
  DIAGNOSTIC_AREAS,
  DIAGNOSTIC_REGISTRY,
  explainDiagnostic,
  type DiagnosticCode,
} from '@liteship/error';
import type { Diagnostics } from '@liteship/core';

describe('diagnostic registry closure', () => {
  it('every key agrees with its area and carries complete explanation plus owner metadata', () => {
    for (const [code, entry] of Object.entries(DIAGNOSTIC_REGISTRY)) {
      expect(code.startsWith(`${entry.area}/`), `${code} must agree with area ${entry.area}`).toBe(true);
      expect(entry.title.trim().length, `${code} title`).toBeGreaterThan(0);
      expect(entry.explanation.trim().length, `${code} explanation`).toBeGreaterThan(0);
      expect(entry.remediation.trim().length, `${code} remediation`).toBeGreaterThan(0);
      expect(entry.owner.trim().length, `${code} owner`).toBeGreaterThan(0);
      expect(explainDiagnostic(code)).toBe(entry);
    }
  });

  it('every declared area has a real enrolled identity', () => {
    const areas = new Set(Object.values(DIAGNOSTIC_REGISTRY).map((entry) => entry.area));
    expect([...DIAGNOSTIC_AREAS].filter((area) => !areas.has(area))).toEqual([]);
  });

  it('the exact union rejects invented registry and runtime identities at compile time', () => {
    // @ts-expect-error — an area-shaped string is not enrolled.
    const invented: DiagnosticCode = 'core/__not_enrolled__';
    const payload: Diagnostics.RegisteredPayload = {
      source: 'fixture',
      // @ts-expect-error — Diagnostics cannot emit an unenrolled stable identity.
      code: 'astro/__not_enrolled__',
      message: 'fixture',
    };
    expect(explainDiagnostic(invented as string)).toBeUndefined();
    expect(payload.code).toBe('astro/__not_enrolled__');
  });

  it.each([
    ['gauntlet/no-bare-throw', 'gauntlet'],
    ['check/format', 'check'],
    ['core/boundary/unknown-previous-state', 'core'],
    ['schema/type', 'schema'],
    ['compiler/css/unknown-state-key', 'compiler'],
    ['astro/wgpu/webgpu-unavailable', 'astro'],
    ['cli/usage', 'cli'],
    ['migrate/malformed-input', 'migrate'],
  ] as const)('%s resolves as a %s identity', (code, area) => {
    const entry = explainDiagnostic(code);
    expect(entry?.area).toBe(area);
    expect(entry?.owner).toBeTruthy();
  });
});
