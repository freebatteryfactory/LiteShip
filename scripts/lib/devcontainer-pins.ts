import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import fg from 'fast-glob';
import {
  activeLinesOf,
  childIndicesOf,
  stepIndicesOf,
  unreadableYamlViolations,
  workflowJobSections,
  type ActiveLine,
} from '../../packages/cli/src/internal/workflow-action-pins.js';

const RUST_WASM_TARGET = 'wasm32-unknown-unknown';
const REQUIRED_RUST_COMPONENTS = Object.freeze(['clippy', 'rustfmt'] as const);

export interface RustDependencyCensusEntry {
  readonly table: string;
  readonly name: string;
  readonly requirement: string;
  readonly lockedVersions: readonly string[];
}

function tableNames(source: string): readonly string[] {
  const names: string[] = [];
  for (const originalLine of source.split(/\r?\n/u)) {
    const line = stripTomlComment(originalLine).trim();
    const table = /^\[([^\[\]]+)\]$/u.exec(line)?.[1]?.trim();
    if (table === undefined) continue;
    if (names.includes(table)) throw new TypeError(`Cargo manifest has duplicate table ${table}`);
    names.push(table);
  }
  return Object.freeze(names);
}

function directDependencyTableNames(source: string, manifestPath: string): readonly string[] {
  const direct = /^(?:dependencies|dev-dependencies|build-dependencies)$/u;
  const target =
    /^target\.(?:'(?:[^']|'')+'|"(?:[^"\\]|\\.)+"|[A-Za-z0-9_-]+)\.(?:dependencies|dev-dependencies|build-dependencies)$/u;
  const dependencyShaped = /(?:^|\.)(?:dependencies|dev-dependencies|build-dependencies)(?:\.|$)/u;
  const tables: string[] = [];
  for (const table of tableNames(source)) {
    if (direct.test(table) || target.test(table)) tables.push(table);
    else if (dependencyShaped.test(table)) {
      throw new TypeError(`${manifestPath} has unsupported dependency table ${table}`);
    }
  }
  return Object.freeze(tables.sort(codeUnitCompare));
}

export interface RustFeatureCensusEntry {
  readonly name: string;
  readonly members: readonly string[];
}

/** One independently-discovered Cargo subject and the authority-bearing inputs derived from it. */
export interface RustCrateCensusEntry {
  readonly manifestPath: string;
  readonly lockPath: string;
  readonly packageName: string;
  readonly dependencies: readonly RustDependencyCensusEntry[];
  readonly defaultFeatures: readonly string[];
  readonly optionalFeatures: readonly RustFeatureCensusEntry[];
}

function codeUnitCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function stripTomlComment(line: string): string {
  let quote: '"' | "'" | null = null;
  let escaped = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]!;
    if (escaped) {
      escaped = false;
      continue;
    }
    if (quote === '"' && char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = quote === char ? null : quote === null ? char : quote;
      continue;
    }
    if (char === '#' && quote === null) return line.slice(0, index);
  }
  return line;
}

function tableEntries(source: string, tableName: string, sourceName: string): ReadonlyMap<string, string> {
  const entries = new Map<string, string>();
  let activeTable = '';
  for (const originalLine of source.split(/\r?\n/u)) {
    const line = stripTomlComment(originalLine).trim();
    if (line === '') continue;
    const table = /^\[([^\]]+)\]$/u.exec(line);
    if (table) {
      activeTable = table[1]!.trim();
      continue;
    }
    if (activeTable !== tableName) continue;
    const entry = /^([A-Za-z0-9_-]+)\s*=\s*(.+)$/u.exec(line);
    if (!entry) throw new TypeError(`${sourceName} has an unsupported ${tableName} entry: ${line}`);
    const key = entry[1]!;
    if (entries.has(key)) throw new TypeError(`${sourceName} has duplicate ${tableName}.${key}`);
    entries.set(key, entry[2]!.trim());
  }
  return entries;
}

function parseTomlString(raw: string, subject: string): string {
  if (!/^"(?:[^"\\]|\\.)*"$/u.test(raw)) throw new TypeError(`${subject} must be a basic TOML string`);
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'string') throw new TypeError(`${subject} must decode to a string`);
    return parsed;
  } catch (error) {
    if (error instanceof TypeError) throw error;
    throw new TypeError(`${subject} is not a valid basic TOML string`);
  }
}

