/**
 * `create-liteship` entrypoint — the `npm create liteship` scaffolder.
 *
 * `run(argv)` is the bin surface (bin/create-liteship.mjs calls it);
 * {@link scaffold} is the reusable engine tests exercise directly.
 */

import { createInterface } from 'node:readline/promises';
import { relative } from 'node:path';
import { hasTag } from '@liteship/error';
import { scaffold } from './scaffold.js';

export {
  scaffold,
  defaultTemplateDir,
  projectNameFromDir,
  type ScaffoldOptions,
  type ScaffoldResult,
} from './scaffold.js';

/** Directory suggested when the user does not name one. */
export const DEFAULT_DIR = 'my-liteship-app';

const HELP = `create-liteship — scaffold a minimal Astro + @liteship project

Usage:
  npm create liteship [dir]
  pnpm create liteship [dir]

The target directory must be empty (or not exist yet). With no [dir],
you are prompted (default: ${DEFAULT_DIR}).
`;

/** Output sinks, injectable for tests (default: process stdout/stderr). */
export interface RunIo {
  readonly out: (text: string) => void;
  readonly err: (text: string) => void;
  /** Answers a prompt; default reads one line from stdin when it is a TTY. */
  readonly prompt?: (question: string) => Promise<string>;
}

const defaultIo: RunIo = {
  out: (text) => process.stdout.write(text),
  err: (text) => process.stderr.write(text),
};

const promptViaReadline = async (question: string): Promise<string> => {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await rl.question(question);
  } finally {
    rl.close();
  }
};

/** Resolve the target directory: argv wins, then prompt (TTY), then default. */
async function resolveTargetDir(dirArg: string | undefined, io: RunIo): Promise<string> {
  if (dirArg !== undefined && dirArg !== '') return dirArg;
  const prompt = io.prompt ?? (process.stdin.isTTY ? promptViaReadline : undefined);
  if (prompt === undefined) return DEFAULT_DIR;
  const answer = (await prompt(`Project directory (${DEFAULT_DIR}): `)).trim();
  return answer === '' ? DEFAULT_DIR : answer;
}

/**
 * CLI entry: `create-liteship [dir]`. Returns the process exit code
 * (0 scaffolded, 1 refused/failed) instead of calling process.exit so
 * the bin shim owns termination.
 */
export async function run(argv: readonly string[], io: RunIo = defaultIo): Promise<number> {
  if (argv.includes('--help') || argv.includes('-h')) {
    io.out(HELP);
    return 0;
  }
  const positional = argv.filter((arg) => !arg.startsWith('-'));
  if (positional.length > 1) {
    io.err(`create-liteship: expected at most one directory argument, got: ${positional.join(' ')}\n${HELP}`);
    return 1;
  }

  try {
    const targetDir = await resolveTargetDir(positional[0], io);
    const result = scaffold(targetDir);
    const cdPath = relative(process.cwd(), result.projectDir) || '.';
    io.out(
      `\nScaffolded ${result.projectName} (${result.files.length} files) into ${result.projectDir}\n\n` +
        `Next steps:\n` +
        `  cd ${cdPath}\n` +
        `  pnpm install   (or npm install)\n` +
        `  pnpm dev       (or npm run dev)\n\n` +
        `Verify the project any time with:\n` +
        `  liteship check --profile quick\n\n` +
        `Then edit src/pages/index.astro — defineBoundary, defineStyle, and\n` +
        `adaptiveAttrs() all share one boundary (src/boundaries/).\n`,
    );
    return 0;
  } catch (error) {
    if (hasTag(error, 'ValidationError')) {
      io.err(`${error.message}\n`);
      return 1;
    }
    io.err(`create-liteship: unexpected failure: ${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}
