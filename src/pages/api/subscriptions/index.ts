import type { APIRoute } from 'astro';
import {
  createSubscription,
  listSubscriptions,
  type SubscriptionInput,
} from '../../../server/repo';
import { handleError, json, parseBody } from '../../../server/http';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    return json(await listSubscriptions());
  } catch (err) {
    return handleError(err);
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await parseBody<SubscriptionInput>(request);
    return json(await createSubscription(body), 201);
  } catch (err) {
    return handleError(err);
  }
};
