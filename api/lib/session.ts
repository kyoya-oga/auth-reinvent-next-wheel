import type { NextApiRequest } from 'next';
import { getEnv } from './env';
import { parseCookieHeader } from './cookies';
import { verifyJwt } from './jwt';
import type { Session, User } from './types';

type ReqLike = Pick<NextApiRequest, 'headers'>;

export function getSession(req: ReqLike): Session | null {
  const env = getEnv();
  const cookies = parseCookieHeader(req.headers?.cookie);
  const at = cookies[env.SESSION_COOKIE_NAME];
  if (!at) return null;
  try {
    const payload = verifyJwt<{ sub?: string; user?: User; iat?: number; exp?: number }>(at);
    const user: User = payload.user ?? { id: payload.sub ?? 'unknown' };
    const issuedAt = (payload.iat ?? Math.floor(Date.now() / 1000)) as number;
    const expiresAt = (payload.exp ?? issuedAt) as number;
    return { user, issuedAt, expiresAt, accessToken: at };
  } catch {
    return null;
  }
}

