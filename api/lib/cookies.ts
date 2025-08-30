import type { NextApiResponse } from 'next';
import { getEnv } from './env';
import type { AuthTokens, CookieConfig } from './types';

function baseCookie(name: string, value: string, options: {
  httpOnly?: boolean;
  secure?: boolean;
  path: string;
  sameSite: 'Lax' | 'Strict' | 'None';
  domain?: string;
  maxAge?: number; // seconds
}): string {
  const parts: string[] = [];
  const encoded = encodeURIComponent(value);
  parts.push(`${name}=${encoded}`);
  if (options.domain) parts.push(`Domain=${options.domain}`);
  parts.push(`Path=${options.path}`);
  if (options.maxAge !== undefined) parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`);
  parts.push(`SameSite=${options.sameSite}`);
  if (options.secure !== false) parts.push('Secure');
  if (options.httpOnly) parts.push('HttpOnly');
  return parts.join('; ');
}

export function getCookieConfig(): CookieConfig {
  const env = getEnv();
  return {
    sessionCookieName: env.SESSION_COOKIE_NAME,
    refreshCookieName: env.REFRESH_COOKIE_NAME,
    csrfCookieName: env.CSRF_COOKIE_NAME,
    domain: env.COOKIE_DOMAIN
  };
}

export function setAuthCookies(res: NextApiResponse, tokens: AuthTokens, opts?: { atMaxAgeSec?: number; rtMaxAgeSec?: number; }): void {
  const cfg = getCookieConfig();
  const cookies: string[] = [];
  // Access Token cookie: Path=/, SameSite=Lax, HttpOnly
  cookies.push(
    baseCookie(cfg.sessionCookieName, tokens.accessToken, {
      httpOnly: true,
      secure: true,
      path: '/',
      sameSite: 'Lax',
      domain: cfg.domain,
      maxAge: opts?.atMaxAgeSec
    })
  );

  // Refresh Token cookie: Path=/api, SameSite=Strict, HttpOnly
  cookies.push(
    baseCookie(cfg.refreshCookieName, tokens.refreshToken, {
      httpOnly: true,
      secure: true,
      path: '/api',
      sameSite: 'Strict',
      domain: cfg.domain,
      maxAge: opts?.rtMaxAgeSec
    })
  );

  // CSRF token cookie: Path=/, SameSite=Lax, NOT HttpOnly (must be readable by client)
  cookies.push(
    baseCookie(cfg.csrfCookieName, tokens.csrfToken, {
      httpOnly: false,
      secure: true,
      path: '/',
      sameSite: 'Lax',
      domain: cfg.domain
    })
  );

  res.setHeader('Set-Cookie', cookies);
}

export function clearAuthCookies(res: NextApiResponse): void {
  const cfg = getCookieConfig();
  const cookies: string[] = [];
  const expired = 0;

  cookies.push(
    baseCookie(cfg.sessionCookieName, '', {
      httpOnly: true,
      secure: true,
      path: '/',
      sameSite: 'Lax',
      domain: cfg.domain,
      maxAge: expired
    })
  );

  cookies.push(
    baseCookie(cfg.refreshCookieName, '', {
      httpOnly: true,
      secure: true,
      path: '/api',
      sameSite: 'Strict',
      domain: cfg.domain,
      maxAge: expired
    })
  );

  cookies.push(
    baseCookie(cfg.csrfCookieName, '', {
      httpOnly: false,
      secure: true,
      path: '/',
      sameSite: 'Lax',
      domain: cfg.domain,
      maxAge: expired
    })
  );

  res.setHeader('Set-Cookie', cookies);
}

export function parseCookieHeader(cookieHeader: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const [rawKey, ...rest] = part.trim().split('=');
    if (!rawKey) continue;
    const key = rawKey.trim();
    const value = rest.join('=');
    out[key] = decodeURIComponent(value ?? '');
  }
  return out;
}

