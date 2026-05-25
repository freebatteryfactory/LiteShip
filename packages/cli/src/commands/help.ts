/**
 * help — friendly usage text for the `czap` CLI. The verb table ("the chart")
 * is PROJECTED from the one canonical command catalog in `@czap/command`,
 * grouped by each command's `group` (phase) annotation — no hand-maintained
 * command list lives here. Output is human-readable text to stdout (no JSON
 * wrapping); the AI-facing discovery surface is `czap describe`.
 *
 * @module
 */

import { COMMAND_CATALOG } from '@czap/command';
import type { CapsuleCommandDescriptor } from '@czap/core';

/** Presentation: group key → human label + chart order. */
const GROUP_CHART: ReadonlyArray<{ readonly key: string; readonly label: string }> = [
  { key: 'castoff', label: 'Cast off (dev experience)' },
  { key: 'compose', label: 'Compose + render (scene + asset)' },
  { key: 'manifest', label: 'Manifest (capsule)' },
  { key: 'ship', label: 'Ship out (quay-side, release)' },
  { key: 'servers', label: 'Servers' },
];

const HINTS = `Hints (a working deck):
  - First time? Run \`pnpm shakedown\` for the full first-run aggregate.
  - Stuck? \`czap doctor\` triages your environment; \`czap doctor --fix\` repairs.
  - All commands emit JSON receipts on stdout; pretty output is on stderr.
  - Suppress color: NO_COLOR=1.  Force color in CI logs: FORCE_COLOR=1.
  - Releasing? \`czap ship\` ties packages up at the quay; \`czap verify\` checks the receipt before they sail.

Docs:
  https://github.com/heyoub/LiteShip
`;

/** Render the grouped verb chart from the catalog. */
function renderChart(catalog: readonly CapsuleCommandDescriptor[]): string {
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
  // Any command whose group isn't in the chart still gets listed (loud, not lost).
  const leftover = catalog.filter((d) => !seen.has(d.name));
  renderGroup('Other', leftover);

  return sections.join('\n\n');
}

const USAGE = `czap — LiteShip CLI

Usage:
  czap <command> [args]

${renderChart(COMMAND_CATALOG)}

${HINTS}`;

/** Print the help text to stdout. Returns exit code 0. */
export function help(): number {
  process.stdout.write(USAGE);
  return 0;
}

/** Exported for tests so they don't depend on the formatted shape. */
export const HELP_TEXT = USAGE;
