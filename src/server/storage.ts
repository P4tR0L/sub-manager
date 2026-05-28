import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { getStore } from '@netlify/blobs';
import type { Database, Rates } from '../types';

export const STORE_NAME = 'sub-manager';
export const DB_KEY = 'db';
export const RATES_KEY = 'rates';

export interface StorageAdapter {
  readDb(): Promise<Database | null>;
  writeDb(db: Database): Promise<void>;
  readRatesCache(): Promise<Rates | null>;
  writeRatesCache(rates: Rates): Promise<void>;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');
const RATES_PATH = path.join(DATA_DIR, 'rates.json');

export class FileStorageAdapter implements StorageAdapter {
  async readDb(): Promise<Database | null> {
    try {
      const raw = await readFile(DB_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<Database>;
      return {
        people: parsed.people ?? [],
        subscriptions: parsed.subscriptions ?? [],
      };
    } catch (err: unknown) {
      if (isNotFound(err)) return null;
      throw err;
    }
  }

  async writeDb(db: Database): Promise<void> {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  }

  async readRatesCache(): Promise<Rates | null> {
    try {
      const raw = await readFile(RATES_PATH, 'utf-8');
      return JSON.parse(raw) as Rates;
    } catch {
      return null;
    }
  }

  async writeRatesCache(rates: Rates): Promise<void> {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(RATES_PATH, JSON.stringify(rates, null, 2), 'utf-8');
  }
}

export class BlobStorageAdapter implements StorageAdapter {
  private store = getStore(STORE_NAME);

  async readDb(): Promise<Database | null> {
    const data = await this.store.get(DB_KEY, { type: 'json' });
    if (!data) return null;
    const parsed = data as Partial<Database>;
    return {
      people: parsed.people ?? [],
      subscriptions: parsed.subscriptions ?? [],
    };
  }

  async writeDb(db: Database): Promise<void> {
    await this.store.setJSON(DB_KEY, db);
  }

  async readRatesCache(): Promise<Rates | null> {
    return (await this.store.get(RATES_KEY, { type: 'json' })) as Rates | null;
  }

  async writeRatesCache(rates: Rates): Promise<void> {
    await this.store.setJSON(RATES_KEY, rates);
  }
}

function isNotFound(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === 'ENOENT'
  );
}

/** Netlify sets NETLIFY=true only in `netlify dev`; production functions get SITE_ID / AWS Lambda vars instead. */
function isNetlifyRuntime(): boolean {
  return (
    process.env.NETLIFY === 'true' ||
    Boolean(process.env.SITE_ID) ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME)
  );
}

let storageInstance: StorageAdapter | null = null;

export function getStorage(): StorageAdapter {
  if (!storageInstance) {
    storageInstance = isNetlifyRuntime()
      ? new BlobStorageAdapter()
      : new FileStorageAdapter();
  }
  return storageInstance;
}
