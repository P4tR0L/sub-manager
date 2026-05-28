import { defineMiddleware } from 'astro:middleware';
import { isAuthConfigured, verifySessionToken } from './server/auth';

function isPublicPath(pathname: string): boolean {
  if (pathname === '/login') return true;
  if (pathname === '/api/auth/login') return true;
  if (pathname.startsWith('/_astro/')) return true;
  if (/\.(css|js|svg|png|jpg|jpeg|gif|webp|ico|woff2?)$/i.test(pathname)) return true;
  return false;
}

export const onRequest = defineMiddleware(async (context, next) => {
  if (!isAuthConfigured()) {
    return next();
  }

  const { pathname } = context.url;
  if (isPublicPath(pathname)) {
    return next();
  }

  const token = context.cookies.get('session')?.value;
  if (verifySessionToken(token)) {
    return next();
  }

  if (pathname.startsWith('/api/')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return context.redirect('/login');
});
