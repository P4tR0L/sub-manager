import { createHmac, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'session';
export const SESSION_MAX_AGE_SEC = 30 * 24 * 60 * 60;

function getSessionSecret(): string | undefined {
  return import.meta.env.APP_SESSION_SECRET;
}

export function getAppPassword(): string {
  const password = import.meta.env.APP_PASSWORD;
  if (!password) {
    throw new Error('APP_PASSWORD is not configured.');
  }
  return password;
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function createSessionToken(): string {
  const secret = getSessionSecret();
  if (!secret) {
    throw new Error('APP_SESSION_SECRET is not configured.');
  }
  const exp = Date.now() + SESSION_MAX_AGE_SEC * 1000;
  const payload = Buffer.from(JSON.stringify({ exp })).toString('base64url');
  return `${payload}.${sign(payload, secret)}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  const secret = getSessionSecret();
  if (!secret || !token) return false;

  const dot = token.lastIndexOf('.');
  if (dot <= 0) return false;

  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(payload, secret);

  try {
    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(expected);
    if (sigBuf.length !== expectedBuf.length) return false;
    if (!timingSafeEqual(sigBuf, expectedBuf)) return false;
  } catch {
    return false;
  }

  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { exp?: number };
    return typeof exp === 'number' && exp > Date.now();
  } catch {
    return false;
  }
}

export function sessionCookieHeader(token: string, secure: boolean): string {
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${SESSION_MAX_AGE_SEC}`,
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function clearSessionCookieHeader(secure: boolean): string {
  const parts = [`${SESSION_COOKIE}=`, 'HttpOnly', 'Path=/', 'SameSite=Lax', 'Max-Age=0'];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function isAuthConfigured(): boolean {
  return Boolean(import.meta.env.APP_PASSWORD && import.meta.env.APP_SESSION_SECRET);
}
