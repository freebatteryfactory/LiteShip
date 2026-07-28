/** Deterministic supply-chain admission over the root override and pnpm receipts. @module */

export const SECURITY_MINIMUMS = Object.freeze({ postcss: '8.5.18' } as const);
const POSTCSS_OVERRIDE = /^>=(\d+\.\d+\.\d+) <9$/u;

export interface PnpmAuditReceipt {
  readonly metadata: {
    readonly vulnerabilities: Readonly<Record<'info' | 'low' | 'moderate' | 'high' | 'critical', number>>;
  };
}

function versionTuple(value: string): readonly [number, number, number] | null {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/u.exec(value);
  return match === null ? null : [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function versionAtLeast(value: string, minimum: string): boolean {
  const actual = versionTuple(value);
  const floor = versionTuple(minimum);
  if (actual === null || floor === null) return false;
  for (let index = 0; index < 3; index++) {
    if (actual[index]! > floor[index]!) return true;
    if (actual[index]! < floor[index]!) return false;
  }
  return true;
}

function postcssOverrideEnforcesMinimum(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const match = POSTCSS_OVERRIDE.exec(value);
  return match !== null && versionAtLeast(match[1]!, SECURITY_MINIMUMS.postcss);
}

/** Cheap lockfile/override law; it complements, but never replaces, the live registry audit. */
export function securityMinimumFindings(packageJson: unknown, lockfileText: string): readonly string[] {
  const findings: string[] = [];
  const root = packageJson as { readonly pnpm?: { readonly overrides?: Readonly<Record<string, unknown>> } };
  const postcssOverride = root?.pnpm?.overrides?.['postcss'];
  if (!postcssOverrideEnforcesMinimum(postcssOverride)) {
    findings.push(`root postcss override must require >=${SECURITY_MINIMUMS.postcss}`);
  }
  const installed = [...lockfileText.matchAll(/^\s{2}postcss@(\d+\.\d+\.\d+)(?::|\()/gmu)].map((match) => match[1]!);
  if (installed.length === 0) findings.push('pnpm lockfile contains no resolved postcss package');
  for (const version of new Set(installed)) {
    if (!versionAtLeast(version, SECURITY_MINIMUMS.postcss)) {
      findings.push(`pnpm lockfile resolves vulnerable postcss ${version}; require >=${SECURITY_MINIMUMS.postcss}`);
    }
  }
  return findings.sort((a, b) => a.localeCompare(b));
}

export function parsePnpmAuditReceipt(value: unknown): PnpmAuditReceipt {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('audit receipt must be an object');
  const metadata = (value as Record<string, unknown>)['metadata'];
  if (metadata === null || typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new TypeError('audit receipt has no metadata');
  }
  const vulnerabilities = (metadata as Record<string, unknown>)['vulnerabilities'];
  if (vulnerabilities === null || typeof vulnerabilities !== 'object' || Array.isArray(vulnerabilities)) {
    throw new TypeError('audit receipt has no vulnerability counts');
  }
  for (const severity of ['info', 'low', 'moderate', 'high', 'critical'] as const) {
    const count = (vulnerabilities as Record<string, unknown>)[severity];
    if (!Number.isSafeInteger(count) || (count as number) < 0) throw new TypeError(`audit ${severity} count is invalid`);
  }
  return value as PnpmAuditReceipt;
}

export function blockingAuditFindings(receipt: PnpmAuditReceipt): readonly string[] {
  return (['high', 'critical'] as const)
    .filter((severity) => receipt.metadata.vulnerabilities[severity] > 0)
    .map((severity) => `${receipt.metadata.vulnerabilities[severity]} ${severity}-severity vulnerability finding(s)`);
}
