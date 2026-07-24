import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect } from 'vitest';
import { CHECK_REGISTRY, type CheckPlan, type PlannedCheck } from '@liteship/command';
import { createCheckPlanRunner } from '../../packages/cli/src/commands/check.js';

function plannedCheck(id: string, expectedCommand: string, expectedControl: string): PlannedCheck {
  const definition = CHECK_REGISTRY.find((entry) => entry.id === id);
  expect(definition, `${id} must remain registered`).toBeDefined();
  expect(definition?.authority).toBe('blocking');
  expect(definition?.command).toBe(expectedCommand);
  expect(definition?.negativeControl).toBe(expectedControl);
  if (definition === undefined) throw new Error(`missing check definition: ${id}`);

  return {
    id: definition.id,
    title: definition.title,
    claim: definition.claim,
    context: 'repository',
    command: definition.command,
    ...(definition.execution === undefined ? {} : { execution: definition.execution }),
    owner: definition.owner,
    remediation: definition.remediation,
    authority: definition.authority,
    cache: definition.cache,
    cacheable: definition.cache === 'content-addressed',
    timeoutMs: definition.timeoutMs,
    inputs: definition.inputs,
  };
}

function scriptName(command: string): string {
  const match = /^pnpm (?:run )?([^\s]+)/u.exec(command);
  if (match?.[1] === undefined) throw new Error(`negative-control helper requires a pnpm run command: ${command}`);
  return match[1];
}

/**
 * Drive one real registry definition through the production profile executor.
 * The injected process result is the sole seam: no integration host is launched,
 * while command selection, blocking fold, findings, and aggregate truth remain
 * the same code used by `liteship check --profile ...`.
 */
export function proveRegisteredCheckRejects(id: string, expectedCommand: string, expectedControl: string): void {
  const check = plannedCheck(id, expectedCommand, expectedControl);
  const root = mkdtempSync(join(tmpdir(), 'liteship-check-control-'));
  try {
    writeFileSync(
      join(root, 'package.json'),
      JSON.stringify({ private: true, scripts: { [scriptName(expectedCommand)]: 'fixture-authority' } }),
    );
    const plan: CheckPlan = {
      profile: 'release',
      platform: 'linux',
      context: 'repository',
      checks: [check],
      estimatedMs: check.timeoutMs,
      skipped: [],
    };
    const calls: string[] = [];
    const runWithStatus = (status: number) =>
      createCheckPlanRunner({
        spawn: (command) => {
          calls.push(command);
          return { status, signal: null, stdout: '', stderr: status === 0 ? '' : `planted ${id} failure` };
        },
        now: () => 1,
        env: { node: 'negative-control', platform: 'linux' },
      })(plan, root, { noCache: true });

    const red = runWithStatus(17);
    expect(calls).toEqual([expectedCommand]);
    expect(red).toMatchObject({ ok: false, blocked: true });
    expect(red.results).toHaveLength(1);
    expect(red.results[0]).toMatchObject({ id, verdict: 'fail', cacheHit: false });
    expect(red.results[0]?.findings.join('\n')).toContain(`planted ${id} failure`);

    calls.length = 0;
    const green = runWithStatus(0);
    expect(calls).toEqual([expectedCommand]);
    expect(green).toMatchObject({ ok: true, blocked: false });
    expect(green.results[0]).toMatchObject({ id, verdict: 'pass', cacheHit: false });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
