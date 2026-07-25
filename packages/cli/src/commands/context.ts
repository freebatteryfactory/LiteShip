/**
 * context (CLI adapter) — thin projection over `@liteship/command`'s context
 * command. `context --task <id>` prints the ordered file/check/test pointers for a
 * repo task; `context --subject <symbol>` recovers a curated facade contract.
 * The catalog + lookup are the single source in `@liteship/command`.
 * Emits the structured JSON receipt to stdout and a pretty list to stderr (unless
 * `--json`).
 *
 * @module
 */

import { contextCommand, CONTEXT_TASK_IDS, type ContextPayload } from '@liteship/command';
import { color, colorEnabled } from '../lib/ansi.js';
import { emit, emitError } from '../receipts.js';

/** Execute the context command (CLI adapter over the shared registry command). */
export async function context(
  task: string | null,
  opts: { json?: boolean; pretty?: boolean } = {},
  subject: string | null = null,
): Promise<number> {
  if ((task === null) === (subject === null) || task === '' || subject === '') {
    emitError(
      'context',
      'cli/usage',
      'usage: liteship context (--task <id> | --subject <symbol>)',
      `choose exactly one; valid tasks: ${CONTEXT_TASK_IDS.join(', ')}`,
    );
    return 1;
  }

  const result = await contextCommand.handler(
    { name: 'context', args: { ...(task === null ? {} : { task }), ...(subject === null ? {} : { subject }) } },
    {},
  );
  const payload = result.payload as ContextPayload;

  if (result.status === 'failed') {
    emitError(
      'context',
      'cli/not-found',
      task === null ? `unknown public subject: ${subject}` : `unknown task: ${task}`,
      task === null
        ? 'use liteship describe --format=json to inspect the curated surface'
        : `valid tasks: ${CONTEXT_TASK_IDS.join(', ')}`,
    );
    return result.exitCode ?? 1;
  }

  // Preserve a stable stdout receipt: base envelope + payload fields.
  emit({
    status: result.status,
    command: result.command,
    timestamp: result.timestamp,
    task: payload.task,
    subject: payload.subject,
    title: payload.title,
    summary: payload.summary,
    pointers: payload.pointers,
    publicSurface: payload.publicSurface,
  });

  const wantPretty = opts.pretty ?? (!opts.json && Boolean(process.stderr.isTTY));
  if (wantPretty) {
    const on = colorEnabled();
    process.stderr.write(`\n${color('cyan', payload.title, on)}\n  ${payload.summary}\n\n`);
    for (const pointer of payload.pointers) {
      const tag = pointer.checkId ? `${pointer.kind} ${pointer.checkId}` : pointer.kind;
      process.stderr.write(
        `  ${color('dim', `[${tag}]`, on)} ${color('cyan', pointer.path, on)}\n    ${pointer.note}\n`,
      );
    }
  }
  return 0;
}
