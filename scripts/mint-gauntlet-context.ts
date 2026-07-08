/**
 * Mint `reports/gauntlet-context.json` once for a gauntlet run.
 *
 * Parallel CI setup calls this before fan-out so every lane reuses the same
 * `gauntletRunId` when writing bench, coverage, and runtime-seams artifacts.
 *
 * @module
 */

import { ensureArtifactContext } from './artifact-context.js';

ensureArtifactContext();
