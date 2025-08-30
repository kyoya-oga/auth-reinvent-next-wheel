import { describe, it, expect } from 'vitest';

// 事前に環境変数を設定
process.env.JWT_SIGNING_KEY = '0123456789abcdef0123456789abcdef';
process.env.SESSION_COOKIE_NAME = 'at';
process.env.REFRESH_COOKIE_NAME = 'rt';
process.env.CSRF_COOKIE_NAME = 'csrf';

import { signJwt } from '../lib/jwt';
import { getSession } from '../lib/session';

function reqWithCookie(cookie: string) {
  return { headers: { cookie } } as any;
}

describe('セッション', () => {
  it('有効なATがCookieにあるとセッションを返す', () => {
    const token = signJwt({ sub: 'user-1', user: { id: 'user-1', email: 'a@b.c' } }, 60);
    const req = reqWithCookie(`at=${token}`);
    const session = getSession(req)!;
    expect(session).toBeTruthy();
    expect(session.user.id).toBe('user-1');
    expect(session.accessToken).toBe(token);
    expect(session.expiresAt).toBeGreaterThan(session.issuedAt);
  });

  it('期限切れトークンでは null を返す', () => {
    const token = signJwt({ sub: 'user-2' }, -10);
    const req = reqWithCookie(`at=${token}`);
    const session = getSession(req);
    expect(session).toBeNull();
  });

  it('Cookieが無い場合は null を返す', () => {
    const req = reqWithCookie('');
    const session = getSession(req);
    expect(session).toBeNull();
  });
});
