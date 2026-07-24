/** Internal, content-addressed change-intent evidence. Not a public package API. @module */

import { createHash } from 'node:crypto';

export type ChangeIntentProvenance = 'github-verified' | 'agent-self-declared';
export type ChangeIntentActorClass = 'human' | 'agent' | 'automation';
export type ChangeSurfaceVisibility = 'internal' | 'public' | 'trust-boundary';
export type SponsorOwnership = 'repository-owner' | 'code-owner' | 'maintainer' | 'none';

export interface Provenanced<T> {
  readonly value: T;
  readonly provenance: ChangeIntentProvenance;
}

export interface ChangeIntentSponsor {
  readonly login: string;
  readonly ownership: SponsorOwnership;
}

export interface ChangeIntentSurface {
  readonly visibility: ChangeSurfaceVisibility;
  readonly areas: readonly string[];
}

export type ChangeIntentReversibility =
  | { readonly kind: 'reversible'; readonly rollback: string }
  | { readonly kind: 'irreversible'; readonly rationale: string };

export interface ChangeIntentUncertainty {
  readonly level: 'low' | 'medium' | 'high';
  readonly unknowns: readonly string[];
}

export interface ChangeIntentRepositoryIdentity {
  readonly host: 'github.com';
  readonly owner: string;
  readonly name: string;
  readonly nodeId: string;
}

export interface ChangeIntentUnsigned {
  readonly schemaVersion: 1;
  readonly sponsor: Provenanced<ChangeIntentSponsor>;
  readonly hypothesis: Provenanced<string>;
  readonly affectedUserSurface: Provenanced<ChangeIntentSurface>;
  readonly expectedOutcome: Provenanced<string>;
  readonly guardrails: Provenanced<readonly string[]>;
  readonly reversibility: Provenanced<ChangeIntentReversibility>;
  readonly actorClass: Provenanced<ChangeIntentActorClass>;
  readonly uncertainty: Provenanced<ChangeIntentUncertainty>;
  readonly sourceSha: Provenanced<string>;
  readonly repositoryIdentity: Provenanced<ChangeIntentRepositoryIdentity>;
}

export interface ChangeIntent extends ChangeIntentUnsigned {
  readonly intentId: `sha256:${string}`;
}

export type ChangeIntentRefusalCode =
  | 'missing-sponsor-ownership'
  | 'public-or-trust-sponsor-not-github-verified'
  | 'public-or-trust-sponsor-lacks-owner-authority'
  | 'public-or-trust-source-not-github-verified'
  | 'public-or-trust-repository-not-github-verified';

export type ChangeIntentAdmission =
  | { readonly accepted: true; readonly intentId: ChangeIntent['intentId']; readonly reasons: readonly [] }
  | {
      readonly accepted: false;
      readonly intentId: ChangeIntent['intentId'];
      readonly reasons: readonly ChangeIntentRefusalCode[];
    };

type RecordValue = Record<string, unknown>;

const UNSIGNED_KEYS = [
  'schemaVersion',
  'sponsor',
  'hypothesis',
  'affectedUserSurface',
  'expectedOutcome',
  'guardrails',
  'reversibility',
  'actorClass',
  'uncertainty',
  'sourceSha',
  'repositoryIdentity',
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

function nonEmptyString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) throw new TypeError(`${path} must be a non-empty string`);
  return value.trim();
}

function enumValue<const T extends string>(value: unknown, path: string, admitted: readonly T[]): T {
  if (typeof value !== 'string' || !admitted.includes(value as T)) {
    throw new TypeError(`${path} must be one of: ${admitted.join(', ')}`);
  }
  return value as T;
}

function stringSet(value: unknown, path: string, options: { readonly allowEmpty?: boolean } = {}): readonly string[] {
  if (!Array.isArray(value)) throw new TypeError(`${path} must be an array`);
  if (value.length === 0 && options.allowEmpty !== true) throw new TypeError(`${path} must not be empty`);
  const normalized = value.map((entry, index) => nonEmptyString(entry, `${path}[${index}]`));
  if (new Set(normalized).size !== normalized.length) throw new TypeError(`${path} contains duplicate values`);
  return normalized.sort((left, right) => left.localeCompare(right));
}

