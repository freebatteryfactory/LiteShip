/** Inputs consumed by the static dev-container pin authority. */
export interface DevcontainerPinInputs {
  readonly packageManager: string;
  readonly nodeEngine: string;
  readonly nvmrc: string;
  readonly dockerfile: string;
  readonly devcontainerJson: string;
  readonly postCreate: string;
  readonly ciWorkflow: string;
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
  const rustSha = /dtolnay\/rust-toolchain@([0-9a-f]{40})/.exec(input.ciWorkflow)?.[1];
  if (!rustSha) failures.push('CI must carry a SHA-pinned Rust toolchain action');
  if (/rust|rustup|cargo|dtolnay/i.test(input.dockerfile) && rustSha && !input.dockerfile.includes(rustSha)) {
    failures.push('Rust-installing Dockerfile must reference the repository Rust toolchain pin');
  }
  return failures;
}
