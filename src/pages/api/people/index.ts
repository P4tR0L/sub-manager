import type { APIRoute } from 'astro';
import { createPerson, listPeople, type PersonInput } from '../../../server/repo';
import { handleError, json, parseBody } from '../../../server/http';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    return json(await listPeople());
  } catch (err) {
    return handleError(err);
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await parseBody<PersonInput>(request);
    return json(await createPerson(body), 201);
  } catch (err) {
    return handleError(err);
  }
};
