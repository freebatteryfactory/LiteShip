import { describe, it, expect } from 'vitest';
import { run } from '@liteship/cli';
import { captureCli } from './capture.js';

describe('liteship gauntlet', () => {
  it('dry-run emits the canonical phase list', async () => {
    const { exit, stdout } = await captureCli(() => run(['gauntlet', '--dry-run']));
    expect(exit).toBe(0);
    const receipt = JSON.parse(stdout.trim().split('\n').pop()!);
    expect(receipt.status).toBe('ok');
    expect(receipt.command).toBe('gauntlet');
    expect(Array.isArray(receipt.phases)).toBe(true);
    expect(receipt.phases.length).toBeGreaterThan(10);
    expect(receipt.phases[0]).toBe('environment-check');
    expect(receipt.argvPolicy).toBe('reject-unknown');
  });
});
