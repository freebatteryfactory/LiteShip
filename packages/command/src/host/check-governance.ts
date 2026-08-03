/**
 * Node host for the check-governance FactPack.
 *
 * The three governance gates are pure data folds. This module is their one real
 * repository adapter: it projects the command registry, root scripts, planted
 * negative-control files, gauntlet waivers, and testing-ledger expiry records
 * into the exact pack those gates declare. Keeping this producer in the Node
 * host prevents the pure command catalog and the lean gauntlet from importing
 * filesystem or YAML machinery.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ValidationError } from '@liteship/error';
import {
  isStrictWaiverExpiry,
  LITESHIP_WAIVERS,
  type CheckGovernanceFacts,
  type WaiverFreshnessFact,
} from '@liteship/gauntlet';
import { CHECK_REGISTRY } from '../checks/registry.js';
import { SCRIPT_EXEMPTIONS } from '../checks/script-exemptions.js';

/**
 * THE ADMISSION CONTRACT — one list, not two.
 *
 * {@link buildCheckGovernanceFacts} REFUSES a tree missing any record it reads:
 * a governance record that reads as absent must never read as "no findings".
 * That refusal is only safe because something decides FIRST whether a tree is
 * held to the contract at all — {@link hasCheckGovernanceSurface} — and a
 * packed consumer gets {@link applicationCheckGovernanceFacts} instead.
 *
 * The probe and the reads used to be two independent hand-maintained lists that
 * shared exactly one path. `traceability/review-findings.json` was enrolled as
 * a required record and the probe was not widened, so the hermetic gauntlet
 * fixture — a tree that satisfied the probe and carried every record but that
 * one — passed admission and then hard-failed inside the builder, reding 13
 * laws across six CI jobs on one enrollment.
 *
 * ANCHOR: {@link REQUIRED_GOVERNANCE_RECORDS} is the closed set of repo-relative
 * paths this module reads, and `governanceRecordText` is the ONLY way it reads
 * one. A record that is read is therefore a record that is declared, and the
 * declaration is what the probe tests — the two lists are one list BY
 * CONSTRUCTION rather than by a test asserting they agree.
 *
 * {@link IDENTITY_MARKERS} are deliberately NOT records: they answer "is this
 * the LiteShip source tree", not "can this tree answer for its governance".
 * Both must hold, so admission is strictly narrower than either alone and this
 * change can only ever REJECT a tree the old probe accepted.
 */
const REQUIRED_GOVERNANCE_RECORDS = Object.freeze([
  'package.json',
  'traceability/testing-ledger.yaml',
  'traceability/review-findings.json',
] as const);

/** Source-tree markers that identify LiteShip itself but carry no governance record. */
const IDENTITY_MARKERS = Object.freeze(['scripts/package-catalog.ts', 'packages/command/src/checks/registry.ts']);

/**
 * Every repo-relative path admission requires — identity markers and records
 * alike. Exported so the admission laws enumerate the real set instead of
 * restating it; a newly enrolled record gets its own coverage for free.
 */
export const GOVERNANCE_SURFACE_PATHS: readonly string[] = Object.freeze([
  ...IDENTITY_MARKERS,
  ...REQUIRED_GOVERNANCE_RECORDS,
]);

/** One repo-relative governance record path. */
type GovernanceRecord = (typeof REQUIRED_GOVERNANCE_RECORDS)[number];

/** True only for the LiteShip source tree that owns the repository governance records. */
export function hasCheckGovernanceSurface(repoRoot: string): boolean {
  return GOVERNANCE_SURFACE_PATHS.every((rel) => existsSync(resolve(repoRoot, rel)));
}

/**
 * Read one DECLARED governance record. The single read path in this module, so
 * a record cannot be read without being declared in
 * {@link REQUIRED_GOVERNANCE_RECORDS} — and therefore cannot be required
 * without the admission probe already testing for it.
 */
