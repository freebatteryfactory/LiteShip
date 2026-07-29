/** Cold-safe parser for the declarative GitHub change-intent block. @module */

/** Declared agent-execution provenance (issue #163) — digests-only, or an explicit null. */
export interface GitHubChangeIntentExecutionDeclaration {
  readonly executionId: string;
  readonly model: { readonly provider: string; readonly id: string } | null;
  readonly toolScopes: readonly ('read' | 'write' | 'network' | 'release')[];
  readonly budgets: { readonly wallClockMs: number | null; readonly tokens: number | null };
  readonly digests: {
    readonly prompt: string | null;
    readonly context: string | null;
    readonly toolPolicy: string | null;
  };
  readonly actionTrace: { readonly path: string; readonly digest: string } | null;
  readonly autonomy: 'propose' | 'edit' | 'execute' | 'approve' | 'release';
}

export interface GitHubChangeIntentDeclaration {
  readonly sponsor: string;
  readonly hypothesis: string;
  readonly affectedUserSurface: {
    readonly visibility: 'internal' | 'public' | 'trust-boundary';
    readonly areas: readonly string[];
  };
  readonly expectedOutcome: string;
  readonly guardrails: readonly string[];
  readonly reversibility:
    | { readonly kind: 'reversible'; readonly rollback: string }
    | { readonly kind: 'irreversible'; readonly rationale: string };
  readonly actorClass: 'human' | 'agent' | 'automation';
  readonly uncertainty: {
    readonly level: 'low' | 'medium' | 'high';
    readonly unknowns: readonly string[];
  };
  /** Execution provenance, REQUIRED as a key — null means "none, declared explicitly". */
  readonly execution: GitHubChangeIntentExecutionDeclaration | null;
}

const DECLARED_KEYS = [
  'sponsor',
  'hypothesis',
  'affectedUserSurface',
  'expectedOutcome',
  'guardrails',
  'reversibility',
  'actorClass',
  'uncertainty',
  'execution',
] as const;

type RecordValue = Record<string, unknown>;

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
  if (ownKeys.some((key) => typeof key !== 'string')) {
    throw new TypeError(`${path} contains a symbol key`);
  }
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

function stringSet(value: unknown, path: string, allowEmpty = false): readonly string[] {
  if (!Array.isArray(value)) throw new TypeError(`${path} must be an array`);
  if (!allowEmpty && value.length === 0) throw new TypeError(`${path} must not be empty`);
  const normalized = value.map((entry, index) => nonEmptyString(entry, `${path}[${index}]`));
  if (new Set(normalized).size !== normalized.length) throw new TypeError(`${path} contains duplicate values`);
  return normalized.sort((left, right) => left.localeCompare(right));
}

function reversibility(value: unknown): GitHubChangeIntentDeclaration['reversibility'] {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const kind = (value as RecordValue)['kind'];
    if (kind === 'reversible') {
      const record = exactRecord(value, 'liteship-change-intent.reversibility', ['kind', 'rollback']);
      return { kind, rollback: nonEmptyString(record['rollback'], 'liteship-change-intent.reversibility.rollback') };
    }
    if (kind === 'irreversible') {
      const record = exactRecord(value, 'liteship-change-intent.reversibility', ['kind', 'rationale']);
      return { kind, rationale: nonEmptyString(record['rationale'], 'liteship-change-intent.reversibility.rationale') };
    }
  }
  throw new TypeError('liteship-change-intent.reversibility.kind must be reversible or irreversible');
}

function sha256Address(value: unknown, path: string): string {
  const address = nonEmptyString(value, path);
  if (!/^sha256:[0-9a-f]{64}$/u.test(address)) {
    throw new TypeError(`${path} must be a sha256:<64-hex> content address (never raw content)`);
  }
  return address;
}

function nullOrBudget(value: unknown, path: string): number | null {
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new TypeError(`${path} must be a positive integer or an explicit null`);
  }
  return value;
}

/** Cold-safe mirror of the kernel's execution parser — validated before any CI spend. */
function executionDeclaration(value: unknown): GitHubChangeIntentExecutionDeclaration | null {
  if (value === null) return null;
  const path = 'liteship-change-intent.execution';
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
  for (const scope of scopes) {
    if (!['network', 'read', 'release', 'write'].includes(scope)) {
      throw new TypeError(`${path}.toolScopes must be a subset of: network, read, release, write`);
    }
  }
  let model: GitHubChangeIntentExecutionDeclaration['model'] = null;
  if (record['model'] !== null) {
    const modelRecord = exactRecord(record['model'], `${path}.model`, ['provider', 'id']);
    model = {
      provider: nonEmptyString(modelRecord['provider'], `${path}.model.provider`),
      id: nonEmptyString(modelRecord['id'], `${path}.model.id`),
    };
  }
  let actionTrace: GitHubChangeIntentExecutionDeclaration['actionTrace'] = null;
  if (record['actionTrace'] !== null) {
    const traceRecord = exactRecord(record['actionTrace'], `${path}.actionTrace`, ['path', 'digest']);
    actionTrace = {
      path: nonEmptyString(traceRecord['path'], `${path}.actionTrace.path`),
      digest: sha256Address(traceRecord['digest'], `${path}.actionTrace.digest`),
    };
  }
  return Object.freeze({
    executionId,
    model: model === null ? null : Object.freeze(model),
    toolScopes: Object.freeze(scopes) as GitHubChangeIntentExecutionDeclaration['toolScopes'],
    budgets: Object.freeze({
      wallClockMs: nullOrBudget(budgets['wallClockMs'], `${path}.budgets.wallClockMs`),
      tokens: nullOrBudget(budgets['tokens'], `${path}.budgets.tokens`),
    }),
    digests: Object.freeze({
      prompt: digests['prompt'] === null ? null : sha256Address(digests['prompt'], `${path}.digests.prompt`),
      context: digests['context'] === null ? null : sha256Address(digests['context'], `${path}.digests.context`),
      toolPolicy:
        digests['toolPolicy'] === null ? null : sha256Address(digests['toolPolicy'], `${path}.digests.toolPolicy`),
    }),
    actionTrace: actionTrace === null ? null : Object.freeze(actionTrace),
    autonomy: enumValue(record['autonomy'], `${path}.autonomy`, ['propose', 'edit', 'execute', 'approve', 'release']),
  });
}

