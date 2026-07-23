import { describe, expect, it } from 'vitest';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { diagnosticCodeRegisteredGate, memoryContext, nodeContext } from '@liteship/gauntlet';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

describe('diagnostic-code-registered — emitter ownership', () => {
  it('treats check ids in governance fixtures as data, not emitted diagnostics', () => {
    const context = memoryContext({
      'packages/gauntlet/src/gates/check-negative-control.ts':
        "export const facts = [{ id: 'check/example-fixture', blocking: true }] as const;\n",
    });

    expect(diagnosticCodeRegisteredGate.run(context)).toEqual([]);
  });

  it('closes check identities over the authoritative check registry', () => {
    const context = memoryContext({
      'packages/command/src/checks/registry.ts':
        "export const CHECK_REGISTRY = [{ id: 'check/__unregistered_test_fixture__' }] as const;\n",
    });

    expect(diagnosticCodeRegisteredGate.run(context)).toEqual([
      expect.objectContaining({
        ruleId: 'gauntlet/diagnostic-code-registered',
        title: 'Diagnostic code "check/__unregistered_test_fixture__" is not registered',
      }),
    ]);
  });

  it('is clean over the real package source corpus', () => {
    const context = nodeContext(REPO_ROOT, ['packages/*/src/**/*.ts']);
    expect(context.files().length).toBeGreaterThan(0);
    expect(diagnosticCodeRegisteredGate.run(context)).toEqual([]);
  });
});
