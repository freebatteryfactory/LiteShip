/**
 * Gauntlet orchestrator — runs the canonical CUT D8 phase sequence serially.
 *
 * Phase list is the ONE source of truth in `packages/cli/src/gauntlet-phases.ts`.
 * The executor loops it; global concerns (env, cwd, watchdog, timings, exit)
 * stay here in run()/main().
 *
 * @module
 */

import { execSync, spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gauntletPhases } from '../packages/cli/src/gauntlet-phases.js';
import { formatUnexpectedArgvReceipt, parseGauntletArgv } from '../packages/cli/src/gauntlet-argv.js';
import { isDirectExecution } from './audit/shared.js';

const ROOT = resolve(import.meta.dirname, '..');
const STDERR_TAIL_CAP = 8192;

interface StepResult {
  command: string;
  durationMs: number;
}

interface RunOptions {
  /**
   * Once this regex matches the child's piped stdout, the work is considered
   * complete and a grace window opens for the child to exit on its own. If
   * the child doesn't close before `gracePeriodMs` elapses, we tree-kill it.
   * Used to defuse vitest browser's Chromium teardown hang on Windows: by the
   * time the v8 coverage report header prints, the data is already on disk,
   * so a watchdog reap after the marker is safe to treat as success.
   */
  doneMarker?: RegExp;
  gracePeriodMs?: number;
}

const stepResults: StepResult[] = [];
let lastFailedStderrTail: string | undefined;

function killTree(pid: number): void {
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /T /F /PID ${pid}`, { stdio: 'ignore' });
    } else {
      execSync(`kill -9 -${pid}`, { stdio: 'ignore' });
    }
  } catch {
    // Already dead; nothing to do.
  }
}

function run(label: string, command: string, opts: RunOptions = {}): Promise<void> {
  const start = Date.now();
  const useDoneMarker = opts.doneMarker !== undefined;
  let stderrTail = '';
  return new Promise((resolveStep, rejectStep) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  ${label}`);
    console.log(`${'='.repeat(60)}\n`);

    const child = spawn(command, {
      shell: true,
      stdio: useDoneMarker ? ['inherit', 'pipe', 'pipe'] : ['inherit', 'inherit', 'pipe'],
      cwd: ROOT,
      // CZAP_GAUNTLET=1 lets downstream gates (e.g. flex-verify) detect that
      // they're running mid-gauntlet so they can trust prior gauntlet phases
      // (feedback:verify, capsule:verify, etc.) instead of re-spawning them
      // and tripping on intermediate fingerprint drift.
      env: { ...process.env, FORCE_COLOR: '1', CZAP_GAUNTLET: '1' },
    });

    if (child.stderr) {
      child.stderr.on('data', (chunk: Buffer) => {
        process.stderr.write(chunk);
        stderrTail = (stderrTail + chunk.toString('utf8')).slice(-STDERR_TAIL_CAP);
      });
    }

    let watchdog: NodeJS.Timeout | undefined;
    let postKill: NodeJS.Timeout | undefined;
    let watchdogFired = false;
    let markerSeen = false;
    let settled = false;

    const settle = (ok: boolean, code: number | null): void => {
      if (settled) return;
      settled = true;
      if (watchdog) clearTimeout(watchdog);
      if (postKill) clearTimeout(postKill);
      const durationMs = Date.now() - start;
      stepResults.push({ command: label, durationMs });
      if (ok) {
        if (watchdogFired && markerSeen) {
          console.log(
            `[gauntlet] "${label}" reaped by watchdog after ${durationMs}ms; the completion marker fired before kill, so on-disk artifacts are valid — treating as success.`,
          );
        }
        resolveStep();
      } else {
        lastFailedStderrTail = stderrTail;
        rejectStep(new Error(`"${label}" failed with exit code ${code}`));
      }
    };

    if (useDoneMarker && child.stdout) {
      // Rolling tail buffer so the marker still matches when the target line
      // arrives split across chunk boundaries (vitest browser on Windows
      // routinely fragments "Coverage report from v8" mid-phrase). 4 KiB is
      // far wider than any marker we use; capping prevents unbounded growth
      // on long-running children.
      let tail = '';
      const TAIL_CAP = 4096;
      child.stdout.on('data', (chunk: Buffer) => {
        process.stdout.write(chunk);
        if (markerSeen) return;
        const text = chunk.toString('utf8');
        tail = (tail + text).slice(-TAIL_CAP);
        if (opts.doneMarker!.test(tail)) {
          markerSeen = true;
          const grace = opts.gracePeriodMs ?? 60_000;
          watchdog = setTimeout(() => {
            watchdogFired = true;
            console.warn(
              `\n[gauntlet] "${label}" did not exit within ${grace}ms after the completion marker. ` +
                `Coverage data was already emitted to disk; tree-killing the child to unblock the next phase.`,
            );
            if (child.pid !== undefined) killTree(child.pid);
            // Chromium grandchildren can hold the inherited stdout handle
            // past process exit on Windows, which keeps our pipe open and
            // suppresses 'close'. Force settlement 5s after the tree-kill so
            // an unkillable orphan can't deadlock the rest of the gauntlet.
            postKill = setTimeout(() => settle(true, 0), 5_000);
          }, grace);
        }
      });
    }

    child.on('close', (code) => {
      if (code === 0) {
        settle(true, code);
      } else if (watchdogFired && markerSeen) {
        settle(true, code);
      } else {
        settle(false, code);
      }
    });

    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      if (watchdog) clearTimeout(watchdog);
      if (postKill) clearTimeout(postKill);
      lastFailedStderrTail = stderrTail;
      rejectStep(new Error(`"${label}" spawn error: ${err.message}`));
    });
  });
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const min = Math.floor(ms / 60_000);
  const sec = Math.round((ms % 60_000) / 1000);
  return `${min}m${sec}s`;
}

