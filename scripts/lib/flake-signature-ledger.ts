/** Derived, addressed history of recurring flake failure signatures. @module */

import type { FlakeTarget } from '../test-flake-targets.js';
import {
  assertFlakeEvidenceCurrent,
  digestFlakeEvidenceValue,
  parseFlakeEvidence,
  stableFlakeEvidenceValue,
  type FlakeEvidence,
  type FlakeScarExecutionReceipt,
} from './flake-evidence.js';

export interface FlakeSignatureLedgerEntry {
  readonly signatureId: `sha256:${string}`;
  readonly target: string;
  readonly owner: string;
  readonly firstSeen: string;
  readonly lastSeen: string;
  readonly occurrences: number;
  readonly evidenceIds: readonly `sha256:${string}`[];
  readonly reproducer: readonly string[];
  readonly provingScar: string;
  readonly status: 'open' | 'resolved' | 'reopened';
  readonly scarReceipt: FlakeScarExecutionReceipt | null;
}

export interface FlakeSignatureLedger {
  readonly schemaVersion: 1;
  readonly ledgerId: `sha256:${string}`;
  readonly observedThrough: string;
  readonly expires: string;
  readonly evidenceIds: readonly `sha256:${string}`[];
  readonly signatures: readonly FlakeSignatureLedgerEntry[];
}

type UnsignedLedger = Omit<FlakeSignatureLedger, 'ledgerId'>;

interface MutableSignature {
  signatureId: `sha256:${string}`;
  target: string;
  owner: string;
  firstSeen: string;
  lastSeen: string;
  occurrences: number;
  evidenceIds: Set<`sha256:${string}`>;
  reproducer: readonly string[];
  provingScar: string;
  lastFailureIndex: number;
}

function exactKeys(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    stableFlakeEvidenceValue(Object.keys(value).sort()) === stableFlakeEvidenceValue([...keys].sort())
  );
}

function isDigest(value: unknown): value is `sha256:${string}` {
  return typeof value === 'string' && /^sha256:[0-9a-f]{64}$/u.test(value);
}

function isDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function parseScarReceipt(value: unknown): FlakeScarExecutionReceipt {
  if (!exactKeys(value, ['attempts', 'owner', 'provingScar', 'receiptId', 'sourceSha', 'target', 'verdict'])) {
    throw new TypeError('flake signature scar receipt is invalid');
  }
  if (
    !isDigest(value['receiptId']) ||
    typeof value['target'] !== 'string' ||
    typeof value['owner'] !== 'string' ||
    typeof value['provingScar'] !== 'string' ||
    typeof value['sourceSha'] !== 'string' ||
    !/^[0-9a-f]{40,64}$/u.test(value['sourceSha']) ||
    !Number.isSafeInteger(value['attempts']) ||
    Number(value['attempts']) < 1 ||
    (value['verdict'] !== 'pass' && value['verdict'] !== 'fail')
  ) {
    throw new TypeError('flake signature scar receipt fields are invalid');
  }
  const { receiptId, ...unsigned } = value;
  if (receiptId !== digestFlakeEvidenceValue(unsigned)) {
    throw new TypeError('flake signature scar receipt digest is stale');
  }
  return value as unknown as FlakeScarExecutionReceipt;
}

/**
 * Fold ordered campaign evidence into one signature ledger. Input order is the
 * campaign order; dates may be equal, but they may never move backwards.
 */
