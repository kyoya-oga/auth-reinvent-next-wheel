import { describe, it, expect } from 'vitest';

// 事前に環境変数を設定
process.env.JWT_SIGNING_KEY = '0123456789abcdef0123456789abcdef';
process.env.SESSION_COOKIE_NAME = 'at';
process.env.REFRESH_COOKIE_NAME = 'rt';
process.env.CSRF_COOKIE_NAME = 'csrf';
process.env.COOKIE_DOMAIN = 'localhost';

import { setAuthCookies, clearAuthCookies } from '../lib/cookies';

function createMockRes() {
  const headers: Record<string, unknown> = {};
  return {
    setHeader(name: string, value: unknown) {
      headers[name] = value;
    },
    getHeader(name: string) {
      return headers[name];
    }
  } as any;
}

describe('Cookieユーティリティ', () => {
  it('AT/RT/CSRF を適切な属性で設定する', () => {
    const res = createMockRes();
    setAuthCookies(res, {
      accessToken: 'at_value',
      refreshToken: 'rt_value',
      csrfToken: 'csrf_value'
    });
    const setCookie = res.getHeader('Set-Cookie') as string[];
    expect(Array.isArray(setCookie)).toBe(true);
    const [at, rt, csrf] = setCookie;
    expect(at).toMatch(/^at=/);
    expect(at).toContain('Path=/');
    expect(at).toContain('HttpOnly');
    expect(at).toContain('Secure');
    expect(at).toContain('SameSite=Lax');
    expect(at).toContain('Domain=localhost');

    expect(rt).toMatch(/^rt=/);
    expect(rt).toContain('Path=/api');
    expect(rt).toContain('HttpOnly');
    expect(rt).toContain('Secure');
    expect(rt).toContain('SameSite=Strict');

    expect(csrf).toMatch(/^csrf=/);
    expect(csrf).toContain('Path=/');
    expect(csrf).toContain('Secure');
    expect(csrf).toContain('SameSite=Lax');
    expect(csrf).not.toContain('HttpOnly');
  });

  it('clearAuthCookies がクッキーを失効させる', () => {
    const res = createMockRes();
    clearAuthCookies(res);
    const setCookie = res.getHeader('Set-Cookie') as string[];
    expect(setCookie.length).toBe(3);
    for (const c of setCookie) {
      expect(c).toMatch(/Max-Age=0/);
    }
  });
});