function governanceRecordText(repoRoot: string, record: GovernanceRecord): string {
  const path = resolve(repoRoot, record);
  try {
    return readFileSync(path, 'utf8');
  } catch (error) {
    throw ValidationError(
      'buildCheckGovernanceFacts',
      `cannot read governance record ${path}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/** Neutral governance facts for an application that does not own LiteShip's repository controls. */
export function applicationCheckGovernanceFacts(): CheckGovernanceFacts {
  return Object.freeze({
    partition: Object.freeze({
      scripts: Object.freeze([]),
      registered: Object.freeze([]),
      exempted: Object.freeze([]),
    }),
    negativeControls: Object.freeze([]),
    waivers: Object.freeze([]),
  });
}

function readRootScripts(repoRoot: string): readonly string[] {
  const text = governanceRecordText(repoRoot, 'package.json');
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw ValidationError(
      'buildCheckGovernanceFacts',
      `root package.json is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw ValidationError('buildCheckGovernanceFacts', 'root package.json must be an object');
  }
  const scripts = (parsed as { readonly scripts?: unknown }).scripts;
  if (typeof scripts !== 'object' || scripts === null || Array.isArray(scripts)) {
    throw ValidationError('buildCheckGovernanceFacts', 'root package.json#scripts must be an object');
  }
  return Object.freeze(Object.keys(scripts));
}

function expiredAfterCalendarDate(expiry: string, now: Date): boolean {
  if (!isStrictWaiverExpiry(expiry)) {
    throw ValidationError('buildCheckGovernanceFacts', `waiver expiry "${expiry}" must be a real yyyy-mm-dd date`);
  }
  return now.toISOString().slice(0, 10) > expiry;
}

function yamlScalar(raw: string): string {
  const value = raw.trim();
  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replaceAll("''", "'");
  }
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }
  return value;
}

function ledgerWaivers(repoRoot: string, now: Date): CheckGovernanceFacts['waivers'] {
  const text = governanceRecordText(repoRoot, 'traceability/testing-ledger.yaml');
  const waivers: WaiverFreshnessFact[] = [];
  let id: string | undefined;
  let inWaiver = false;
  let fields: { owner?: string; justification?: string; expiry?: string } = {};

  const finishWaiver = (): void => {
    if (!inWaiver) return;
    if (
      id === undefined ||
      id.trim().length === 0 ||
      fields.owner === undefined ||
      fields.owner.trim().length === 0 ||
      fields.justification === undefined ||
      fields.justification.trim().length === 0 ||
      fields.expiry === undefined
    ) {
      throw ValidationError('buildCheckGovernanceFacts', `testing-ledger waiver "${id ?? '<unknown>'}" is malformed`);
    }
    waivers.push(
      Object.freeze({
        store: 'ledger',
        id,
        owner: fields.owner,
        justification: fields.justification,
        expiry: fields.expiry,
        expired: expiredAfterCalendarDate(fields.expiry, now),
      }),
    );
    inWaiver = false;
    fields = {};
  };

  for (const line of text.split(/\r?\n/u)) {
    const idMatch = /^  - id:\s*(.*?)\s*$/u.exec(line);
    if (idMatch !== null) {
      finishWaiver();
      id = yamlScalar(idMatch[1]!);
      continue;
    }
    const waiverMatch = /^    waiver:(.*)$/u.exec(line);
    if (waiverMatch !== null) {
      if (id === undefined || waiverMatch[1]!.trim().length > 0) {
        throw ValidationError('buildCheckGovernanceFacts', 'testing-ledger waiver must be a block beneath an id');
      }
      inWaiver = true;
      fields = {};
      continue;
    }
    if (!inWaiver) continue;
    const fieldMatch = /^      (owner|justification|expiry):\s*(.*?)\s*$/u.exec(line);
    if (fieldMatch === null) continue;
    const field = fieldMatch[1] as keyof typeof fields;
    if (fields[field] !== undefined) {
      throw ValidationError('buildCheckGovernanceFacts', `testing-ledger waiver "${id!}" repeats ${field}`);
    }
    fields[field] = yamlScalar(fieldMatch[2]!);
  }
  finishWaiver();
  return Object.freeze(waivers);
}

/** The closed set of dispositions an external review finding may carry. */
const REVIEW_STATUSES = Object.freeze(['resolved', 'waived', 'disputed'] as const);

/** One external review finding's recorded disposition. */
export type ReviewFindingStatus = (typeof REVIEW_STATUSES)[number];

