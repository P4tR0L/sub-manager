import type { APIRoute } from 'astro';
import { deletePerson, updatePerson, type PersonInput } from '../../../server/repo';
import { handleError, json, parseBody } from '../../../server/http';

export const prerender = false;

export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const body = await parseBody<PersonInput>(request);
    return json(await updatePerson(params.id!, body));
  } catch (err) {
    return handleError(err);
  }
};

export const DELETE: APIRoute = async ({ params }) => {
  try {
    await deletePerson(params.id!);
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
};
