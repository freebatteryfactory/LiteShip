/** Generated command/check documentation projected from the live registries. */
import { COMMAND_CATALOG } from '../../packages/command/src/catalog.js';
import { CHECK_REGISTRY } from '../../packages/command/src/checks/registry.js';
import {
  CHECK_PROFILE_METADATA,
  type CheckProfile,
} from '../../packages/command/src/checks/definition.js';

const PROFILES = ['quick', 'full', 'release', 'consumer', 'environment'] as const satisfies readonly CheckProfile[];

function escapeCell(value: string): string {
  return value.replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function cliInvocation(name: string): string {
  return `liteship ${name.replaceAll('.', ' ')}`;
}

/** The complete CLI command table. Identity and summaries come only from COMMAND_CATALOG. */
export function renderCliCommandCatalog(): string {
  const rows = COMMAND_CATALOG.map(
    (descriptor) =>
      `| \`${cliInvocation(descriptor.name)}\` | ${escapeCell(descriptor.summary)} | ${descriptor.executionKind === 'handler' ? 'shared handler' : 'CLI orchestration'} |`,
  );
  return [
    '| Command | Purpose | Execution owner |',
    '| --- | --- | --- |',
    ...rows,
    '',
    '`liteship describe --format=json` is the machine-readable form of this same catalog.',
  ].join('\n');
}

/** The MCP tool table. Exposure is a catalog annotation, never a second hand-authored list. */
export function renderMcpToolCatalog(): string {
  const rows = COMMAND_CATALOG.filter((descriptor) => descriptor.annotations?.mcpExposed === true).map(
    (descriptor) => `| \`${descriptor.name}\` | ${escapeCell(descriptor.summary)} |`,
  );
  return ['| Tool | Purpose |', '| --- | --- |', ...rows].join('\n');
}

/** Public profile meanings plus the exact checks currently projected into each profile. */
export function renderCheckProfiles(): string {
  const rows = PROFILES.map((profile) => {
    const checks = CHECK_REGISTRY.filter((definition) => definition.profiles.includes(profile));
    return `| \`${profile}\` | ${CHECK_PROFILE_METADATA[profile].claim} | ${checks.length} | ${checks.map((check) => `\`${check.id}\``).join(', ')} |`;
  });
  return [
    '| Profile | Passing claim | Checks | Registry projection |',
    '| --- | --- | ---: | --- |',
    ...rows,
  ].join('\n');
}