function parseTomlStringArray(raw: string, subject: string): readonly string[] {
  if (!/^\[[\s\S]*\]$/u.test(raw)) throw new TypeError(`${subject} must be a TOML string array`);
  const body = raw.slice(1, -1);
  const values: string[] = [];
  let remainder = body;
  const stringPattern = /"(?:[^"\\]|\\.)*"/uy;
  while (remainder.trim() !== '') {
    remainder = remainder.trimStart();
    stringPattern.lastIndex = 0;
    const match = stringPattern.exec(remainder);
    if (!match) throw new TypeError(`${subject} must contain only basic TOML strings`);
    values.push(parseTomlString(match[0], subject));
    remainder = remainder.slice(match[0].length).trimStart();
    if (remainder === '') break;
    if (!remainder.startsWith(',')) throw new TypeError(`${subject} has a malformed separator`);
    remainder = remainder.slice(1);
  }
  if (new Set(values).size !== values.length) throw new TypeError(`${subject} contains duplicate values`);
  return Object.freeze(values);
}

function dependencyRequirement(raw: string, subject: string): string {
  if (raw.startsWith('"')) return parseTomlString(raw, subject);
  if (/^\{[\s\S]*\}$/u.test(raw)) return raw.replace(/\s+/gu, ' ').trim();
  throw new TypeError(`${subject} must be a version string or inline table`);
}

function lockedPackages(lockSource: string, lockPath: string): ReadonlyMap<string, readonly string[]> {
  const versions = new Map<string, Set<string>>();
  for (const block of lockSource.split(/^\[\[package\]\]\s*$/gmu).slice(1)) {
    const nameRaw = /^name\s*=\s*("(?:[^"\\]|\\.)*")\s*$/mu.exec(block)?.[1];
    const versionRaw = /^version\s*=\s*("(?:[^"\\]|\\.)*")\s*$/mu.exec(block)?.[1];
    if (nameRaw === undefined || versionRaw === undefined) {
      throw new TypeError(`${lockPath} contains a package without a basic-string name and version`);
    }
    const name = parseTomlString(nameRaw, `${lockPath} package name`);
    const version = parseTomlString(versionRaw, `${lockPath} ${name} version`);
    const current = versions.get(name) ?? new Set<string>();
    current.add(version);
    versions.set(name, current);
  }
  if (versions.size === 0) throw new TypeError(`${lockPath} contains no [[package]] subjects`);
  return new Map(
    [...versions.entries()].map(([name, values]) => [name, Object.freeze([...values].sort(codeUnitCompare))]),
  );
}

