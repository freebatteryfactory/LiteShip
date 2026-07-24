/**
 * help — friendly usage text for the `liteship` CLI. The command list
 * is PROJECTED from the one canonical command catalog in `@liteship/command`,
 * grouped by each command's `group` (phase) annotation — no hand-maintained
 * command list lives here. Output is human-readable text to stdout (no JSON
 * wrapping); the AI-facing discovery surface is `liteship describe`.
 *
 * @module
 */

import { COMMAND_CATALOG } from '@liteship/command';
import type { CapsuleCommandDescriptor } from '@liteship/core';

/** Presentation: group key → human label + display order. */
const GROUP_CHART: ReadonlyArray<{ readonly key: string; readonly label: string }> = [
  { key: 'setup', label: 'Setup (dev experience)' },
  { key: 'compose', label: 'Compose + render (scene + asset)' },
  { key: 'manifest', label: 'Manifest (capsule)' },
  { key: 'ship', label: 'Publish (release)' },
  { key: 'servers', label: 'Servers' },
];

const HINTS = `Hints:
  - First time? Run \`pnpm verify\` for the full first-run aggregate.
  - Stuck? \`liteship doctor\` triages your environment; \`liteship doctor --fix\` repairs.
  - All commands emit JSON receipts on stdout; pretty output is on stderr.
  - Suppress color: NO_COLOR=1.  Force color in CI logs: FORCE_COLOR=1.
  - Releasing? \`liteship ship\` packs and publishes the workspace packages; \`liteship verify\` checks the receipt before publishing.

Docs:
  https://github.com/freebatteryfactory/LiteShip
`;

/** Render the grouped command list from the catalog. */
function renderCommandList(catalog: readonly CapsuleCommandDescriptor[]): string {
  const width = Math.max(...catalog.map((d) => d.name.length)) + 2;
  const seen = new Set<string>();
  const sections: string[] = [];

  const renderGroup = (label: string, commands: readonly CapsuleCommandDescriptor[]): void => {
    if (commands.length === 0) return;
    const rows = commands.map((d) => `  ${d.name.padEnd(width)}${d.summary}`);
    sections.push(`${label}:\n${rows.join('\n')}`);
  };

  for (const { key, label } of GROUP_CHART) {
    const commands = catalog.filter((d) => d.annotations?.group === key);
    for (const d of commands) seen.add(d.name);
    renderGroup(label, commands);
  }
  // Any command whose group is not in the display order still gets listed.
  const leftover = catalog.filter((d) => !seen.has(d.name));
  renderGroup('Other', leftover);

  return sections.join('\n\n');
}

const USAGE = `liteship — LiteShip CLI

Usage:
  liteship <command> [args]

${renderCommandList(COMMAND_CATALOG)}

${HINTS}`;

/** Print the help text to stdout. Returns exit code 0. */
export function help(): number {
  process.stdout.write(USAGE);
  return 0;
}

/** Exported for tests so they don't depend on the formatted shape. */
export const HELP_TEXT = USAGE;
