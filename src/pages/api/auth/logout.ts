import type { APIRoute } from 'astro';
import { clearSessionCookieHeader } from '../../../server/auth';
import { json } from '../../../server/http';

export const prerender = false;

export const POST: APIRoute = async ({ url }) => {
  const secure = url.protocol === 'https:';

  return new Response(null, {
    status: 302,
    headers: {
      Location: '/login',
      'Set-Cookie': clearSessionCookieHeader(secure),
    },
  });
};

export const GET: APIRoute = () => json({ error: 'Method not allowed' }, 405);
