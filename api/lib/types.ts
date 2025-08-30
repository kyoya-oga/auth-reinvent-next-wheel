import type { NextApiRequest, NextApiResponse } from 'next';

// ===== Domain Models =====
export interface User {
  id: string;
  email?: string;
  name?: string;
  roles?: string[];
}

export interface Session {
  user: User;
  issuedAt: number; // epoch seconds
  expiresAt: number; // epoch seconds
  accessToken?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
}

export interface LoginCredentials {
  username?: string;
  email?: string;
  password: string;
}

export interface CookieConfig {
  sessionCookieName: string; // typically 'at'
  refreshCookieName: string; // typically 'rt'
  csrfCookieName: string; // typically 'csrf'
  domain?: string;
}

export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_INVALID'
  | 'CSRF_MISMATCH';

export class AuthError extends Error {
  code: AuthErrorCode;
  status: number;
  constructor(code: AuthErrorCode, message?: string, status = 401) {
    super(message ?? code);
    this.name = 'AuthError';
    this.code = code;
    this.status = status;
  }
}

export type SecurityEvent =
  | 'login_success'
  | 'login_failed'
  | 'token_refreshed'
  | 'logout'
  | 'csrf_violation'
  | 'rate_limited';

export interface SecurityLog {
  event: SecurityEvent;
  userId?: string;
  ip?: string;
  meta?: Record<string, unknown>;
  timestamp: string; // ISO string
}

// ===== Service Interfaces =====
export interface ICookieService {
  setAuthCookies(res: NextApiResponse, tokens: AuthTokens): void;
  clearAuthCookies(res: NextApiResponse): void;
}

export interface ITokenService {
  sign(payload: Record<string, unknown>, expiresInSec: number): string;
  verify<T extends Record<string, unknown>>(token: string): T;
  isExpired(exp: number): boolean;
}

export interface ISessionService {
  getSession(
    req: Pick<NextApiRequest, 'headers'>
  ): Session | null;
}

