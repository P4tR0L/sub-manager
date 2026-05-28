import type { APIRoute } from 'astro';
import {
  deleteSubscription,
  updateSubscription,
  type SubscriptionInput,
} from '../../../server/repo';
import { handleError, json, parseBody } from '../../../server/http';

export const prerender = false;

export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const body = await parseBody<SubscriptionInput>(request);
    return json(await updateSubscription(params.id!, body));
  } catch (err) {
    return handleError(err);
  }
};

export const DELETE: APIRoute = async ({ params }) => {
  try {
    await deleteSubscription(params.id!);
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
};