function provenanced<T>(
  value: unknown,
  path: string,
  parseValue: (candidate: unknown, valuePath: string) => T,
): Provenanced<T> {
  const record = exactRecord(value, path, ['value', 'provenance']);
  return {
    value: parseValue(record['value'], `${path}.value`),
    provenance: enumValue(record['provenance'], `${path}.provenance`, ['github-verified', 'agent-self-declared']),
  };
}

function parseSponsor(value: unknown, path: string): ChangeIntentSponsor {
  const record = exactRecord(value, path, ['login', 'ownership']);
  const login = nonEmptyString(record['login'], `${path}.login`);
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/u.test(login)) {
    throw new TypeError(`${path}.login must be a GitHub login`);
  }
  return {
    login,
    ownership: enumValue(record['ownership'], `${path}.ownership`, [
      'repository-owner',
      'code-owner',
      'maintainer',
      'none',
    ]),
  };
}

function parseSurface(value: unknown, path: string): ChangeIntentSurface {
  const record = exactRecord(value, path, ['visibility', 'areas']);
  return {
    visibility: enumValue(record['visibility'], `${path}.visibility`, ['internal', 'public', 'trust-boundary']),
    areas: stringSet(record['areas'], `${path}.areas`),
  };
}

function parseReversibility(value: unknown, path: string): ChangeIntentReversibility {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${path} must be a plain object`);
  }
  const kind = (value as RecordValue)['kind'];
  if (kind === 'reversible') {
    const record = exactRecord(value, path, ['kind', 'rollback']);
    return { kind, rollback: nonEmptyString(record['rollback'], `${path}.rollback`) };
  }
  if (kind === 'irreversible') {
    const record = exactRecord(value, path, ['kind', 'rationale']);
    return { kind, rationale: nonEmptyString(record['rationale'], `${path}.rationale`) };
  }
  throw new TypeError(`${path}.kind must be reversible or irreversible`);
}

function parseUncertainty(value: unknown, path: string): ChangeIntentUncertainty {
  const record = exactRecord(value, path, ['level', 'unknowns']);
  return {
    level: enumValue(record['level'], `${path}.level`, ['low', 'medium', 'high']),
    unknowns: stringSet(record['unknowns'], `${path}.unknowns`, { allowEmpty: true }),
  };
}

function parseRepository(value: unknown, path: string): ChangeIntentRepositoryIdentity {
  const record = exactRecord(value, path, ['host', 'owner', 'name', 'nodeId']);
  if (record['host'] !== 'github.com') throw new TypeError(`${path}.host must be github.com`);
  const owner = nonEmptyString(record['owner'], `${path}.owner`);
  const name = nonEmptyString(record['name'], `${path}.name`);
  if (!/^[A-Za-z0-9_.-]+$/u.test(owner) || !/^[A-Za-z0-9_.-]+$/u.test(name)) {
    throw new TypeError(`${path} owner and name must be GitHub repository identifiers`);
  }
  return {
    host: 'github.com',
    owner,
    name,
    nodeId: nonEmptyString(record['nodeId'], `${path}.nodeId`),
  };
}

function parseSha(value: unknown, path: string): string {
  const sha = nonEmptyString(value, path);
  if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u.test(sha)) throw new TypeError(`${path} must be a full Git SHA`);
  return sha;
}

function parseUnsigned(value: unknown): ChangeIntentUnsigned {
  const record = exactRecord(value, 'changeIntent', UNSIGNED_KEYS);
  if (record['schemaVersion'] !== 1) throw new TypeError('changeIntent.schemaVersion must be 1');
  return {
    schemaVersion: 1,
    sponsor: provenanced(record['sponsor'], 'changeIntent.sponsor', parseSponsor),
    hypothesis: provenanced(record['hypothesis'], 'changeIntent.hypothesis', nonEmptyString),
    affectedUserSurface: provenanced(record['affectedUserSurface'], 'changeIntent.affectedUserSurface', parseSurface),
    expectedOutcome: provenanced(record['expectedOutcome'], 'changeIntent.expectedOutcome', nonEmptyString),
    guardrails: provenanced(record['guardrails'], 'changeIntent.guardrails', stringSet),
    reversibility: provenanced(record['reversibility'], 'changeIntent.reversibility', parseReversibility),
    actorClass: provenanced(record['actorClass'], 'changeIntent.actorClass', (candidate, path) =>
      enumValue(candidate, path, ['human', 'agent', 'automation']),
    ),
    uncertainty: provenanced(record['uncertainty'], 'changeIntent.uncertainty', parseUncertainty),
    sourceSha: provenanced(record['sourceSha'], 'changeIntent.sourceSha', parseSha),
    repositoryIdentity: provenanced(record['repositoryIdentity'], 'changeIntent.repositoryIdentity', parseRepository),
  };
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('canonical change intent cannot contain a non-finite number');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (typeof value === 'object') {
    const record = value as RecordValue;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(',')}}`;
  }
  throw new TypeError(`canonical change intent cannot contain ${typeof value}`);
}

