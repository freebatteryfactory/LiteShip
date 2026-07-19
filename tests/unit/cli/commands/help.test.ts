/**
 * Unit tests for `liteship help`. Helps a human run the right verb;
 * its output is plain text, not a JSON receipt, on purpose.
 */
import { describe, it, expect } from 'vitest';
import { help, HELP_TEXT } from '../../../../packages/cli/src/commands/help.js';
import { captureCli } from '../../../integration/cli/capture.js';

describe('help command', () => {
  it('exits 0 and prints usage to stdout', async () => {
    const { exit, stdout } = await captureCli(async () => help());
    expect(exit).toBe(0);
    expect(stdout).toContain('liteship');
    expect(stdout).toContain('Usage');
  });

  it('mentions the core verbs so newcomers can grep for them', () => {
    for (const verb of ['doctor', 'describe', 'glossary', 'version', 'scene', 'asset', 'capsule', 'ship', 'gauntlet', 'mcp']) {
      expect(HELP_TEXT).toContain(verb);
    }
  });

  it('points the human at `pnpm shakedown` and `liteship doctor` for triage', () => {
    // `pnpm shakedown` (renamed from `pnpm setup` to avoid collision with
    // pnpm's built-in `pnpm setup` installer command) — PR #3 P1 fix.
    expect(HELP_TEXT).toContain('pnpm shakedown');
    expect(HELP_TEXT).toContain('liteship doctor');
  });
});