/** One entry in the external review-finding ledger. */
export interface ReviewFinding {
  readonly id: string;
  readonly status: ReviewFindingStatus;
  /** Present on `waived` / `disputed` — the accountable signer of the relaxation. */
  readonly owner?: string;
  readonly justification?: string;
  /** Strict `yyyy-mm-dd`, required on `waived` / `disputed`. */
  readonly expiry?: string;
  /** Whether the external THREAD was answered — deliberately separate from technical resolution. */
  readonly acknowledged: boolean;
}

/** Narrow an unknown to the closed disposition set — a predicate, not a cast at the use site. */
function isReviewStatus(value: unknown): value is ReviewFindingStatus {
  return typeof value === 'string' && (REVIEW_STATUSES as readonly string[]).includes(value);
}

function requiredString(record: Readonly<Record<string, unknown>>, key: string, id: string): string {
  const value = record[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw ValidationError('buildCheckGovernanceFacts', `review finding "${id}" must carry a non-empty ${key}`);
  }
  return value;
}

/**
 * Parse and VALIDATE the external review-finding ledger.
 *
 * Two obligations the other stores do not have, and the reason this ledger
 * exists at all: a finding may be closed TECHNICALLY while its thread is never
 * answered, which is how one finding survived thirteen review rounds. So the
 * external acknowledgement is a separate required field from the technical
 * disposition, and neither can be inferred from the other.
 *
 * `resolved` demands EVIDENCE — the commit that closed it and the law that keeps
 * it closed — and must carry no expiry, because a resolution does not come due.
 * `waived` and `disputed` are relaxations and are held to the same
 * owner + justification + strict-expiry contract as every other suppression in
 * the repository; a dispute with no clock is an argument that wins by outliving
 * the reviewer.
 */
