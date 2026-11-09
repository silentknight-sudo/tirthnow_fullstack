/**
 * Copies the website's Yatra Journey data into the app, so both show the
 * same routes and stop details.
 *   npx tsx apps/mobile/tool/export_journey.ts
 * Writes apps/mobile/assets/journey/journey.json (committed).
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { VEHICLES, YATRAS } from '../../website/lib/journey';
import { STOP_HI } from '../../website/lib/journey-hi';

const out = join(__dirname, '..', 'assets', 'journey', 'journey.json');
writeFileSync(out, `${JSON.stringify({ vehicles: VEHICLES, yatras: YATRAS, stopHi: STOP_HI }, null, 1)}\n`);
console.log(`wrote ${out}`);
