import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { getStore } from '@netlify/blobs';
import { DB_KEY, RATES_KEY, STORE_NAME } from '../src/server/storage';

const LOCAL_BLOBS_DIR = path.resolve(process.cwd(), '.netlify/blobs-serve');

async function readSiteId(): Promise<string | null> {
  try {
    const raw = await readFile(path.resolve(process.cwd(), '.netlify/state.json'), 'utf-8');
    const state = JSON.parse(raw) as { siteId?: string };
    return state.siteId ?? null;
  } catch {
    return null;
  }
}

function localBlobPaths(siteId: string, key: string): { entryPath: string; metadataPath: string } {
  const storeSegment = encodeURIComponent(`site:${STORE_NAME}`);
  return {
    entryPath: path.join(LOCAL_BLOBS_DIR, 'entries', siteId, storeSegment, key),
    metadataPath: path.join(LOCAL_BLOBS_DIR, 'metadata', siteId, storeSegment, key),
  };
}

async function writeLocalBlob(siteId: string, key: string, data: unknown): Promise<void> {
  const { entryPath, metadataPath } = localBlobPaths(siteId, key);
  await mkdir(path.dirname(entryPath), { recursive: true });
  await mkdir(path.dirname(metadataPath), { recursive: true });
  await writeFile(entryPath, JSON.stringify(data), 'utf-8');
  await writeFile(metadataPath, '{}', 'utf-8');
}

async function writeRemoteBlob(siteId: string, token: string, key: string, data: unknown): Promise<void> {
  const store = getStore({ name: STORE_NAME, siteID: siteId, token });
  await store.setJSON(key, data);
}

async function main(): Promise<void> {
  const production = process.argv.includes('--production');
  const dbPath = path.resolve(process.cwd(), 'data/db.json');
  const dbRaw = await readFile(dbPath, 'utf-8');
  const db = JSON.parse(dbRaw) as unknown;

  const siteId = await readSiteId();
  if (!siteId) {
    throw new Error('Brak powiązanego site — uruchom najpierw: netlify link');
  }

  if (production) {
    const token = process.env.NETLIFY_AUTH_TOKEN;
    if (!token) {
      throw new Error(
        'Brak NETLIFY_AUTH_TOKEN — zaloguj się: netlify login, potem uruchom ponownie w tej samej sesji terminala.',
      );
    }
    await writeRemoteBlob(siteId, token, DB_KEY, db);
    console.log(`Seeded production blob "${DB_KEY}" in store "${STORE_NAME}".`);
  } else {
    await writeLocalBlob(siteId, DB_KEY, db);
    console.log(`Seeded local blob "${DB_KEY}" in store "${STORE_NAME}".`);
    console.log('(lokalny sandbox w .netlify/blobs-serve — odśwież stronę w dev:netlify)');
  }

  const ratesPath = path.resolve(process.cwd(), 'data/rates.json');
  try {
    const ratesRaw = await readFile(ratesPath, 'utf-8');
    const rates = JSON.parse(ratesRaw) as unknown;
    if (production) {
      const token = process.env.NETLIFY_AUTH_TOKEN!;
      await writeRemoteBlob(siteId, token, RATES_KEY, rates);
    } else {
      await writeLocalBlob(siteId, RATES_KEY, rates);
    }
    console.log(`Seeded blob "${RATES_KEY}" in store "${STORE_NAME}".`);
  } catch {
    console.log(`No ${ratesPath} — skipped rates seed.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
