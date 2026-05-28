import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getStore } from '@netlify/blobs';
import { DB_KEY, RATES_KEY, STORE_NAME } from '../src/server/storage';

async function main(): Promise<void> {
  if (process.env.NETLIFY !== 'true') {
    console.warn('NETLIFY is not "true" — run via "netlify dev" or set context for production blobs.');
  }

  const store = getStore(STORE_NAME);
  const dbPath = path.resolve(process.cwd(), 'data/db.json');

  const dbRaw = await readFile(dbPath, 'utf-8');
  const db = JSON.parse(dbRaw) as unknown;
  await store.setJSON(DB_KEY, db);
  console.log(`Seeded blob "${DB_KEY}" in store "${STORE_NAME}".`);

  const ratesPath = path.resolve(process.cwd(), 'data/rates.json');
  try {
    const ratesRaw = await readFile(ratesPath, 'utf-8');
    const rates = JSON.parse(ratesRaw) as unknown;
    await store.setJSON(RATES_KEY, rates);
    console.log(`Seeded blob "${RATES_KEY}" in store "${STORE_NAME}".`);
  } catch {
    console.log(`No ${ratesPath} — skipped rates seed.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