/**
 * Write step timings to `benchmarks/gauntlet-phase-timings.json` so the doc
 * can reference real per-phase numbers instead of guessing. Called from both
 * the success and failure paths so partial runs still produce data.
 */
function writePhaseTimingsArtifact(
  totalDurationMs: number,
  status: 'passed' | 'failed',
  failedPhase?: string,
  failedStderrTail?: string,
): void {
  try {
    const benchmarksDir = resolve(ROOT, 'benchmarks');
    mkdirSync(benchmarksDir, { recursive: true });
    const artifact = {
      _tag: 'GauntletPhaseTimings',
      _version: 1,
      timestamp: new Date().toISOString(),
      status,
      failedPhase: failedPhase ?? null,
      failedStderrTail: failedStderrTail ?? null,
      environment: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        ci: Boolean(process.env.CI),
      },
      totalDurationMs,
      totalDurationFormatted: formatDuration(totalDurationMs),
      phases: stepResults.map((step, index) => ({
        index: index + 1,
        name: step.command,
        durationMs: step.durationMs,
        durationFormatted: formatDuration(step.durationMs),
      })),
    };
    writeFileSync(resolve(benchmarksDir, 'gauntlet-phase-timings.json'), JSON.stringify(artifact, null, 2) + '\n');
  } catch (err) {
    // Artifact write failures are diagnostic, not fatal — the gauntlet's
    // pass/fail signal is the printed summary, not this side file.
    console.warn(`  (could not write gauntlet-phase-timings.json: ${err instanceof Error ? err.message : String(err)})`);
  }
}

async function main() {
  const { unexpected } = parseGauntletArgv(process.argv.slice(2));
  if (unexpected.length > 0) {
    process.stderr.write(formatUnexpectedArgvReceipt(unexpected));
    process.exit(1);
  }

  const gauntletStart = Date.now();

  try {
    // CUT D8: the phase sequence is the ONE canonical list in
    // packages/cli/src/gauntlet-phases.ts (the CLI dry-run projects the same
    // source). The executor loops it; global concerns (env, cwd, watchdog,
    // timings, exit) stay here in run()/main().
    for (const phase of gauntletPhases) {
      await run(
        phase.label,
        phase.command,
        phase.doneMarker ? { doneMarker: phase.doneMarker, gracePeriodMs: phase.gracePeriodMs } : {},
      );
    }

    // ── Summary ────────────────────────────────────────────────────────
    const totalDuration = Date.now() - gauntletStart;
    console.log(`\n${'='.repeat(60)}`);
    console.log('  GAUNTLET PASSED');
    console.log(`${'='.repeat(60)}`);
    console.log(`\n  Total wall-clock: ${formatDuration(totalDuration)}\n`);
    console.log('  Step timings:');
    for (const step of stepResults) {
      console.log(`    ${step.command.padEnd(48)} ${formatDuration(step.durationMs)}`);
    }
    console.log('');
    writePhaseTimingsArtifact(totalDuration, 'passed');
  } catch (error) {
    const totalDuration = Date.now() - gauntletStart;
    const errMsg = error instanceof Error ? error.message : String(error);
    const failedPhase = stepResults.length > 0 ? stepResults[stepResults.length - 1]!.command : undefined;
    console.error(`\n${'='.repeat(60)}`);
    console.error('  GAUNTLET FAILED');
    console.error(`${'='.repeat(60)}`);
    console.error(`\n  ${errMsg}`);
    console.error(`\n  Failed after ${formatDuration(totalDuration)}\n`);
    // Diagnostic dump: print each phase that ran (success + the failing one)
    // with status so CI failure logs surface the exact phase even when the
    // upload-artifact step that captures gauntlet-phase-timings.json is
    // out-of-reach. The last entry in stepResults is the failing phase
    // because the run() helper pushes via settle() before rejecting.
    if (stepResults.length > 0) {
      console.error('  Phase progress at failure:');
      for (let i = 0; i < stepResults.length; i++) {
        const step = stepResults[i]!;
        const isLast = i === stepResults.length - 1;
        const status = isLast ? 'FAILED' : 'ok';
        console.error(`    ${(i + 1).toString().padStart(2)}. ${step.command.padEnd(50)} ${formatDuration(step.durationMs).padStart(8)}  ${status}`);
      }
      console.error('');
    }
    if (lastFailedStderrTail) {
      console.error('  Failed phase stderr tail:');
      console.error(lastFailedStderrTail);
      console.error('');
    }
    writePhaseTimingsArtifact(totalDuration, 'failed', failedPhase, lastFailedStderrTail);
    process.exit(1);
  }
}

if (isDirectExecution(import.meta.url)) {
  void main();
}
