import { NotFoundError, ValidationError } from './repo';

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function handleError(err: unknown): Response {
  if (err instanceof ValidationError) {
    return json({ error: err.message }, 400);
  }
  if (err instanceof NotFoundError) {
    return json({ error: err.message }, 404);
  }
  const message = err instanceof Error ? err.message : 'Nieznany błąd serwera.';
  return json({ error: message }, 500);
}

export async function parseBody<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ValidationError('Nieprawidłowy format danych (oczekiwano JSON).');
  }
}
