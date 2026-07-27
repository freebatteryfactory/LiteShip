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
import { LITESHIP_WAIVERS, type CheckGovernanceFacts } from '@liteship/gauntlet';
import { CHECK_REGISTRY } from '../checks/registry.js';
import { SCRIPT_EXEMPTIONS } from '../checks/script-exemptions.js';

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
  return Object.freeze(
    [...text.matchAll(/^\s*expiry:\s*['"]?(\d{4}-\d{2}-\d{2})['"]?/gmu)].map((match, index) => {
      const expires = match[1]!;
      return Object.freeze({
        store: 'ledger' as const,
        id: `ledger-waiver-${index}`,
        expires,
        expired: new Date(expires).getTime() < now.getTime(),
      });
    }),
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
      expires: waiver.expires,
      expired: new Date(waiver.expires).getTime() < now.getTime(),
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