function digest(unsigned: ChangeIntentUnsigned): ChangeIntent['intentId'] {
  return `sha256:${createHash('sha256').update(canonicalJson(unsigned), 'utf8').digest('hex')}`;
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value as RecordValue)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

/** Parse, normalize, address, and deeply freeze an internal change intent. */
export function buildChangeIntent(input: unknown): ChangeIntent {
  const unsigned = parseUnsigned(input);
  return deepFreeze({ ...unsigned, intentId: digest(unsigned) });
}

/** Parse a serialized addressed intent and independently verify its identity. */
export function parseChangeIntent(input: unknown): ChangeIntent {
  const record = exactRecord(input, 'changeIntent', [...UNSIGNED_KEYS, 'intentId']);
  const intentId = nonEmptyString(record['intentId'], 'changeIntent.intentId');
  if (!/^sha256:[0-9a-f]{64}$/u.test(intentId)) throw new TypeError('changeIntent.intentId must be sha256:<64-hex>');
  const unsignedInput = Object.fromEntries(UNSIGNED_KEYS.map((key) => [key, record[key]]));
  const rebuilt = buildChangeIntent(unsignedInput);
  if (rebuilt.intentId !== intentId) throw new TypeError('changeIntent identity mismatch');
  return rebuilt;
}

/** Apply ownership/provenance admission without mutating or re-addressing the intent. */
export function admitChangeIntent(intent: ChangeIntent): ChangeIntentAdmission {
  const reasons: ChangeIntentRefusalCode[] = [];
  if (intent.sponsor.value.ownership === 'none') reasons.push('missing-sponsor-ownership');
  if (intent.affectedUserSurface.value.visibility !== 'internal') {
    if (intent.sponsor.provenance !== 'github-verified') {
      reasons.push('public-or-trust-sponsor-not-github-verified');
    }
    if (!['repository-owner', 'code-owner'].includes(intent.sponsor.value.ownership)) {
      reasons.push('public-or-trust-sponsor-lacks-owner-authority');
    }
    if (intent.sourceSha.provenance !== 'github-verified') {
      reasons.push('public-or-trust-source-not-github-verified');
    }
    if (intent.repositoryIdentity.provenance !== 'github-verified') {
      reasons.push('public-or-trust-repository-not-github-verified');
    }
  }
  return deepFreeze(
    reasons.length === 0
      ? { accepted: true as const, intentId: intent.intentId, reasons: [] as const }
      : { accepted: false as const, intentId: intent.intentId, reasons: reasons.sort() },
  );
}
