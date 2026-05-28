import type { APIRoute } from 'astro';
import { getRates } from '../../server/rates';
import { json } from '../../server/http';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    return json(await getRates());
  } catch {
    return json(
      { error: 'Nie udało się pobrać kursów walut (brak internetu i brak cache).' },
      503,
    );
  }
};