export function parseReviewFindings(text: string): readonly ReviewFinding[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw ValidationError(
      'buildCheckGovernanceFacts',
      `review-findings ledger is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw ValidationError('buildCheckGovernanceFacts', 'review-findings ledger must be a JSON object');
  }
  const root: Readonly<Record<string, unknown>> = { ...parsed };
  if (root['schema'] !== 'liteship/review-findings@1') {
    throw ValidationError(
      'buildCheckGovernanceFacts',
      `review-findings ledger declares schema ${JSON.stringify(root['schema'])}, expected "liteship/review-findings@1"`,
    );
  }
  const rawFindings = root['findings'];
  if (!Array.isArray(rawFindings)) {
    throw ValidationError('buildCheckGovernanceFacts', 'review-findings ledger must carry a findings array');
  }
  const seen = new Set<string>();
  const findings: ReviewFinding[] = [];
  for (const entry of rawFindings) {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      throw ValidationError('buildCheckGovernanceFacts', 'each review finding must be a JSON object');
    }
    const record: Readonly<Record<string, unknown>> = { ...entry };
    const id = requiredString(record, 'id', '<unknown>');
    if (seen.has(id)) {
      throw ValidationError('buildCheckGovernanceFacts', `duplicate review finding id "${id}"`);
    }
    seen.add(id);
    requiredString(record, 'summary', id);
    const status = record['status'];
    if (!isReviewStatus(status)) {
      throw ValidationError(
        'buildCheckGovernanceFacts',
        `review finding "${id}" declares status ${JSON.stringify(status)}, not one of [${REVIEW_STATUSES.join(', ')}]`,
      );
    }
    const acknowledged = record['acknowledged'];
    if (typeof acknowledged !== 'boolean') {
      throw ValidationError(
        'buildCheckGovernanceFacts',
        `review finding "${id}" must state whether its external thread was acknowledged`,
      );
    }
    if (status === 'resolved') {
      const resolution = record['resolution'];
      if (typeof resolution !== 'object' || resolution === null || Array.isArray(resolution)) {
        throw ValidationError(
          'buildCheckGovernanceFacts',
          `resolved review finding "${id}" must carry resolution evidence, not a bare claim`,
        );
      }
      const evidence: Readonly<Record<string, unknown>> = { ...resolution };
      requiredString(evidence, 'commit', id);
      requiredString(evidence, 'evidence', id);
      if (record['expiry'] !== undefined) {
        throw ValidationError(
          'buildCheckGovernanceFacts',
          `resolved review finding "${id}" must not carry an expiry — a resolution does not come due`,
        );
      }
      findings.push(Object.freeze({ id, status, acknowledged }));
      continue;
    }
    const owner = requiredString(record, 'owner', id);
    const justification = requiredString(record, 'justification', id);
    const expiry = requiredString(record, 'expiry', id);
    findings.push(Object.freeze({ id, status, owner, justification, expiry, acknowledged }));
  }
  return Object.freeze(findings);
}

/** The `waived` / `disputed` entries, as freshness facts on the shared expiry clock. */
function reviewFindingWaivers(repoRoot: string, now: Date): CheckGovernanceFacts['waivers'] {
  return Object.freeze(
    parseReviewFindings(governanceRecordText(repoRoot, 'traceability/review-findings.json'))
      .filter((finding) => finding.status !== 'resolved')
      .map((finding) =>
        Object.freeze({
          store: 'review' as const,
          id: finding.id,
          owner: finding.owner ?? '',
          justification: finding.justification ?? '',
          expiry: finding.expiry ?? '',
          expired: expiredAfterCalendarDate(finding.expiry ?? '', now),
        }),
      ),
  );
}

/** Build the complete, immutable governance pack for one repository and clock. */
export function buildCheckGovernanceFacts(repoRoot: string, now: Date): CheckGovernanceFacts {
  if (!Number.isFinite(now.getTime())) {
    throw ValidationError('buildCheckGovernanceFacts', 'now must be a valid injected wall-clock date');
  }
  const scripts = readRootScripts(repoRoot);
  const scriptSet = new Set(scripts);
  const registered = CHECK_REGISTRY.filter((check) => check.contexts.includes('repository')).map((check) => {
    if (check.execution.kind !== 'root-script') {
      throw ValidationError(
        'buildCheckGovernanceFacts',
        `repository check "${check.id}" must be owned by one root-script execution`,
      );
    }
    return Object.freeze({
      id: check.id,
      script: check.execution.script,
      scriptExists: scriptSet.has(check.execution.script),
    });
  });
  const negativeControls = CHECK_REGISTRY.filter((check) => check.authority === 'blocking').map((check) => {
    const negativeControl = check.negativeControl ?? null;
    return Object.freeze({
      id: check.id,
      blocking: true,
      negativeControl,
      exists: negativeControl !== null && existsSync(resolve(repoRoot, negativeControl)),
    });
  });
  const gauntletWaivers = LITESHIP_WAIVERS.map((waiver) =>
    Object.freeze({
      store: 'gauntlet' as const,
      id: `${waiver.ruleId}@${waiver.file ?? ''}:${waiver.line ?? ''}`,
      owner: waiver.owner,
      justification: waiver.reason,
      expiry: waiver.expires,
      expired: expiredAfterCalendarDate(waiver.expires, now),
    }),
  );
  return Object.freeze({
    partition: Object.freeze({
      scripts,
      registered: Object.freeze(registered),
      exempted: Object.freeze(SCRIPT_EXEMPTIONS.map((entry) => entry.script)),
    }),
    negativeControls: Object.freeze(negativeControls),
    waivers: Object.freeze([
      ...gauntletWaivers,
      ...ledgerWaivers(repoRoot, now),
      ...reviewFindingWaivers(repoRoot, now),
    ]),
  });
}

/**
 * The governance pack for `repoRoot`: real facts where the tree owns LiteShip's
 * governance records, neutral facts where it does not.
 *
 * THIS IS THE ENTRY POINT, and the only one the `@liteship/command/host` barrel
 * publishes. {@link buildCheckGovernanceFacts} is the strict half and refuses an
 * unqualified tree by design; leaving the admission decision to each caller is
 * precisely what let `repo-ir-gauntlet.ts` call the strict half unconditionally
 * while its sibling in `context.ts` guarded correctly. Two call sites of one
 * authority disagreed about admission because admission was not part of the
 * authority. Now it is.
 */
export function checkGovernanceFactsFor(repoRoot: string, now: Date): CheckGovernanceFacts {
  return hasCheckGovernanceSurface(repoRoot)
    ? buildCheckGovernanceFacts(repoRoot, now)
    : applicationCheckGovernanceFacts();
}
