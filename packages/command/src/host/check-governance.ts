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

/** True only for the LiteShip source tree that owns the repository governance records. */
export function hasCheckGovernanceSurface(repoRoot: string): boolean {
  return (
    existsSync(resolve(repoRoot, 'scripts', 'package-catalog.ts')) &&
    existsSync(resolve(repoRoot, 'packages', 'command', 'src', 'checks', 'registry.ts')) &&
    existsSync(resolve(repoRoot, 'traceability', 'testing-ledger.yaml'))
  );
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
  const manifestPath = resolve(repoRoot, 'package.json');
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    throw ValidationError(
      'buildCheckGovernanceFacts',
      `cannot read root package scripts from ${manifestPath}: ${error instanceof Error ? error.message : String(error)}`,
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
  const ledgerPath = resolve(repoRoot, 'traceability/testing-ledger.yaml');
  let text: string;
  try {
    text = readFileSync(ledgerPath, 'utf8');
  } catch (error) {
    throw ValidationError(
      'buildCheckGovernanceFacts',
      `cannot read testing ledger ${ledgerPath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
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
    waivers: Object.freeze([...gauntletWaivers, ...ledgerWaivers(repoRoot, now)]),
  });
}