/** Discover every immediate crates/* Cargo subject; no authored crate allowlist can hide a new manifest. */
export function deriveRustCrateCensus(repoRoot: string): readonly RustCrateCensusEntry[] {
  const manifests = fg
    .sync('crates/*/Cargo.toml', { cwd: repoRoot, onlyFiles: true, unique: true })
    .map((path) => path.replaceAll('\\', '/'))
    .sort(codeUnitCompare);
  if (manifests.length === 0) throw new TypeError('Rust crate census discovered zero crates/*/Cargo.toml subjects');

  return Object.freeze(
    manifests.map((manifestPath) => {
      const manifestSource = readFileSync(resolve(repoRoot, manifestPath), 'utf8');
      const lockPath = `${dirname(manifestPath).replaceAll('\\', '/')}/Cargo.lock`;
      const absoluteLockPath = resolve(repoRoot, lockPath);
      if (!existsSync(absoluteLockPath)) throw new TypeError(`${manifestPath} has no adjacent Cargo.lock`);
      const locked = lockedPackages(readFileSync(absoluteLockPath, 'utf8'), lockPath);

      const packageEntries = tableEntries(manifestSource, 'package', manifestPath);
      const packageNameRaw = packageEntries.get('name');
      if (packageNameRaw === undefined) throw new TypeError(`${manifestPath} has no package.name`);
      const packageName = parseTomlString(packageNameRaw, `${manifestPath} package.name`);
      if (!locked.has(packageName)) throw new TypeError(`${lockPath} does not contain crate package ${packageName}`);

      const dependencies = directDependencyTableNames(manifestSource, manifestPath)
        .flatMap((table) =>
          [...tableEntries(manifestSource, table, manifestPath).entries()].map(([name, raw]) => ({ table, name, raw })),
        )
        .map(({ table, name, raw }) => {
          const lockedVersions = locked.get(name);
          if (lockedVersions === undefined)
            throw new TypeError(`${lockPath} does not resolve direct dependency ${name}`);
          return Object.freeze({
            table,
            name,
            requirement: dependencyRequirement(raw, `${manifestPath} dependencies.${name}`),
            lockedVersions,
          });
        })
        .sort((left, right) => codeUnitCompare(left.name, right.name) || codeUnitCompare(left.table, right.table));

      const featureEntries = tableEntries(manifestSource, 'features', manifestPath);
      const defaultRaw = featureEntries.get('default');
      if (defaultRaw === undefined) throw new TypeError(`${manifestPath} must declare features.default explicitly`);
      const defaultFeatures = parseTomlStringArray(defaultRaw, `${manifestPath} features.default`);
      const optionalFeatures = [...featureEntries.entries()]
        .filter(([name]) => name !== 'default')
        .map(([name, raw]) =>
          Object.freeze({ name, members: parseTomlStringArray(raw, `${manifestPath} features.${name}`) }),
        )
        .sort((left, right) => codeUnitCompare(left.name, right.name));
      const declaredFeatures = new Set(optionalFeatures.map((feature) => feature.name));
      const dependencyNames = new Set(dependencies.map((dependency) => dependency.name));
      for (const [featureName, members] of [
        ['default', defaultFeatures],
        ...optionalFeatures.map((feature) => [feature.name, feature.members] as const),
      ] as const) {
        for (const member of members) {
          const dependency = member.startsWith('dep:')
            ? member.slice(4)
            : member.includes('/')
              ? member.split('/')[0]!
              : null;
          if (dependency !== null) {
            if (!dependencyNames.has(dependency)) {
              throw new TypeError(
                `${manifestPath} features.${featureName} references unknown dependency ${dependency}`,
              );
            }
          } else if (!declaredFeatures.has(member)) {
            throw new TypeError(`${manifestPath} features.${featureName} references unknown feature ${member}`);
          }
        }
      }

      return Object.freeze({
        manifestPath,
        lockPath,
        packageName,
        dependencies: Object.freeze(dependencies),
        defaultFeatures,
        optionalFeatures: Object.freeze(optionalFeatures),
      });
    }),
  );
}

/** Inputs consumed by the static dev-container pin authority. */
export interface DevcontainerPinInputs {
  readonly packageManager: string;
  readonly nodeEngine: string;
  readonly nvmrc: string;
  readonly rustToolchain: string;
  readonly dockerfile: string;
  readonly devcontainerJson: string;
  readonly postCreate: string;
  readonly ciWorkflow: string;
  readonly releaseWorkflow: string;
}

interface RustWorkflowSetup {
  readonly action: string;
  readonly toolchain?: string;
  readonly targets?: string;
  readonly components?: string;
}

interface RustWorkflowSetupScan {
  readonly setups: readonly RustWorkflowSetup[];
  readonly violations: readonly string[];
}

function commaSeparatedSet(raw: string | undefined): readonly string[] {
  if (raw === undefined) return Object.freeze([]);
  return Object.freeze(
    raw
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
      .sort(codeUnitCompare),
  );
}

function sameValues(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function decodeSimpleYamlScalar(raw: string): string | null {
  const value = raw.trim();
  if (/^'(?:[^']|'')*'$/u.test(value)) return value.slice(1, -1).replaceAll("''", "'");
  if (/^"(?:[^"\\]|\\.)*"$/u.test(value)) {
    try {
      const decoded: unknown = JSON.parse(value);
      return typeof decoded === 'string' ? decoded : null;
    } catch {
      return null;
    }
  }
  const comment = value.indexOf(' #');
  const bare = (comment === -1 ? value : value.slice(0, comment)).trim();
  return /^[A-Za-z0-9_./@,+ -]+$/u.test(bare) ? bare : null;
}

function directScalarOf(
  lines: readonly ActiveLine[],
  parentIndex: number,
  key: string,
  includeParentBullet: boolean,
): { readonly value?: string; readonly violation?: string } {
  const candidates: string[] = [];
  if (includeParentBullet) {
    const parent = /^-\s+(.+)$/u.exec(lines[parentIndex]!.body)?.[1];
    if (parent?.startsWith(`${key}:`)) candidates.push(parent.slice(key.length + 1).trim());
  }
  for (const childIndex of childIndicesOf(lines, parentIndex)) {
    const body = lines[childIndex]!.body;
    if (body.startsWith(`${key}:`)) candidates.push(body.slice(key.length + 1).trim());
  }
  if (candidates.length === 0) return {};
  if (candidates.length !== 1) return { violation: `duplicate direct ${key} fields` };
  const value = decodeSimpleYamlScalar(candidates[0]!);
  return value === null || value === '' ? { violation: `${key} is not a simple YAML scalar` } : { value };
}

