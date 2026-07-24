/** P17 AGENTS projection — one generated view over package/command/check/context owners. */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { COMMAND_CATALOG, CHECK_REGISTRY, CONTEXT_MAP } from '@liteship/command';
import { DIAGNOSTIC_REGISTRY } from '@liteship/error';
import {
  AGENT_CONTEXT_PROFILES,
  collectAgentContextDrift,
  LIVE_AGENT_CONTEXT_SOURCES,
  renderAgentRepositoryContext,
} from '../../../scripts/lib/agent-context.js';

const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));

describe('generated AGENTS repository context', () => {
  it('has no dangling live-source references', () => {
    expect(collectAgentContextDrift()).toEqual([]);
  });

  it('detects missing paths, check ids, diagnostics, and command-catalog entries', () => {
    const firstCheck = CHECK_REGISTRY[0]!;
    const badTask = {
      title: 'Broken context',
      summary: 'Run `liteship imaginary-command`.',
      pointers: [
        { kind: 'owner-file', path: 'missing/file.ts', note: 'missing', checkId: null },
        {
          kind: 'check',
          path: 'packages/command/src/checks/registry.ts',
          note: 'missing check',
          checkId: 'check/not-real',
        },
      ],
    } as const;
    const drift = collectAgentContextDrift({
      commands: COMMAND_CATALOG,
      checks: CHECK_REGISTRY,
      contexts: { broken: badTask },
      diagnosticCodes: Object.keys(DIAGNOSTIC_REGISTRY).filter((code) => code !== firstCheck.id),
    });
    expect(drift.map((item) => item.detail)).toEqual(
      expect.arrayContaining([
        `check has no DIAGNOSTIC_REGISTRY entry`,
        'context path does not exist: missing/file.ts',
        'context checkId is not in CHECK_REGISTRY: check/not-real',
        'context command is not in COMMAND_CATALOG: imaginary-command',
      ]),
    );
  });

  it('AGENTS marker content is byte-identical to the live projection', () => {
    const source = readFileSync(resolve(REPO_ROOT, 'AGENTS.md'), 'utf8');
    const match = /<!-- BEGIN AGENT-PACKAGE-CONTEXT[^]*?-->\n([^]*?)\n<!-- END AGENT-PACKAGE-CONTEXT -->/.exec(
      source,
    );
    expect(match?.[1]).toBe(renderAgentRepositoryContext());
  });

  it('projects every command, check profile, and task id from the live registries', () => {
    const rendered = renderAgentRepositoryContext();
    for (const command of COMMAND_CATALOG) expect(rendered).toContain(`\`liteship ${command.name.replaceAll('.', ' ')}\``);
    for (const profile of AGENT_CONTEXT_PROFILES) expect(rendered).toContain(`\`${profile}\``);
    for (const taskId of Object.keys(CONTEXT_MAP)) expect(rendered).toContain(`\`${taskId}\``);
    expect(LIVE_AGENT_CONTEXT_SOURCES.contexts).toBe(CONTEXT_MAP);
  });
});