/** Validate and normalize every authored field before any expensive CI job can start. */
function validateParsedGitHubChangeIntentDeclaration(value: unknown): GitHubChangeIntentDeclaration {
  const record = exactRecord(value, 'liteship-change-intent', DECLARED_KEYS);
  const surface = exactRecord(record['affectedUserSurface'], 'liteship-change-intent.affectedUserSurface', [
    'visibility',
    'areas',
  ]);
  const uncertainty = exactRecord(record['uncertainty'], 'liteship-change-intent.uncertainty', ['level', 'unknowns']);
  return Object.freeze({
    sponsor: nonEmptyString(record['sponsor'], 'liteship-change-intent.sponsor'),
    hypothesis: nonEmptyString(record['hypothesis'], 'liteship-change-intent.hypothesis'),
    affectedUserSurface: Object.freeze({
      visibility: enumValue(surface['visibility'], 'liteship-change-intent.affectedUserSurface.visibility', [
        'internal',
        'public',
        'trust-boundary',
      ]),
      areas: Object.freeze(stringSet(surface['areas'], 'liteship-change-intent.affectedUserSurface.areas')),
    }),
    expectedOutcome: nonEmptyString(record['expectedOutcome'], 'liteship-change-intent.expectedOutcome'),
    guardrails: Object.freeze(stringSet(record['guardrails'], 'liteship-change-intent.guardrails')),
    reversibility: Object.freeze(reversibility(record['reversibility'])),
    actorClass: enumValue(record['actorClass'], 'liteship-change-intent.actorClass', ['human', 'agent', 'automation']),
    uncertainty: Object.freeze({
      level: enumValue(uncertainty['level'], 'liteship-change-intent.uncertainty.level', ['low', 'medium', 'high']),
      unknowns: Object.freeze(stringSet(uncertainty['unknowns'], 'liteship-change-intent.uncertainty.unknowns', true)),
    }),
    execution: executionDeclaration(record['execution']),
  });
}

/** Parse exactly one multiline declaration, or return null when no marker exists. */
export function parseGitHubChangeIntentDeclaration(body: string): GitHubChangeIntentDeclaration | null {
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
  return validateParsedGitHubChangeIntentDeclaration(parsed);
}

export type GitHubChangeIntentDeclarationValidation =
  { readonly kind: 'fail-broad'; readonly event: string } | { readonly kind: 'declared'; readonly sponsor: string };

/** Placeholder that makes the checked PR template discoverable but not silently admissible unchanged. */
export const GITHUB_CHANGE_INTENT_TEMPLATE_SPONSOR = 'REPLACE_WITH_YOUR_GITHUB_LOGIN';

/** Validate the checked PR template without importing built workspace code. */
export function validateGitHubChangeIntentTemplate(template: string): GitHubChangeIntentDeclaration {
  const declaration = parseGitHubChangeIntentDeclaration(template);
  if (declaration === null) throw new TypeError('pull-request template must contain one liteship-change-intent block');
  if (declaration['sponsor'] !== GITHUB_CHANGE_INTENT_TEMPLATE_SPONSOR) {
    throw new TypeError(`pull-request template sponsor must be ${GITHUB_CHANGE_INTENT_TEMPLATE_SPONSOR}`);
  }
  if (!template.includes(`Replace ${GITHUB_CHANGE_INTENT_TEMPLATE_SPONSOR}`)) {
    throw new TypeError('pull-request template must tell the author to replace its sponsor placeholder');
  }
  return declaration;
}

/** Validate the event-payload facts available before any workspace build. */
export function validateGitHubChangeIntentDeclaration(
  eventName: string,
  payload: unknown,
): GitHubChangeIntentDeclarationValidation {
  if (eventName !== 'pull_request') return Object.freeze({ kind: 'fail-broad', event: eventName });
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new TypeError('GitHub event payload must be an object');
  }
  const pull = (payload as Record<string, unknown>)['pull_request'];
  if (pull === null || typeof pull !== 'object' || Array.isArray(pull)) {
    throw new TypeError('pull_request event contains no pull_request object');
  }
  const body = (pull as Record<string, unknown>)['body'];
  const user = (pull as Record<string, unknown>)['user'];
  if (typeof body !== 'string') throw new TypeError('pull_request event contains no body');
  if (user === null || typeof user !== 'object' || Array.isArray(user)) {
    throw new TypeError('pull_request event contains no author');
  }
  const actor = (user as Record<string, unknown>)['login'];
  if (typeof actor !== 'string' || actor.length === 0)
    throw new TypeError('pull_request event contains no author login');
  const declaration = parseGitHubChangeIntentDeclaration(body);
  if (declaration === null) throw new TypeError('pull-request requires exactly one liteship-change-intent block');
  const sponsor = declaration['sponsor'];
  if (typeof sponsor !== 'string' || sponsor.trim().length === 0) {
    throw new TypeError('liteship-change-intent.sponsor must be a non-empty string');
  }
  if (sponsor.trim().toLowerCase() !== actor.toLowerCase()) {
    throw new TypeError('declared sponsor does not match the GitHub-verified pull-request author');
  }
  return Object.freeze({ kind: 'declared', sponsor: actor });
}