function directMappingIndexOf(
  lines: readonly ActiveLine[],
  parentIndex: number,
  key: string,
): { readonly index?: number; readonly violation?: string } {
  const candidates = childIndicesOf(lines, parentIndex).filter((index) => lines[index]!.body.startsWith(`${key}:`));
  if (candidates.length === 0) return {};
  if (candidates.length !== 1) return { violation: `duplicate direct ${key} mappings` };
  const index = candidates[0]!;
  if (!new RegExp(`^${key}:\\s*(?:#.*)?$`, 'u').test(lines[index]!.body)) {
    return { violation: `${key} must be a block mapping` };
  }
  return { index };
}

function rustWorkflowSetups(workflow: string): RustWorkflowSetupScan {
  const violations = [...unreadableYamlViolations(workflow)];
  if (violations.length > 0) return Object.freeze({ setups: Object.freeze([]), violations: Object.freeze(violations) });

  const setups: RustWorkflowSetup[] = [];
  let sections: ReadonlyMap<string, string>;
  try {
    sections = workflowJobSections(workflow);
  } catch (error) {
    return Object.freeze({
      setups: Object.freeze([]),
      violations: Object.freeze([error instanceof Error ? error.message : String(error)]),
    });
  }
  for (const [job, section] of sections) {
    const lines = activeLinesOf(section);
    for (const stepIndex of stepIndicesOf(lines)) {
      const uses = directScalarOf(lines, stepIndex, 'uses', true);
      if (uses.violation !== undefined) {
        violations.push(`${job}: ${uses.violation}`);
        continue;
      }
      if (uses.value === undefined || !uses.value.startsWith('dtolnay/rust-toolchain@')) continue;

      const withMapping = directMappingIndexOf(lines, stepIndex, 'with');
      if (withMapping.violation !== undefined) {
        violations.push(`${job}: Rust action ${withMapping.violation}`);
        continue;
      }
      if (withMapping.index === undefined) {
        setups.push(Object.freeze({ action: uses.value }));
        continue;
      }
      const fields: Partial<Record<'toolchain' | 'targets' | 'components', string>> = {};
      for (const field of ['toolchain', 'targets', 'components'] as const) {
        const scalar = directScalarOf(lines, withMapping.index, field, false);
        if (scalar.violation !== undefined) violations.push(`${job}: Rust action with.${scalar.violation}`);
        else if (scalar.value !== undefined) fields[field] = scalar.value;
      }
      setups.push(Object.freeze({ action: uses.value, ...fields }));
    }
  }
  return Object.freeze({ setups: Object.freeze(setups), violations: Object.freeze(violations) });
}

