import type { APIRoute } from 'astro';
import {
  createSessionToken,
  getAppPassword,
  sessionCookieHeader,
} from '../../../server/auth';
import { handleError, json } from '../../../server/http';

export const prerender = false;

export const POST: APIRoute = async ({ request, url }) => {
  try {
    const form = await request.formData();
    const password = form.get('password');
    if (typeof password !== 'string' || password !== getAppPassword()) {
      return new Response(null, {
        status: 302,
        headers: { Location: '/login?error=1' },
      });
    }

    const token = createSessionToken();
    const secure = url.protocol === 'https:';

    return new Response(null, {
      status: 302,
      headers: {
        Location: '/',
        'Set-Cookie': sessionCookieHeader(token, secure),
      },
    });
  } catch (err) {
    return handleError(err);
  }
};

export const GET: APIRoute = () => json({ error: 'Method not allowed' }, 405);