export function buildFlakeSignatureLedger(evidenceRecords: readonly FlakeEvidence[]): FlakeSignatureLedger {
  if (evidenceRecords.length === 0) throw new TypeError('flake signature ledger requires evidence');
  const evidence = evidenceRecords.map(parseFlakeEvidence);
  for (let index = 1; index < evidence.length; index += 1) {
    if (evidence[index]!.observedOn < evidence[index - 1]!.observedOn) {
      throw new TypeError('flake signature evidence must be ordered by observation date');
    }
  }
  const evidenceIds = evidence.map((record) => record.evidenceId);
  if (new Set(evidenceIds).size !== evidenceIds.length) {
    throw new TypeError('flake signature ledger evidence ids must be unique');
  }

  const mutable = new Map<`sha256:${string}`, MutableSignature>();
  for (let evidenceIndex = 0; evidenceIndex < evidence.length; evidenceIndex += 1) {
    const record = evidence[evidenceIndex]!;
    for (const target of record.targets) {
      for (const observation of target.observations) {
        if (observation.failureSignature === null || observation.failureSignature === undefined) continue;
        const prior = mutable.get(observation.failureSignature);
        if (prior === undefined) {
          mutable.set(observation.failureSignature, {
            signatureId: observation.failureSignature,
            target: target.target,
            owner: target.owner,
            firstSeen: record.observedOn,
            lastSeen: record.observedOn,
            occurrences: 1,
            evidenceIds: new Set([record.evidenceId]),
            reproducer: [...target.reproducer],
            provingScar: target.provingScar,
            lastFailureIndex: evidenceIndex,
          });
        } else {
          if (prior.target !== target.target || prior.owner !== target.owner) {
            throw new TypeError('flake failure signature collided across owners or targets');
          }
          prior.lastSeen = record.observedOn;
          prior.occurrences += 1;
          prior.evidenceIds.add(record.evidenceId);
          prior.lastFailureIndex = evidenceIndex;
        }
      }
    }
  }

  const latest = evidence[evidence.length - 1]!;
  const signatures = [...mutable.values()]
    .sort((left, right) => left.signatureId.localeCompare(right.signatureId))
    .map((signature): FlakeSignatureLedgerEntry => {
      const latestTarget = latest.targets.find(
        (target) => target.target === signature.target && target.owner === signature.owner,
      );
      const scarMatches =
        latestTarget !== undefined &&
        latestTarget.provingScar === signature.provingScar &&
        stableFlakeEvidenceValue(latestTarget.reproducer) === stableFlakeEvidenceValue(signature.reproducer);
      const resolved =
        latestTarget !== undefined &&
        scarMatches &&
        signature.lastFailureIndex < evidence.length - 1 &&
        latestTarget.scarReceipt.verdict === 'pass';
      const status = resolved ? 'resolved' : latestTarget === undefined || !scarMatches ? 'reopened' : 'open';
      return {
        signatureId: signature.signatureId,
        target: signature.target,
        owner: signature.owner,
        firstSeen: signature.firstSeen,
        lastSeen: signature.lastSeen,
        occurrences: signature.occurrences,
        evidenceIds: [...signature.evidenceIds].sort(),
        reproducer: [...signature.reproducer],
        provingScar: signature.provingScar,
        status,
        scarReceipt: latestTarget?.scarReceipt ?? null,
      };
    });

  const unsigned: UnsignedLedger = {
    schemaVersion: 1,
    observedThrough: latest.observedOn,
    expires: latest.expires,
    evidenceIds,
    signatures,
  };
  return { ...unsigned, ledgerId: digestFlakeEvidenceValue(unsigned) };
}

