import type { Database } from '../types';
import { getStorage } from './storage';

const EMPTY_DB: Database = { people: [], subscriptions: [] };

/**
 * Serialized writes prevent race conditions during concurrent
 * read-modify-write mutations on a single JSON file.
 */
let writeQueue: Promise<void> = Promise.resolve();

export async function readDb(): Promise<Database> {
  const data = await getStorage().readDb();
  if (data) return data;
  await writeDb(EMPTY_DB);
  return { ...EMPTY_DB };
}

export async function writeDb(db: Database): Promise<void> {
  await getStorage().writeDb(db);
}

/**
 * Safe mutation: reads, transforms, and writes the database atomically
 * relative to other calls via a shared write queue.
 */
export async function mutateDb<T>(fn: (db: Database) => T | Promise<T>): Promise<T> {
  const run = writeQueue.then(async () => {
    const db = await readDb();
    const result = await fn(db);
    await writeDb(db);
    return result;
  });
  // The queue continues regardless of whether this mutation succeeds or fails.
  writeQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
