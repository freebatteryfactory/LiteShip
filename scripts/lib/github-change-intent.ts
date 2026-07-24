/** Pure GitHub-host adapter for the internal ChangeIntent kernel. No network access. @module */

import {
  admitChangeIntent,
  buildChangeIntent,
  type ChangeIntent,
  type ChangeIntentAdmission,
} from './change-intent.js';

export type GitHubChangeIntentEvent = 'pull-request' | 'push' | 'tag';
export type GitHubRepositoryPermission = 'admin' | 'maintain' | 'write' | 'triage' | 'read' | 'none';

export interface GitHubChangeIntentInput {
  readonly event: GitHubChangeIntentEvent;
  readonly body: string | null;
  readonly sourceSha: string;
  readonly repository: {
    readonly owner: string;
    readonly name: string;
    readonly nodeId: string;
  };
  readonly actor: {
    readonly login: string;
    readonly permission: GitHubRepositoryPermission;
  };
}

export interface AdmittedGitHubChangeIntent {
  readonly origin: 'declared' | 'push-fail-broad' | 'tag-fail-broad';
  readonly intent: ChangeIntent;
  readonly admission: Extract<ChangeIntentAdmission, { readonly accepted: true }>;
}

type RecordValue = Record<string, unknown>;

const DECLARED_KEYS = [
  'sponsor',
  'hypothesis',
  'affectedUserSurface',
  'expectedOutcome',
  'guardrails',
  'reversibility',
  'actorClass',
  'uncertainty',
] as const;

function exactRecord(value: unknown, path: string, keys: readonly string[]): RecordValue {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  ) {
    throw new TypeError(`${path} must be a plain object`);
  }
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key !== 'string')) throw new TypeError(`${path} contains a symbol key`);
  const actual = (ownKeys as string[]).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new TypeError(`${path} keys must be exactly: ${expected.join(', ')}`);
  }
  return value as RecordValue;
}

function stringValue(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) throw new TypeError(`${path} must be a non-empty string`);
  return value.trim();
}

function parseHostInput(value: unknown): GitHubChangeIntentInput {
  const input = exactRecord(value, 'githubChangeIntent', ['event', 'body', 'sourceSha', 'repository', 'actor']);
  if (!['pull-request', 'push', 'tag'].includes(String(input['event']))) {
    throw new TypeError('githubChangeIntent.event is invalid');
  }
  if (input['body'] !== null && typeof input['body'] !== 'string') {
    throw new TypeError('githubChangeIntent.body must be a string or null');
  }
  const repository = exactRecord(input['repository'], 'githubChangeIntent.repository', ['owner', 'name', 'nodeId']);
  const actor = exactRecord(input['actor'], 'githubChangeIntent.actor', ['login', 'permission']);
  if (!['admin', 'maintain', 'write', 'triage', 'read', 'none'].includes(String(actor['permission']))) {
    throw new TypeError('githubChangeIntent.actor.permission is invalid');
  }
  return {
    event: input['event'] as GitHubChangeIntentEvent,
    body: input['body'] as string | null,
    sourceSha: stringValue(input['sourceSha'], 'githubChangeIntent.sourceSha'),
    repository: {
      owner: stringValue(repository['owner'], 'githubChangeIntent.repository.owner'),
      name: stringValue(repository['name'], 'githubChangeIntent.repository.name'),
      nodeId: stringValue(repository['nodeId'], 'githubChangeIntent.repository.nodeId'),
    },
    actor: {
      login: stringValue(actor['login'], 'githubChangeIntent.actor.login'),
      permission: actor['permission'] as GitHubRepositoryPermission,
    },
  };
}

function declaredBlock(body: string): RecordValue | null {
  const marker = '<!-- liteship-change-intent';
  const markerCount = body.split(marker).length - 1;
  if (markerCount === 0) return null;
  if (markerCount !== 1) throw new TypeError('GitHub body must contain exactly one liteship-change-intent block');
  const match = body.match(/<!-- liteship-change-intent\r?\n([\s\S]*?)\r?\n-->/u);
  if (match === null) throw new TypeError('liteship-change-intent block is malformed');
  let parsed: unknown;
  try {
    parsed = JSON.parse(match[1]!);
  } catch (error) {
    throw new TypeError(`liteship-change-intent JSON is malformed: ${String(error)}`);
  }
  return exactRecord(parsed, 'liteship-change-intent', DECLARED_KEYS);
}

function fallbackDeclaration(event: 'push' | 'tag', actor: string): RecordValue {
  return {
    sponsor: actor,
    hypothesis: `${event} has no authored change-intent block; select full authority without inferring public claims.`,
    affectedUserSurface: { visibility: 'internal', areas: ['repository maintenance'] },
    expectedOutcome: 'Run fail-broad verification and retain explicit uncertainty.',
    guardrails: ['do not infer public or trust-boundary intent', 'select full authority'],
    reversibility: { kind: 'reversible', rollback: 'Revert the admitted source commit.' },
    actorClass: 'automation',
    uncertainty: { level: 'high', unknowns: ['authored semantic intent is absent'] },
  };
}

function provenance(value: unknown, kind: 'github-verified' | 'agent-self-declared'): RecordValue {
  return { value, provenance: kind };
}

/**
 * Parse one declarative body block, bind trusted GitHub facts, and return only
 * an intent accepted by the existing ownership/provenance kernel.
 */
export function admitGitHubChangeIntent(value: unknown): AdmittedGitHubChangeIntent {
  const input = parseHostInput(value);
  const parsed = input.body === null ? null : declaredBlock(input.body);
  if (parsed === null && input.event === 'pull-request') {
    throw new TypeError('pull-request requires exactly one liteship-change-intent block');
  }
  const declaration = parsed ?? fallbackDeclaration(input.event as 'push' | 'tag', input.actor.login);
  const declaredSponsor = stringValue(declaration['sponsor'], 'liteship-change-intent.sponsor');
  if (declaredSponsor.toLowerCase() !== input.actor.login.toLowerCase()) {
    throw new TypeError('declared sponsor does not match the GitHub-verified actor');
  }
  const ownerPermission = input.actor.permission === 'admin' || input.actor.permission === 'maintain';
  const intent = buildChangeIntent({
    schemaVersion: 1,
    sponsor: provenance(
      { login: input.actor.login, ownership: ownerPermission ? 'code-owner' : 'none' },
      'github-verified',
    ),
    hypothesis: provenance(declaration['hypothesis'], 'agent-self-declared'),
    affectedUserSurface: provenance(declaration['affectedUserSurface'], 'agent-self-declared'),
    expectedOutcome: provenance(declaration['expectedOutcome'], 'agent-self-declared'),
    guardrails: provenance(declaration['guardrails'], 'agent-self-declared'),
    reversibility: provenance(declaration['reversibility'], 'agent-self-declared'),
    actorClass: provenance(declaration['actorClass'], 'agent-self-declared'),
    uncertainty: provenance(declaration['uncertainty'], 'agent-self-declared'),
    sourceSha: provenance(input.sourceSha, 'github-verified'),
    repositoryIdentity: provenance({ host: 'github.com', ...input.repository }, 'github-verified'),
  });
  const admission = admitChangeIntent(intent);
  if (!admission.accepted) {
    throw new TypeError(`GitHub change intent refused: ${admission.reasons.join(', ')}`);
  }
  return Object.freeze({
    origin: parsed === null ? `${input.event}-fail-broad` : 'declared',
    intent,
    admission,
  }) as AdmittedGitHubChangeIntent;
}
