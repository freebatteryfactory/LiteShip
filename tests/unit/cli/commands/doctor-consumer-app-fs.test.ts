import { chmodSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { doctor } from '../../../../packages/cli/src/commands/doctor.js';
import { captureCli } from '../../../integration/cli/capture.js';
import { chmodDenyUntestableOnWindows } from '../../../helpers/capabilities.js';

const lastStderrReceipt = (stderr: string): { command: string; error: string } => {
  const line = stderr.trim().split('\n').filter(Boolean).at(-1);
  if (!line) throw new Error('no stderr receipt');
  return JSON.parse(line) as { command: string; error: string };
};

describe('doctor --target consumer-app fs errors (#117)', () => {
  test.skipIf(chmodDenyUntestableOnWindows)(
    'read failure yields structured emitError + exit 1, not an uncaught rejection',
    async () => {
      const dir = mkdtempSync(join(tmpdir(), 'czap-doctor-consumer-fs-'));
      const src = join(dir, 'src');
      mkdirSync(src, { recursive: true });
      writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'consumer-app', version: '1.0.0' }));
      const target = join(src, 'page.ts');
      writeFileSync(target, 'export const x = 1;');
      chmodSync(target, 0o000);

      try {
        const { exit, stderr } = await captureCli(() => doctor({ pretty: false, cwd: dir, target: 'consumer-app' }));
        expect(exit).toBe(1);
        const err = lastStderrReceipt(stderr);
        expect(err.command).toBe('doctor');
        expect(err.error).toMatch(/EACCES|permission/i);
      } finally {
        chmodSync(target, 0o644);
      }
    },
  );
});
