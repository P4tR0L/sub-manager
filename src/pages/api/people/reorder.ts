import type { APIRoute } from 'astro';
import { reorderPeople } from '../../../server/repo';
import { handleError, json, parseBody } from '../../../server/http';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await parseBody<{ ids: string[] }>(request);
    return json(await reorderPeople(body.ids));
  } catch (err) {
    return handleError(err);
  }
};
