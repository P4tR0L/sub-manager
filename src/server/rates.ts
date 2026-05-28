import type { Rates } from '../types';
import { getStorage } from './storage';

// After a failed fetch, do not hit NBP again for this duration
// (so page refreshes without internet do not spam the API).
const RETRY_COOLDOWN_MS = 10 * 60 * 1000;

let memory: Rates | null = null;
let lastFailedAttempt = 0;

function isToday(iso: string): boolean {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

async function fetchNbpMid(code: 'USD' | 'EUR'): Promise<number> {
  const url = `https://api.nbp.pl/api/exchangerates/rates/A/${code}/?format=json`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`NBP ${code}: HTTP ${res.status}`);
  const data = (await res.json()) as { rates?: Array<{ mid?: number }> };
  const mid = data.rates?.[0]?.mid;
  if (typeof mid !== 'number' || !Number.isFinite(mid)) {
    throw new Error(`NBP ${code}: brak kursu w odpowiedzi`);
  }
  return mid;
}

async function persist(rates: Rates): Promise<void> {
  await getStorage().writeRatesCache(rates);
}

async function readCache(): Promise<Rates | null> {
  return getStorage().readRatesCache();
}

/**
 * Returns USD/EUR -> PLN rates. Fetches from NBP at most once per day -
 * if the cache (memory or file) is from today, it is used without querying NBP.
 * When offline, falls back to the last saved rates (marked as stale).
 * Throws only when there is neither a connection nor any cached rates.
 */
export async function getRates(): Promise<Rates> {
  // 1. Fresh rates from today already in process memory.
  if (memory && !memory.stale && isToday(memory.fetchedAt)) return memory;

  // 2. File cache from today - no NBP query.
  const cached = await readCache();
  if (cached && isToday(cached.fetchedAt)) {
    memory = { ...cached, stale: false };
    return memory;
  }

  // 3. Recent failed attempt - return last known rates as stale, do not spam NBP.
  const now = Date.now();
  const fallback = memory ?? cached;
  if (fallback && now - lastFailedAttempt < RETRY_COOLDOWN_MS) {
    return { ...fallback, stale: true };
  }

  // 4. Fetch fresh rates from NBP.
  try {
    const [usd, eur] = await Promise.all([fetchNbpMid('USD'), fetchNbpMid('EUR')]);
    const rates: Rates = {
      PLN: 1,
      USD: usd,
      EUR: eur,
      fetchedAt: new Date().toISOString(),
      stale: false,
    };
    memory = rates;
    await persist(rates);
    return rates;
  } catch (err) {
    lastFailedAttempt = now;
    if (fallback) {
      const stale: Rates = { ...fallback, stale: true };
      memory = stale;
      return stale;
    }
    throw err;
  }
}
