/** Cold-safe parser for the declarative GitHub change-intent block. @module */

export type GitHubChangeIntentDeclaration = Readonly<Record<string, unknown>>;

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

function exactDeclaration(value: unknown): GitHubChangeIntentDeclaration {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  ) {
    throw new TypeError('liteship-change-intent must be a plain object');
  }
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key !== 'string')) {
    throw new TypeError('liteship-change-intent contains a symbol key');
  }
  const actual = (ownKeys as string[]).sort();
  const expected = [...DECLARED_KEYS].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new TypeError(`liteship-change-intent keys must be exactly: ${expected.join(', ')}`);
  }
  return value as GitHubChangeIntentDeclaration;
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
  return exactDeclaration(parsed);
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