/** Strict decoder for a persisted signature ledger. */
export function parseFlakeSignatureLedger(value: unknown): FlakeSignatureLedger {
  if (!exactKeys(value, ['evidenceIds', 'expires', 'ledgerId', 'observedThrough', 'schemaVersion', 'signatures'])) {
    throw new TypeError('flake signature ledger envelope is invalid');
  }
  if (value['schemaVersion'] !== 1 || !isDigest(value['ledgerId'])) {
    throw new TypeError('flake signature ledger identity is invalid');
  }
  if (!isDate(value['observedThrough']) || !isDate(value['expires']) || value['expires'] <= value['observedThrough']) {
    throw new TypeError('flake signature ledger dates are invalid');
  }
  const evidenceIds = value['evidenceIds'];
  if (
    !Array.isArray(evidenceIds) ||
    evidenceIds.length === 0 ||
    evidenceIds.some((id) => !isDigest(id)) ||
    new Set(evidenceIds).size !== evidenceIds.length
  ) {
    throw new TypeError('flake signature ledger evidence ids are invalid');
  }
  if (!Array.isArray(value['signatures'])) throw new TypeError('flake signature ledger entries are invalid');

  let prior = '';
  for (const entry of value['signatures']) {
    if (
      !exactKeys(entry, [
        'evidenceIds',
        'firstSeen',
        'lastSeen',
        'occurrences',
        'owner',
        'provingScar',
        'reproducer',
        'scarReceipt',
        'signatureId',
        'status',
        'target',
      ])
    ) {
      throw new TypeError('flake signature ledger entry is invalid');
    }
    if (!isDigest(entry['signatureId']) || entry['signatureId'] <= prior) {
      throw new TypeError('flake signature ids must be sorted and unique');
    }
    if (
      typeof entry['target'] !== 'string' ||
      typeof entry['owner'] !== 'string' ||
      typeof entry['provingScar'] !== 'string' ||
      entry['target'].length === 0 ||
      entry['owner'].length === 0 ||
      entry['provingScar'].length === 0 ||
      !isDate(entry['firstSeen']) ||
      !isDate(entry['lastSeen']) ||
      entry['firstSeen'] > entry['lastSeen'] ||
      entry['lastSeen'] > value['observedThrough'] ||
      !Number.isSafeInteger(entry['occurrences']) ||
      Number(entry['occurrences']) < 1 ||
      !Array.isArray(entry['reproducer']) ||
      entry['reproducer'].length === 0 ||
      entry['reproducer'].some((part) => typeof part !== 'string') ||
      !Array.isArray(entry['evidenceIds']) ||
      entry['evidenceIds'].length === 0 ||
      entry['evidenceIds'].some((id) => typeof id !== 'string' || !evidenceIds.includes(id)) ||
      (entry['status'] !== 'open' && entry['status'] !== 'resolved' && entry['status'] !== 'reopened')
    ) {
      throw new TypeError('flake signature ledger entry fields are invalid');
    }
    const receipt = entry['scarReceipt'] === null ? null : parseScarReceipt(entry['scarReceipt']);
    if (
      entry['status'] === 'resolved' &&
      (receipt === null ||
        receipt.verdict !== 'pass' ||
        receipt.target !== entry['target'] ||
        receipt.owner !== entry['owner'] ||
        receipt.provingScar !== entry['provingScar'])
    ) {
      throw new TypeError('resolved flake signature lacks its passing scar execution receipt');
    }
    prior = entry['signatureId'];
  }

  const { ledgerId, ...unsigned } = value;
  if (ledgerId !== digestFlakeEvidenceValue(unsigned)) {
    throw new TypeError('flake signature ledger digest does not match its bytes');
  }
  return value as unknown as FlakeSignatureLedger;
}

export function serializeFlakeSignatureLedger(ledger: FlakeSignatureLedger): string {
  return `${stableFlakeEvidenceValue(parseFlakeSignatureLedger(ledger))}\n`;
}

/** Admit the ledger only when it is the exact fold of current campaign evidence. */
export function assertFlakeSignatureLedgerCurrent(
  ledger: FlakeSignatureLedger,
  expected: {
    readonly evidence: readonly FlakeEvidence[];
    readonly headSha: string;
    readonly targets: readonly FlakeTarget[];
    readonly today: string;
  },
): void {
  const parsed = parseFlakeSignatureLedger(ledger);
  const rebuilt = buildFlakeSignatureLedger(expected.evidence);
  if (stableFlakeEvidenceValue(parsed) !== stableFlakeEvidenceValue(rebuilt)) {
    throw new TypeError('flake signature ledger is stale for its campaign evidence');
  }
  const latest = expected.evidence[expected.evidence.length - 1];
  if (latest === undefined) throw new TypeError('flake signature ledger requires current evidence');
  assertFlakeEvidenceCurrent(latest, {
    headSha: expected.headSha,
    targets: expected.targets,
    today: expected.today,
  });
}
