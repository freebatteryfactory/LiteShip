/**
 * Cold-checkout validation for authored pull-request intent metadata.
 *
 * Canonical addressing and permission-backed admission remain owned by the
 * delivery-evidence collector. This pre-plan authority catches malformed or
 * sponsor-mismatched declarations before the expensive job matrix starts,
 * using only GitHub's signed event payload and dependency-free source.
 */

import { readFileSync } from 'node:fs';
import { validateGitHubChangeIntentDeclaration } from './lib/github-change-intent-declaration.js';

const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new TypeError(`${name} is required`);
  return value;
};

const eventName = requireEnv('GITHUB_EVENT_NAME');
const payload = JSON.parse(readFileSync(requireEnv('GITHUB_EVENT_PATH'), 'utf8')) as unknown;
const result = validateGitHubChangeIntentDeclaration(eventName, payload);
process.stdout.write(
  result.kind === 'declared'
    ? `change-intent declaration validated for ${result.sponsor}\n`
    : `${result.event} uses fail-broad change intent; no authored PR block to validate\n`,
);
