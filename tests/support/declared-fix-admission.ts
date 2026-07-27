import type { DeclaredFix, StandardsElement } from '@liteship/gauntlet';
import {
  admitDeclaredFix,
  recomputeFixFacts,
  type DeclaredFixAdmissionInput,
  type DeclaredFixStandardsFacts,
  type GitDiffFacts,
  type GitDiffFileFact,
} from '../../scripts/lib/declared-fix-admission.js';
import {
  admitChangeIntent,
  buildChangeIntent,
  type ChangeIntent,
  type ChangeIntentActorClass,
  type ChangeIntentAdmission,
  type ChangeIntentProvenance,
  type SponsorOwnership,
} from '../../scripts/lib/change-intent.js';

export const FIX_BASE_SHA = '1'.repeat(40);
export const FIX_HEAD_SHA = '2'.repeat(40);
export const FIX_NOW = new Date('2026-07-24T12:00:00.000Z');

const encoder = new TextEncoder();

export const FIX_STANDARDS: readonly StandardsElement[] = Object.freeze([
  Object.freeze({
    _tag: 'floor' as const,
    name: 'mutation-score::packages/core/src/fnv.ts',
    value: 0.9,
    direction: 'higher-is-stronger' as const,
  }),
]);

export function diffFile(
  path = 'packages/core/src/fnv.ts',
  before = 'export const value = 1;\n',
  after = 'export const value = 2;\n',
  addedLines = 1,
  removedLines = 1,
): GitDiffFileFact {
  return {
    path,
    addedLines,
    removedLines,
    beforeBytes: encoder.encode(before),
    afterBytes: encoder.encode(after),
  };
}

export function changeIntent(
  options: {
    readonly sourceSha?: string;
    readonly visibility?: 'internal' | 'public' | 'trust-boundary';
    readonly actorClass?: ChangeIntentActorClass;
    readonly actorProvenance?: ChangeIntentProvenance;
    readonly sponsorOwnership?: SponsorOwnership;
    readonly sponsorProvenance?: ChangeIntentProvenance;
  } = {},
): ChangeIntent {
  return buildChangeIntent({
    schemaVersion: 1,
    sponsor: {
      value: { login: 'heyoub', ownership: options.sponsorOwnership ?? 'repository-owner' },
      provenance: options.sponsorProvenance ?? 'github-verified',
    },
    hypothesis: { value: 'Bind a declared fix to measured repository facts.', provenance: 'agent-self-declared' },
    affectedUserSurface: {
      value: { visibility: options.visibility ?? 'internal', areas: ['declared-fix admission'] },
      provenance: 'agent-self-declared',
    },
    expectedOutcome: {
      value: 'Only measured, sponsored changes receive an admission receipt.',
      provenance: 'agent-self-declared',
    },
    guardrails: {
      value: ['no ambient git', 'reuse the existing verifier'],
      provenance: 'agent-self-declared',
    },
    reversibility: {
      value: { kind: 'reversible', rollback: 'Remove the internal host adapter.' },
      provenance: 'agent-self-declared',
    },
    actorClass: {
      value: options.actorClass ?? 'human',
      provenance: options.actorProvenance ?? 'github-verified',
    },
    uncertainty: { value: { level: 'low', unknowns: [] }, provenance: 'agent-self-declared' },
    sourceSha: { value: options.sourceSha ?? FIX_HEAD_SHA, provenance: 'github-verified' },
    repositoryIdentity: {
      value: { host: 'github.com', owner: 'freebatteryfactory', name: 'LiteShip', nodeId: 'R_liteship' },
      provenance: 'github-verified',
    },
  });
}

export interface AdmissionScenarioOptions {
  readonly files?: readonly GitDiffFileFact[];
  readonly standards?: DeclaredFixStandardsFacts;
  readonly intent?: ChangeIntent;
  readonly intentAdmission?: ChangeIntentAdmission;
  readonly fileGlobs?: readonly string[];
  readonly standardsElementKeys?: readonly string[];
  readonly maxChangedFiles?: number;
  readonly maxChangedLines?: number;
}

export function admissionScenario(options: AdmissionScenarioOptions = {}): DeclaredFixAdmissionInput {
  const diff: GitDiffFacts = {
    baseSha: FIX_BASE_SHA,
    headSha: FIX_HEAD_SHA,
    files: options.files ?? [diffFile()],
  };
  const standards: DeclaredFixStandardsFacts =
    options.standards ??
    Object.freeze({
      before: FIX_STANDARDS,
      after: FIX_STANDARDS,
      signoffs: Object.freeze([]),
      alwaysBlockingRuleIds: new Set<string>(),
    });
  const intent = options.intent ?? changeIntent();
  const measured = recomputeFixFacts(diff, standards, FIX_NOW);
  const declaredFix: DeclaredFix = Object.freeze({
    _tag: 'declared-fix',
    intent: 'Bind the declared repair to measured repository reality.',
    scope: Object.freeze({
      fileGlobs: Object.freeze(options.fileGlobs ?? measured.actualChange.changedFiles),
      standardsElementKeys: Object.freeze(options.standardsElementKeys ?? []),
    }),
    sizeCap: Object.freeze({
      maxChangedFiles: options.maxChangedFiles ?? measured.actualChange.changedFiles.length,
      maxChangedLines: options.maxChangedLines ?? measured.actualChange.changedLines,
    }),
    beforeReceipt: measured.beforeReceipt,
    afterReceipt: measured.afterReceipt,
  });
  return Object.freeze({
    declaredFix,
    diff,
    standards,
    changeIntent: intent,
    changeIntentAdmission: options.intentAdmission ?? admitChangeIntent(intent),
    now: FIX_NOW,
  });
}

export function admission(options: AdmissionScenarioOptions = {}) {
  return admitDeclaredFix(admissionScenario(options));
}
