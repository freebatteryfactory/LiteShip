/** Internal, content-addressed change-intent evidence. Not a public package API. @module */

import { createHash } from 'node:crypto';
import { canonicalJson } from '@liteship/canonical';

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

/**
 * Explicit autonomy levels (issue #163) — the CEILING the executing actor held
 * for this change, ordered: propose < edit < execute < approve < release.
 * `approve` and `release` are human-owned: a declared agent/automation
 * execution claiming either is refused ({@link admitChangeIntent},
 * `execution-self-approval-refused`) — deterministic controls and human
 * ownership retain the gavel. And the HUMAN classification itself must be
 * host-verified to unlock those tiers: an actorClass whose provenance is
 * merely self-declared cannot claim approve/release
 * (`privileged-autonomy-actor-not-verified`, PR #190 review) — otherwise an
 * agent simply declares itself human and walks past both refusals.
 */
export type ChangeIntentAutonomy = 'propose' | 'edit' | 'execute' | 'approve' | 'release';

/** Granted tool authority classes an execution declares. */
export type ChangeIntentToolScope = 'read' | 'write' | 'network' | 'release';

/** A sha256 content address — the ONLY representable form for prompt/context/policy provenance. */
export type Sha256Address = `sha256:${string}`;

/**
 * Agent execution provenance (issue #163, schemaVersion 2).
 *
 * Digests-only by construction: prompt/context/tool-policy provenance is a
 * `sha256:` address or an EXPLICIT `null` ("unavailable, declared") — raw
 * private context is structurally unrepresentable in the durable record (the
 * exact-key parser refuses any free-text field this block does not declare).
 * The action/result trace is likewise an addressed reference, never inline.
 */
export interface ChangeIntentExecution {
  /** Stable execution identity for the agent run (session/run token). */
  readonly executionId: string;
  /** Model/provider identity, or an explicit null when unavailable. */
  readonly model: { readonly provider: string; readonly id: string } | null;
  /** Granted tool scopes — the authority the run actually held. */
  readonly toolScopes: readonly ChangeIntentToolScope[];
  /** Bounded budgets where available; null = unbounded/unavailable, declared. */
  readonly budgets: { readonly wallClockMs: number | null; readonly tokens: number | null };
  /** Content addresses of the governing prompt/context/tool-policy — never the bytes. */
  readonly digests: {
    readonly prompt: Sha256Address | null;
    readonly context: Sha256Address | null;
    readonly toolPolicy: Sha256Address | null;
  };
  /** Addressed action/result trace reference, or an explicit null. */
  readonly actionTrace: { readonly path: string; readonly digest: Sha256Address } | null;
  /** The autonomy ceiling this run held. */
  readonly autonomy: ChangeIntentAutonomy;
}

export interface ChangeIntentUnsigned {
  readonly schemaVersion: 2;
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
  /** Execution provenance, or an EXPLICIT null (absence is unrepresentable — exact keys). */
  readonly execution: Provenanced<ChangeIntentExecution | null>;
}

export interface ChangeIntent extends ChangeIntentUnsigned {
  readonly intentId: `sha256:${string}`;
}

export type ChangeIntentRefusalCode =
  | 'missing-sponsor-ownership'
  | 'public-or-trust-sponsor-not-github-verified'
  | 'public-or-trust-sponsor-lacks-owner-authority'
  | 'public-or-trust-source-not-github-verified'
  | 'public-or-trust-repository-not-github-verified'
  | 'agent-execution-not-declared'
  | 'execution-self-approval-refused'
  | 'privileged-autonomy-actor-not-verified';

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
  'execution',
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

function parseSha256Address(value: unknown, path: string): Sha256Address {
  const address = nonEmptyString(value, path);
  if (!/^sha256:[0-9a-f]{64}$/u.test(address)) {
    throw new TypeError(`${path} must be a sha256:<64-hex> content address (never raw content)`);
  }
  return address as Sha256Address;
}

function nullOr<T>(value: unknown, path: string, parseValue: (candidate: unknown, valuePath: string) => T): T | null {
  return value === null ? null : parseValue(value, path);
}

function nullOrBudget(value: unknown, path: string): number | null {
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
    throw new TypeError(`${path} must be a positive integer or an explicit null`);
  }
  return value;
}

