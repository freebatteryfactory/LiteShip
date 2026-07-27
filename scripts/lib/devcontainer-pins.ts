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
  if (!/^targets\s*=\s*\[[^\]]*"wasm32-unknown-unknown"[^\]]*\]\s*$/m.test(input.rustToolchain)) {
    failures.push('rust-toolchain.toml must own the wasm32-unknown-unknown target');
  }

  if (!input.dockerfile.includes('COPY rust-toolchain.toml /opt/liteship/rust-toolchain.toml')) {
    failures.push('Dockerfile must COPY the repository rust-toolchain.toml');
  }
  if (
    !input.dockerfile.includes('RUST_TOOLCHAIN="$(sed') ||
    !input.dockerfile.includes('--default-toolchain "$RUST_TOOLCHAIN"') ||
    /--default-toolchain\s+stable\b/.test(input.dockerfile)
  ) {
    failures.push('Dockerfile must install the exact channel read from rust-toolchain.toml');
  }

  for (const [name, workflow] of [
    ['CI', input.ciWorkflow],
    ['release', input.releaseWorkflow],
  ] as const) {
    if (!/dtolnay\/rust-toolchain@[0-9a-f]{40}/.test(workflow)) {
      failures.push(`${name} must carry a SHA-pinned Rust toolchain action`);
    }
    const declared = [...workflow.matchAll(/^\s*toolchain:\s*([^\s#]+)\s*$/gm)].map((match) => match[1]);
    if (rustChannel && (declared.length === 0 || declared.some((channel) => channel !== rustChannel))) {
      failures.push(`${name} Rust action toolchain must equal rust-toolchain.toml (${rustChannel})`);
    }
  }
  return failures;
}
