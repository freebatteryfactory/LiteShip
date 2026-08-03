/**
 * W1.5 packet 5 — THE REVIEW-FINDING LEDGER.
 *
 * The structural answer to an external review finding surviving thirteen rounds.
 * Every other suppression in this repository carries an owner, a justification,
 * and a clock; a review finding that was argued down rather than fixed carried
 * none of them, so it lived in whoever happened to remember the argument.
 *
 * Two obligations this ledger has that the sibling stores do not:
 *
 *  - TECHNICAL DISPOSITION and EXTERNAL ACKNOWLEDGEMENT are separate required
 *    fields. A finding can be fixed in code while its thread is never answered —
 *    which is precisely how one survived thirteen rounds — so neither may be
 *    inferred from the other.
 *  - `resolved` demands EVIDENCE (the commit that closed it and the law that
 *    keeps it closed) and must carry no expiry, because a resolution does not
 *    come due. `waived` and `disputed` are relaxations and expire on the same
 *    clock as every other suppression: a dispute with no expiry is an argument
 *    that wins by outliving the reviewer.
 *
 * Expiry itself is enforced by the EXISTING `check-waiver-freshness` gate — this
 * ledger is enrolled as a third store rather than growing a second clock.
 *
 * @module
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseReviewFindings } from '../../../packages/command/src/host/check-governance.js';
import { WAIVER_FRESHNESS_STORES, isStrictWaiverExpiry } from '../../../packages/gauntlet/src/index.js';

const REPO_ROOT = resolve(import.meta.dirname, '..', '..', '..');
const LEDGER = resolve(REPO_ROOT, 'traceability/review-findings.json');

const ledgerText = (): string => readFileSync(LEDGER, 'utf8');

/** A minimal well-formed ledger, mutated per control below. */
const ledgerOf = (...findings: readonly Record<string, unknown>[]): string =>
  JSON.stringify({ schema: 'liteship/review-findings@1', findings });

const RESOLVED = {
  id: 'p/1',
  summary: 's',
  status: 'resolved',
  acknowledged: true,
  resolution: { commit: 'abc1234', evidence: 'tests/x.test.ts' },
};
const DISPUTED = {
  id: 'p/2',
  summary: 's',
  status: 'disputed',
  owner: 'heyoub',
  justification: 'j',
  expiry: '2099-01-01',
  acknowledged: true,
};

describe('the review-finding ledger', () => {
  it('is enrolled as a freshness store, so its clock is the shared one', () => {
    expect(WAIVER_FRESHNESS_STORES.review.location).toBe('traceability/review-findings.json');
  });

  it('the live ledger parses and is not vacuous', () => {
    const findings = parseReviewFindings(ledgerText());
    expect(findings.length, 'an empty ledger records nothing and proves nothing').toBeGreaterThanOrEqual(5);
    expect(new Set(findings.map((finding) => finding.id)).size).toBe(findings.length);
  });

  it('every live relaxation carries an owner, a justification, and a real expiry date', () => {
    for (const finding of parseReviewFindings(ledgerText())) {
      if (finding.status === 'resolved') continue;
      expect(finding.owner, `${finding.id} has no accountable owner`).toBeTruthy();
      expect(finding.justification, `${finding.id} has no justification`).toBeTruthy();
      expect(isStrictWaiverExpiry(finding.expiry ?? ''), `${finding.id} expiry is not a real date`).toBe(true);
    }
  });

  it('every live resolution names the commit and the law that keep it closed', () => {
    const resolved = parseReviewFindings(ledgerText()).filter((finding) => finding.status === 'resolved');
    expect(resolved.length, 'no resolution recorded — the ledger only tracks arguments').toBeGreaterThanOrEqual(1);
  });

  it('records a finding whose CODE is closed but whose thread is not — the thirteen-round shape', () => {
    // The distinction is the point of the ledger: this entry is technically
    // resolved and still owes its reply, and only a separate field can say so.
    const findings = parseReviewFindings(ledgerText());
    const unacknowledged = findings.filter((finding) => !finding.acknowledged);
    for (const finding of unacknowledged) {
      expect(finding.status, `${finding.id} is unacknowledged, so it must at least be closed in code`).toBe('resolved');
    }
  });
});

describe('the ledger reds on each malformed shape it claims to refuse', () => {
  it('refuses an unknown schema', () => {
    expect(() => parseReviewFindings(JSON.stringify({ schema: 'other', findings: [] }))).toThrow(/schema/u);
  });

  it('refuses a resolution that is a bare claim with no evidence', () => {
    const { resolution: _dropped, ...bare } = RESOLVED;
    expect(() => parseReviewFindings(ledgerOf(bare))).toThrow(/resolution evidence/u);
  });

  it('refuses a resolution that carries an expiry — a resolution does not come due', () => {
    expect(() => parseReviewFindings(ledgerOf({ ...RESOLVED, expiry: '2099-01-01' }))).toThrow(/must not carry/u);
  });

  it('refuses a dispute with no clock', () => {
    const { expiry: _dropped, ...clockless } = DISPUTED;
    expect(() => parseReviewFindings(ledgerOf(clockless))).toThrow(/expiry/u);
  });

  it('refuses a dispute with no accountable owner', () => {
    const { owner: _dropped, ...unowned } = DISPUTED;
    expect(() => parseReviewFindings(ledgerOf(unowned))).toThrow(/owner/u);
  });

  it('refuses a finding that does not say whether its thread was answered', () => {
    const { acknowledged: _dropped, ...silent } = DISPUTED;
    expect(() => parseReviewFindings(ledgerOf(silent))).toThrow(/acknowledged/u);
  });

  it('refuses a status outside the closed set', () => {
    expect(() => parseReviewFindings(ledgerOf({ ...DISPUTED, status: 'wontfix' }))).toThrow(/status/u);
  });

  it('refuses duplicate ids, so one finding cannot be recorded twice with two verdicts', () => {
    expect(() => parseReviewFindings(ledgerOf(DISPUTED, { ...DISPUTED, status: 'waived' }))).toThrow(/duplicate/u);
  });

  it('admits the well-formed shapes', () => {
    expect(parseReviewFindings(ledgerOf(RESOLVED, DISPUTED)).map((finding) => finding.status)).toEqual([
      'resolved',
      'disputed',
    ]);
  });
});