function parseExecution(value: unknown, path: string): ChangeIntentExecution | null {
  if (value === null) return null;
  const record = exactRecord(value, path, [
    'executionId',
    'model',
    'toolScopes',
    'budgets',
    'digests',
    'actionTrace',
    'autonomy',
  ]);
  const executionId = nonEmptyString(record['executionId'], `${path}.executionId`);
  if (executionId.length > 128 || !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/u.test(executionId)) {
    throw new TypeError(`${path}.executionId must be a stable opaque token (<=128 chars, [A-Za-z0-9._:-])`);
  }
  const budgets = exactRecord(record['budgets'], `${path}.budgets`, ['wallClockMs', 'tokens']);
  const digests = exactRecord(record['digests'], `${path}.digests`, ['prompt', 'context', 'toolPolicy']);
  const scopes = stringSet(record['toolScopes'], `${path}.toolScopes`);
  const admittedScopes: readonly ChangeIntentToolScope[] = ['network', 'read', 'release', 'write'];
  for (const scope of scopes) {
    if (!admittedScopes.includes(scope as ChangeIntentToolScope)) {
      throw new TypeError(`${path}.toolScopes must be a subset of: ${admittedScopes.join(', ')}`);
    }
  }
  return {
    executionId,
    model: nullOr(record['model'], `${path}.model`, (candidate, modelPath) => {
      const modelRecord = exactRecord(candidate, modelPath, ['provider', 'id']);
      return {
        provider: nonEmptyString(modelRecord['provider'], `${modelPath}.provider`),
        id: nonEmptyString(modelRecord['id'], `${modelPath}.id`),
      };
    }),
    toolScopes: scopes as readonly ChangeIntentToolScope[],
    budgets: {
      wallClockMs: nullOrBudget(budgets['wallClockMs'], `${path}.budgets.wallClockMs`),
      tokens: nullOrBudget(budgets['tokens'], `${path}.budgets.tokens`),
    },
    digests: {
      prompt: nullOr(digests['prompt'], `${path}.digests.prompt`, parseSha256Address),
      context: nullOr(digests['context'], `${path}.digests.context`, parseSha256Address),
      toolPolicy: nullOr(digests['toolPolicy'], `${path}.digests.toolPolicy`, parseSha256Address),
    },
    actionTrace: nullOr(record['actionTrace'], `${path}.actionTrace`, (candidate, tracePath) => {
      const traceRecord = exactRecord(candidate, tracePath, ['path', 'digest']);
      return {
        path: nonEmptyString(traceRecord['path'], `${tracePath}.path`),
        digest: parseSha256Address(traceRecord['digest'], `${tracePath}.digest`),
      };
    }),
    autonomy: enumValue(record['autonomy'], `${path}.autonomy`, ['propose', 'edit', 'execute', 'approve', 'release']),
  };
}

function parseUnsigned(value: unknown): ChangeIntentUnsigned {
  const record = exactRecord(value, 'changeIntent', UNSIGNED_KEYS);
  if (record['schemaVersion'] !== 2) throw new TypeError('changeIntent.schemaVersion must be 2');
  return {
    schemaVersion: 2,
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
    execution: provenanced(record['execution'], 'changeIntent.execution', parseExecution),
  };
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
  // Issue #163 — execution provenance fail-closed rules:
  //  - an AGENT actor without a declared execution identity is refused (a run
  //    nobody can attribute must never carry a change);
  //  - a declared non-human execution claiming the human-owned autonomy tiers
  //    (approve/release) is refused — an agent or workflow cannot self-approve.
  //    An AGENT always requires it, and so does any SELF-DECLARED non-human:
  //    an agent could otherwise dodge attribution by declaring itself
  //    'automation' (PR #190 review, confirmed P1). A github-verified
  //    automation classification — the host-DERIVED fail-broad fallback for
  //    push/tag events with no authored block — legitimately carries null.
  if (
    intent.execution.value === null &&
    intent.actorClass.value !== 'human' &&
    (intent.actorClass.value === 'agent' || intent.actorClass.provenance !== 'github-verified')
  ) {
    reasons.push('agent-execution-not-declared');
  }
  if (
    intent.execution.value !== null &&
    intent.actorClass.value !== 'human' &&
    ['approve', 'release'].includes(intent.execution.value.autonomy)
  ) {
    reasons.push('execution-self-approval-refused');
  }
  //  - the human-owned tiers bind to a VERIFIED human, not a self-described
  //    one: the GitHub adapter stamps actorClass 'agent-self-declared' (it
  //    verifies the sponsor login and permission, never the author's species),
  //    so trusting the claimed class would let an agent declare itself human
  //    and hold approve/release (PR #190 review, confirmed). Same idiom as the
  //    public-surface github-verified requirements below.
  if (
    intent.execution.value !== null &&
    ['approve', 'release'].includes(intent.execution.value.autonomy) &&
    intent.actorClass.provenance !== 'github-verified'
  ) {
    reasons.push('privileged-autonomy-actor-not-verified');
  }
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
