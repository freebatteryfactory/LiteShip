/** Deterministic supply-chain admission over the root overrides and pnpm receipts. @module */

/**
 * THE OVERRIDE FLOOR CONTRACT.
 *
 * `check/security-minimum` claims "EVERY governed security override and
 * resolved lockfile instance meets its fixed minimum version." It proved
 * exactly ONE: `postcss`. The regex that read the override text was
 * `/^>=(\d+\.\d+\.\d+) <9$/` — the upper bound hardcoded postcss's own major —
 * so the mechanism could not be aimed at any of the other 26 entries even in
 * principle, and 22 of them are in precisely that shape. The claim was already
 * right; the implementation was the liar, so the implementation rises.
 *
 * ANCHOR: the root `pnpm.overrides` block, which is the closed authority that
 * already owns this population. The grammar below is stated over the shapes
 * that block actually uses, and an override the grammar cannot read is a
 * FINDING, never a skipped line — an unreadable pin is indistinguishable from
 * an absent one, and a gate that skips what it cannot parse reports a floor it
 * never checked.
 *
 * TWO OBLIGATIONS, deliberately separate, because they catch different things:
 *
 *  - {@link securityMinimumFindings} is OFFLINE. Every override parses, every
 *    declared minimum is met by the override text, and every version the
 *    lockfile resolves satisfies the bound its own override declares.
 *  - {@link advisoryFloorFindings} is ONLINE and is the load-bearing half. The
 *    live receipt is the ANCHOR for which packages need a floor at all, so the
 *    minimum table cannot silently fall behind the advisory feed.
 *
 * Measured, and the reason both exist: on 2026-08-03 the feed published seven
 * advisories against `brace-expansion`, `undici`, and `fast-uri`. All three
 * already had overrides, and every resolved version SATISFIED its own declared
 * bound — so the offline law was green on all three. Only the receipt-anchored
 * law sees them. Completeness over the override block does not imply currency
 * against the feed, and neither obligation subsumes the other.
 */

/**
 * Advisory-driven version floors. An entry here asserts the floor is security
 * motivated and may never be lowered; {@link advisoryFloorFindings} proves the
 * table is COMPLETE against the live receipt, so this map grows from evidence
 * rather than from anyone remembering. Packages whose override exists for
 * compatibility (suite lockstep, resolution dedupe) are deliberately absent —
 * their bounds are still checked, just not as security minimums.
 */
export const SECURITY_MINIMUMS = Object.freeze({
  'brace-expansion': '5.0.9',
  'fast-uri': '3.1.5',
  postcss: '8.5.18',
  undici: '7.29.0',
} as const);