/** Return every pin-law violation. Empty is the blocking check's green verdict. */
export function validateDevcontainerPins(input: DevcontainerPinInputs): readonly string[] {
  const failures: string[] = [];
  if (!input.devcontainerJson.includes('"build"') || /"image"\s*:/.test(input.devcontainerJson)) {
    failures.push('devcontainer.json must build the pinned Dockerfile and must not use a floating image');
  }
  const node = /FROM node:(\d+)\.(\d+)\.(\d+)-/.exec(input.dockerfile);
  if (!node) {
    failures.push('Dockerfile must use a fully pinned node:X.Y.Z image');
  } else {
    const actual = node.slice(1, 4).map(Number);
    const floor = input.nodeEngine.replace(/^>=?/, '').split('.').map(Number);
    if (String(actual[0]) !== input.nvmrc) failures.push('Dockerfile node major must equal .nvmrc');
    for (let i = 0; i < 3; i += 1) {
      if ((actual[i] ?? 0) === (floor[i] ?? 0)) continue;
      if ((actual[i] ?? 0) < (floor[i] ?? 0))
        failures.push('Dockerfile node version is below package.json engines.node');
      break;
    }
  }
  const pnpmVersion = input.packageManager.split('@')[1];
  if (!pnpmVersion || !/^\d+\.\d+\.\d+$/.test(pnpmVersion)) {
    failures.push('package.json packageManager must be pnpm@X.Y.Z');
  } else {
    if (!input.dockerfile.includes(`pnpm@${pnpmVersion}`)) failures.push('Dockerfile pnpm pin must match package.json');
    if (!input.postCreate.includes(`pnpm@${pnpmVersion}`))
      failures.push('post-create pnpm pin must match package.json');
  }
  const rustChannel = /^channel\s*=\s*"(\d+\.\d+\.\d+)"\s*$/m.exec(input.rustToolchain)?.[1];
  if (!rustChannel) failures.push('rust-toolchain.toml must pin an exact X.Y.Z channel');
  if (!/^profile\s*=\s*"minimal"\s*$/m.test(input.rustToolchain)) {
    failures.push('rust-toolchain.toml must select the minimal profile');
  }
  const toolchainEntries = tableEntries(input.rustToolchain, 'toolchain', 'rust-toolchain.toml');
  const targetRaw = toolchainEntries.get('targets');
  const toolchainTargets =
    targetRaw === undefined ? [] : parseTomlStringArray(targetRaw, 'rust-toolchain.toml targets');
  if (!sameValues([...toolchainTargets].sort(codeUnitCompare), [RUST_WASM_TARGET]))
    failures.push(`rust-toolchain.toml targets must equal ${RUST_WASM_TARGET}`);
  const componentRaw = toolchainEntries.get('components');
  const toolchainComponents =
    componentRaw === undefined ? [] : parseTomlStringArray(componentRaw, 'rust-toolchain.toml components');
  if (!sameValues([...toolchainComponents].sort(codeUnitCompare), REQUIRED_RUST_COMPONENTS))
    failures.push('rust-toolchain.toml components must equal clippy, rustfmt');

  if (!input.dockerfile.includes('COPY rust-toolchain.toml /opt/liteship/rust-toolchain.toml')) {
    failures.push('Dockerfile must COPY the repository rust-toolchain.toml');
  }
  const dockerToolchains = [...input.dockerfile.matchAll(/--default-toolchain\s+("\$RUST_TOOLCHAIN"|\S+)/gu)].map(
    (match) => match[1]!,
  );
  if (!input.dockerfile.includes('RUST_TOOLCHAIN="$(sed') || !sameValues(dockerToolchains, ['"$RUST_TOOLCHAIN"'])) {
    failures.push('Dockerfile must install the exact channel read from rust-toolchain.toml');
  }
  const dockerTargets = [...input.dockerfile.matchAll(/--target\s+([A-Za-z0-9_-]+)/gu)]
    .map((match) => match[1]!)
    .sort(codeUnitCompare);
  if (!sameValues(dockerTargets, [RUST_WASM_TARGET]))
    failures.push(`Dockerfile Rust setup targets must equal ${RUST_WASM_TARGET}`);
  const dockerComponents = [...input.dockerfile.matchAll(/--component\s+([A-Za-z0-9_-]+)/gu)]
    .map((match) => match[1]!)
    .sort(codeUnitCompare);
  if (!sameValues(dockerComponents, REQUIRED_RUST_COMPONENTS)) {
    failures.push('Dockerfile Rust setup components must equal clippy, rustfmt');
  }

  for (const [name, workflow] of [
    ['CI', input.ciWorkflow],
    ['release', input.releaseWorkflow],
  ] as const) {
    const scan = rustWorkflowSetups(workflow);
    for (const violation of scan.violations) failures.push(`${name} workflow is unreadable: ${violation}`);
    const setups = scan.setups;
    if (setups.length === 0 || setups.some((setup) => !/^dtolnay\/rust-toolchain@[0-9a-f]{40}$/u.test(setup.action))) {
      failures.push(`${name} must carry a SHA-pinned Rust toolchain action`);
    }
    for (const [index, setup] of setups.entries()) {
      const subject = `${name} Rust action setup ${index + 1}`;
      if (rustChannel && setup.toolchain !== rustChannel) {
        failures.push(`${subject} toolchain must equal rust-toolchain.toml (${rustChannel})`);
      }
      if (!sameValues(commaSeparatedSet(setup.targets), [RUST_WASM_TARGET])) {
        failures.push(`${subject} targets must equal ${RUST_WASM_TARGET}`);
      }
      if (!sameValues(commaSeparatedSet(setup.components), REQUIRED_RUST_COMPONENTS)) {
        failures.push(`${subject} components must equal clippy, rustfmt`);
      }
    }
  }
  return failures;
}
