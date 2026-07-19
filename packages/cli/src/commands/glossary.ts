/**
 * glossary (CLI adapter) — thin projection over `@liteship/command`'s glossary
 * command. The catalog + lookup are the single source in `@liteship/command`; this
 * adapter renders the JSON receipt to stdout and a pretty summary to stderr.
 *
 * @module
 */

import { glossaryCommand, GLOSSARY_ENTRIES, type GlossaryEntry, type GlossaryPayload } from '@liteship/command';
import { color, colorEnabled } from '../lib/ansi.js';
import { emit, emitError } from '../receipts.js';

// Re-exported so existing tests and tooling keep their import site stable.
export { GLOSSARY_ENTRIES };
export type { GlossaryEntry };

function prettyEntry(e: GlossaryEntry, on: boolean): string {
  const head = `${color('cyan', e.term, on)}  ${color('dim', `(${e.category})`, on)}`;
  const body = e.definition;
  const seeAlso =
    e.seeAlso && e.seeAlso.length > 0
      ? `  ${color('dim', 'see also:', on)} ${e.seeAlso.map((s) => color('cyan', s, on)).join(', ')}\n`
      : '';
  return `${head}\n  ${body}\n${seeAlso}`;
}

/** Execute the glossary command (CLI adapter over the shared registry command). */
export async function glossary(term: string | null, opts: { pretty?: boolean } = {}): Promise<number> {
  const result = await glossaryCommand.handler({ name: 'glossary', args: term ? { term } : {} }, {});
  const payload = result.payload as GlossaryPayload;

  if (result.status === 'failed') {
    emitError('glossary', `no entry for: ${term ?? '<missing>'}`);
    process.stderr.write(
      `Try one of: ${GLOSSARY_ENTRIES.map((e) => e.term)
        .slice(0, 8)
        .join(', ')} ...\n`,
    );
    return result.exitCode ?? 1;
  }

  // Preserve the exact stdout receipt shape: base envelope + payload fields.
  emit({
    status: result.status,
    command: result.command,
    timestamp: result.timestamp,
    term: payload.term,
    entries: payload.entries,
  });

  const wantPretty = opts.pretty ?? Boolean(process.stderr.isTTY);
  if (wantPretty) {
    const on = colorEnabled();
    process.stderr.write('\n');
    for (const e of payload.entries) process.stderr.write(prettyEntry(e, on) + '\n');
  }
  return 0;
}
