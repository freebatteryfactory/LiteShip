/** Generate the fleet event type and Web DOM projections from owner catalogs. */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  collectEventProtocol,
  renderEventProtocolDts,
  renderEventProtocolHostProjection,
  renderWebEventProjection,
} from './lib/event-protocol-contract.js';

const root = process.cwd();
const records = collectEventProtocol(root);
writeFileSync(resolve(root, 'packages/_spine/events.generated.d.ts'), renderEventProtocolDts(records), 'utf8');
writeFileSync(
  resolve(root, 'packages/web/src/wire/liteship-events.generated.ts'),
  renderWebEventProjection(records),
  'utf8',
);
writeFileSync(
  resolve(root, 'packages/cli/src/internal/fleet-event-protocol.generated.ts'),
  renderEventProtocolHostProjection(records),
  'utf8',
);
console.log(`generated ${records.length} fleet event contracts`);
