/** Generated AGENTS context and its source-closure validation. */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { COMMAND_CATALOG } from '../../packages/command/src/catalog.js';
import { CHECK_REGISTRY } from '../../packages/command/src/checks/registry.js';
import {
  CHECK_PROFILE_METADATA,
  type CheckProfile,
} from '../../packages/command/src/checks/definition.js';
import { CONTEXT_MAP } from '../../packages/command/src/commands/context-map.js';
import { DIAGNOSTIC_REGISTRY } from '../../packages/error/src/codes.js';
import { PACKAGE_CATALOG } from '../package-catalog.js';
import { renderCheckProfiles, renderCliCommandCatalog } from './command-docs.js';

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));

interface CommandSource {
  readonly name: string;
}

interface CheckSource {
  readonly id: string;
  readonly profiles: readonly CheckProfile[];
}

interface ContextPointerSource {
  readonly kind: string;
  readonly path: string;
  readonly note: string;
  readonly checkId: string | null;
}

interface ContextTaskSource {
  readonly title: string;
  readonly summary: string;
  readonly pointers: readonly ContextPointerSource[];
}

export interface AgentContextSources {
  readonly commands: readonly CommandSource[];
  readonly checks: readonly CheckSource[];
  readonly contexts: Readonly<Record<string, ContextTaskSource>>;
  readonly diagnosticCodes: readonly string[];
}

export interface AgentContextDrift {
  readonly source: string;
  readonly detail: string;
}

export const LIVE_AGENT_CONTEXT_SOURCES: AgentContextSources = {
  commands: COMMAND_CATALOG,
  checks: CHECK_REGISTRY,
  contexts: CONTEXT_MAP,
  diagnosticCodes: Object.keys(DIAGNOSTIC_REGISTRY),
};

function commandReferences(task: ContextTaskSource): readonly string[] {
  const prose = [task.title, task.summary, ...task.pointers.map((pointer) => pointer.note)].join('\n');
  return [...prose.matchAll(/`liteship\s+([a-z][\w.-]*)/gu)].map((match) => match[1] as string);
}

/** Validate every cross-reference that the generated AGENTS context publishes. */
export function collectAgentContextDrift(
  sources: AgentContextSources = LIVE_AGENT_CONTEXT_SOURCES,
  repoRoot = REPO_ROOT,
): readonly AgentContextDrift[] {
  const drift: AgentContextDrift[] = [];
  const commands = new Set(sources.commands.map((command) => command.name));
  const checks = new Set(sources.checks.map((check) => check.id));
  const diagnostics = new Set(sources.diagnosticCodes);

  for (const checkId of checks) {
    if (!diagnostics.has(checkId)) {
      drift.push({ source: checkId, detail: 'check has no DIAGNOSTIC_REGISTRY entry' });
    }
  }

  for (const [taskId, task] of Object.entries(sources.contexts)) {
    for (const pointer of task.pointers) {
      if (!existsSync(resolve(repoRoot, pointer.path))) {
        drift.push({ source: taskId, detail: `context path does not exist: ${pointer.path}` });
      }
      if (pointer.kind === 'check') {
        if (pointer.checkId === null || !checks.has(pointer.checkId)) {
          drift.push({ source: taskId, detail: `context checkId is not in CHECK_REGISTRY: ${pointer.checkId}` });
        }
      } else if (pointer.checkId !== null) {
        drift.push({ source: taskId, detail: `non-check pointer carries checkId: ${pointer.checkId}` });
      }
    }
    for (const command of commandReferences(task)) {
      if (!commands.has(command)) {
        drift.push({ source: taskId, detail: `context command is not in COMMAND_CATALOG: ${command}` });
      }
    }
  }
  return drift;
}

function escapeCell(value: string): string {
  return value.replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function renderPackageContext(): string {
  const rows = PACKAGE_CATALOG.map(
    (record) => `| \`${record.name}\` | \`${record.dir}\` | ${record.capabilities.join(', ')} |`,
  );
  return [
    '### Packages',
    '',
    'Use this index to find the semantic owner; public subpaths and dependency edges are generated in `PACKAGE-SURFACES.md` and `ARCHITECTURE.md`.',
    '',
    '| Package | Owner directory | Capabilities |',
    '| --- | --- | --- |',
    ...rows,
  ].join('\n');
}

function renderContextTasks(): string {
  const rows = Object.entries(CONTEXT_MAP)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([taskId, task]) => {
      const checks = task.pointers
        .filter((pointer) => pointer.checkId !== null)
        .map((pointer) => `\`${pointer.checkId}\``)
        .join(', ');
      const paths = task.pointers.map((pointer) => `\`${pointer.path}\``).join(', ');
      return `| \`${taskId}\` | ${escapeCell(task.summary)} | ${checks || 'none'} | ${paths} |`;
    });
  return [
    '### Task context',
    '',
    '`liteship context --task <id> --json` returns these same ordered pointers.',
    '',
    '| Task | Purpose | Checks | Ordered pointers |',
    '| --- | --- | --- | --- |',
    ...rows,
  ].join('\n');
}

/** Render package, command, check/profile, and task context from their live owners. */
export function renderAgentRepositoryContext(): string {
  const drift = collectAgentContextDrift();
  if (drift.length > 0) {
    throw new Error(
      `agent context source drift:\n${drift.map((item) => `  - ${item.source}: ${item.detail}`).join('\n')}`,
    );
  }
  return [
    '## Generated repository context',
    '',
    renderPackageContext(),
    '',
    '### Commands',
    '',
    renderCliCommandCatalog(),
    '',
    '### Check profiles',
    '',
    renderCheckProfiles(),
    '',
    renderContextTasks(),
  ].join('\n');
}

/** Profile names rendered into AGENTS, exposed for a projection parity test. */
export const AGENT_CONTEXT_PROFILES = Object.keys(CHECK_PROFILE_METADATA).sort();
