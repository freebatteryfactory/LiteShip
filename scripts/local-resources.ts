#!/usr/bin/env tsx
/** Print the current deterministic local scheduling plan without running work. @module */

import {
  formatLocalResourcePlan,
  sampleLocalResources,
  selectLocalResourcePlan,
} from './lib/local-resource-profile.js';

const plan = selectLocalResourcePlan(await sampleLocalResources(), { ci: process.env.CI === 'true' });
if (process.argv.includes('--json')) console.log(JSON.stringify(plan, null, 2));
else console.log(formatLocalResourcePlan(plan));