/** `>=A.B.C <D` or `>=A.B.C <D.E` — a lower bound with a ceiling. */
const OVERRIDE_RANGE = /^>=(\d+\.\d+\.\d+) <(\d+(?:\.\d+)?)$/u;
/** `A.B.C` — an exact pin, which is its own floor. */
const OVERRIDE_EXACT = /^(\d+\.\d+\.\d+)$/u;
/** A lockfile package entry: `  name@1.2.3:` or `  name@1.2.3(peer@4.5.6):`. */
const LOCKFILE_ENTRY = /^ {2}(.+)@(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)(?::|\()/u;

/** One override key, resolved into the package it governs. */
export interface OverrideEntry {
  /** The literal key as written, e.g. `picomatch@2` or `parent>child`. */
  readonly key: string;
  /** The package the key governs, e.g. `picomatch`. */
  readonly packageName: string;
  /** A major-version selector when the key carries one (`picomatch@2` -> `2`). */
  readonly major: number | null;
  /** The floor the override itself declares. */
  readonly lowerBound: string;
  /** True when the key names a family rather than a package (`@remotion/*`). */
  readonly wildcard: boolean;
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

/**
 * Resolve one override key/value pair, or `null` when the pair falls outside
 * the readable grammar. A `null` is a FINDING at every call site — never a skip.
 */
export function parseOverrideEntry(key: string, value: unknown): OverrideEntry | null {
  if (typeof value !== 'string') return null;
  const bound = OVERRIDE_RANGE.exec(value) ?? OVERRIDE_EXACT.exec(value);
  if (bound === null) return null;
  // A pathed key (`parent>child`) governs the CHILD; the parent only scopes where.
  const path = key.slice(key.lastIndexOf('>') + 1);
  // Split a trailing version selector, never a leading scope `@`.
  const at = path.lastIndexOf('@');
  const packageName = at > 0 ? path.slice(0, at) : path;
  const selector = at > 0 ? path.slice(at + 1) : '';
  if (selector !== '' && !/^\d+$/u.test(selector)) return null;
  return Object.freeze({
    key,
    packageName,
    major: selector === '' ? null : Number(selector),
    lowerBound: bound[1]!,
    wildcard: packageName.includes('*'),
  });
}

function rootOverrides(packageJson: unknown): Readonly<Record<string, unknown>> {
  const root = packageJson as { readonly pnpm?: { readonly overrides?: Readonly<Record<string, unknown>> } };
  return root?.pnpm?.overrides ?? {};
}

/** Every `name@version` the lockfile resolves, in file order. */
function lockfileInstances(lockfileText: string): readonly (readonly [string, string])[] {
  const instances: (readonly [string, string])[] = [];
  for (const line of lockfileText.split(/\r?\n/u)) {
    const match = LOCKFILE_ENTRY.exec(line);
    if (match !== null) instances.push([match[1]!, match[2]!]);
  }
  return instances;
}

/**
 * THE OFFLINE LAW. Cheap lockfile/override proof; it complements, but never
 * replaces, the live registry audit.
 */
export function securityMinimumFindings(packageJson: unknown, lockfileText: string): readonly string[] {
  const findings: string[] = [];
  const overrides = rootOverrides(packageJson);
  const entries: OverrideEntry[] = [];

  // (a) Every override is readable. An unreadable pin is a finding, because it
  //     is indistinguishable from an absent one.
  for (const [key, value] of Object.entries(overrides)) {
    const entry = parseOverrideEntry(key, value);
    if (entry === null) {
      findings.push(`root override "${key}" is outside the readable floor grammar (${JSON.stringify(value)})`);
      continue;
    }
    entries.push(entry);
  }

  // (b) ANTI-VACUITY: a block that resolves to nothing proves nothing.
  if (entries.length === 0) findings.push('root pnpm.overrides declares no readable version floor');

  // (c) Every declared security minimum is actually enforced by its override.
  for (const [name, minimum] of Object.entries(SECURITY_MINIMUMS)) {
    const owning = entries.filter((entry) => entry.packageName === name);
    if (owning.length === 0) {
      findings.push(`root override for ${name} is missing; require >=${minimum}`);
      continue;
    }
    for (const entry of owning) {
      if (!versionAtLeast(entry.lowerBound, minimum)) {
        findings.push(`root override "${entry.key}" floors ${name} at ${entry.lowerBound}; require >=${minimum}`);
      }
    }
  }

  // (d) Every resolved instance meets its EFFECTIVE floor — the stricter of the
  //     bound its own override declares and any declared security minimum. Using
  //     the override's bound alone would WEAKEN the guarantee for a package whose
  //     minimum is higher than its pin, which is the one direction this contract
  //     may never move. A wildcard key names a family the lockfile cannot be
  //     matched against by name, so it carries no instance obligation — stated,
  //     not skipped.
  const declared: Readonly<Record<string, string>> = SECURITY_MINIMUMS;
  const installed = lockfileInstances(lockfileText);
  for (const entry of entries) {
    if (entry.wildcard) continue;
    const minimum = declared[entry.packageName];
    const floor = minimum !== undefined && !versionAtLeast(entry.lowerBound, minimum) ? minimum : entry.lowerBound;
    const governed = installed.filter(([name, version]) => {
      if (name !== entry.packageName) return false;
      return entry.major === null || versionTuple(version)?.[0] === entry.major;
    });
    for (const version of new Set(governed.map(([, version]) => version))) {
      if (!versionAtLeast(version, floor)) {
        findings.push(`pnpm lockfile resolves vulnerable ${entry.packageName} ${version}; require >=${floor}`);
      }
    }
  }

  // (e) ANTI-VACUITY per declared minimum: a floor nobody resolves proves
  //     nothing about the tree that ships.
  for (const name of Object.keys(SECURITY_MINIMUMS)) {
    if (!installed.some(([resolved]) => resolved === name)) {
      findings.push(`pnpm lockfile contains no resolved ${name} package`);
    }
  }
  return Object.freeze(findings.sort((a, b) => a.localeCompare(b)));
}

/** One advisory the live registry reported against the resolved tree. */
export interface AuditAdvisory {
  readonly id: string;
  readonly moduleName: string;
  readonly severity: 'info' | 'low' | 'moderate' | 'high' | 'critical';
  /** The `>=X.Y.Z` floor the registry says closes it, or `null` when unpatched. */
  readonly patchedFloor: string | null;
  readonly cves: readonly string[];
}

export interface PnpmAuditReceipt {
  readonly metadata: {
    readonly vulnerabilities: Readonly<Record<'info' | 'low' | 'moderate' | 'high' | 'critical', number>>;
  };
  readonly advisories: readonly AuditAdvisory[];
}

const SEVERITIES = ['info', 'low', 'moderate', 'high', 'critical'] as const;
/** The severities that BLOCK. Ordered so findings read worst-last, as before. */
const BLOCKING_SEVERITIES = ['high', 'critical'] as const;

function isSeverity(value: unknown): value is AuditAdvisory['severity'] {
  return typeof value === 'string' && (SEVERITIES as readonly string[]).includes(value);
}

function advisoryFrom(id: string, raw: unknown): AuditAdvisory {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new TypeError(`audit advisory ${id} is not an object`);
  }
  const record: Readonly<Record<string, unknown>> = { ...raw };
  const moduleName = record['module_name'];
  if (typeof moduleName !== 'string' || moduleName.trim().length === 0) {
    throw new TypeError(`audit advisory ${id} names no module`);
  }
  const severity = record['severity'];
  if (!isSeverity(severity)) throw new TypeError(`audit advisory ${id} declares an unknown severity`);
  const patched = record['patched_versions'];
  if (typeof patched !== 'string') throw new TypeError(`audit advisory ${id} declares no patched range`);
  const floor = /^>=\s*(\d+\.\d+\.\d+)$/u.exec(patched.trim());
  const cves = record['cves'];
  return Object.freeze({
    id,
    moduleName,
    severity,
    patchedFloor: floor === null ? null : floor[1]!,
    cves: Object.freeze(Array.isArray(cves) ? cves.filter((cve): cve is string => typeof cve === 'string') : []),
  });
}

/**
 * Parse and VALIDATE a pnpm audit receipt.
 *
 * THE PARITY OBLIGATION: the severity COUNTS and the advisory LIST must agree,
 * in both directions. The gate used to read the counts alone and throw the
 * advisory objects away, which is why a blocked build could only ever say
 * "1 high-severity vulnerability finding(s)" while the receipt it had just
 * parsed carried the module, the CVE, the patched range, and the dependency
 * path. A count nobody can act on is a numerator with no denominator.
 */
export function parsePnpmAuditReceipt(value: unknown): PnpmAuditReceipt {
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    throw new TypeError('audit receipt must be an object');
  const metadata = (value as Record<string, unknown>)['metadata'];
  if (metadata === null || typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new TypeError('audit receipt has no metadata');
  }
  const vulnerabilities = (metadata as Record<string, unknown>)['vulnerabilities'];
  if (vulnerabilities === null || typeof vulnerabilities !== 'object' || Array.isArray(vulnerabilities)) {
    throw new TypeError('audit receipt has no vulnerability counts');
  }
  for (const severity of SEVERITIES) {
    const count = (vulnerabilities as Record<string, unknown>)[severity];
    if (!Number.isSafeInteger(count) || (count as number) < 0)
      throw new TypeError(`audit ${severity} count is invalid`);
  }
  const rawAdvisories = (value as Record<string, unknown>)['advisories'] ?? {};
  if (typeof rawAdvisories !== 'object' || rawAdvisories === null || Array.isArray(rawAdvisories)) {
    throw new TypeError('audit receipt advisories must be an object');
  }
  const advisories = Object.entries(rawAdvisories as Record<string, unknown>).map(([id, raw]) => advisoryFrom(id, raw));
  for (const severity of SEVERITIES) {
    const declared = (vulnerabilities as Record<string, number>)[severity]!;
    const listed = advisories.filter((advisory) => advisory.severity === severity).length;
    if (declared !== listed) {
      throw new TypeError(
        `audit receipt claims ${declared} ${severity} finding(s) but lists ${listed} — counts and advisories disagree`,
      );
    }
  }
  return Object.freeze({ metadata: { vulnerabilities }, advisories: Object.freeze(advisories) } as PnpmAuditReceipt);
}

/**
 * The blocking verdict, stated with IDENTITY. Every line names the module, the
 * severity, the CVEs, and the floor that closes it — so a red build is
 * actionable from its own output instead of requiring a second investigation.
 */
export function blockingAuditFindings(receipt: PnpmAuditReceipt): readonly string[] {
  const blocking = receipt.advisories.filter((advisory) =>
    (BLOCKING_SEVERITIES as readonly string[]).includes(advisory.severity),
  );
  return Object.freeze(
    blocking
      .map((advisory) => {
        const cves = advisory.cves.length === 0 ? '' : ` (${advisory.cves.join(', ')})`;
        const remedy = advisory.patchedFloor === null ? 'no patched release' : `fixed in >=${advisory.patchedFloor}`;
        return `${advisory.moduleName} — ${advisory.severity}${cves}; ${remedy} [advisory ${advisory.id}]`;
      })
      .sort((a, b) => a.localeCompare(b)),
  );
}

/**
 * THE ONLINE LAW — the live receipt is the ANCHOR for the minimum table.
 *
 * Every package the registry reports at BLOCKING severity must carry a declared
 * security minimum at or above the floor that closes it. This is what keeps
 * {@link SECURITY_MINIMUMS} current: a newly published advisory reds here until
 * the floor is declared AND raised, rather than waiting for someone to notice
 * that a hand-maintained table fell behind the feed.
 *
 * SCOPED TO {@link BLOCKING_SEVERITIES} ON PURPOSE. Quantifying over every
 * severity would make a `low` advisory against some transitive dev package fail
 * the build, which silently WIDENS what blocks beyond this gate's stated
 * authority — the same defect as a silent narrowing, only inverted. Currency of
 * the floor table is demanded exactly where the verdict is enforced.
 *
 * An advisory with no patched release cannot be closed by a floor; it is
 * reported as such and left to the blocking verdict, because inventing a
 * suppression path for a case with no live instance is how relaxations get
 * built before they are needed.
 */
export function advisoryFloorFindings(receipt: PnpmAuditReceipt, packageJson: unknown): readonly string[] {
  const findings: string[] = [];
  const declared: Readonly<Record<string, string>> = SECURITY_MINIMUMS;
  const overrides = rootOverrides(packageJson);
  const entries = Object.entries(overrides).flatMap((pair) => {
    const entry = parseOverrideEntry(pair[0], pair[1]);
    return entry === null ? [] : [entry];
  });
  const governed = receipt.advisories.filter((advisory) =>
    (BLOCKING_SEVERITIES as readonly string[]).includes(advisory.severity),
  );
  for (const advisory of governed) {
    if (advisory.patchedFloor === null) {
      findings.push(`${advisory.moduleName} advisory ${advisory.id} has no patched release; a floor cannot close it`);
      continue;
    }
    const minimum = declared[advisory.moduleName];
    if (minimum === undefined) {
      findings.push(
        `${advisory.moduleName} carries advisory ${advisory.id} but declares no security minimum; require >=${advisory.patchedFloor}`,
      );
      continue;
    }
    if (!versionAtLeast(minimum, advisory.patchedFloor)) {
      findings.push(
        `${advisory.moduleName} declares minimum ${minimum}; advisory ${advisory.id} requires >=${advisory.patchedFloor}`,
      );
    }
    if (!entries.some((entry) => entry.packageName === advisory.moduleName)) {
      findings.push(`${advisory.moduleName} declares a security minimum with no root override to enforce it`);
    }
  }
  return Object.freeze([...new Set(findings)].sort((a, b) => a.localeCompare(b)));
}
