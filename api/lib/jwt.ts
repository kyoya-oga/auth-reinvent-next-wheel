import crypto from 'node:crypto';
import { getEnv } from './env';

function b64url(input: Buffer | string): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function decodeB64url(input: string): Buffer {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 2 ? '==' : b64.length % 4 === 3 ? '=' : '';
  return Buffer.from(b64 + pad, 'base64');
}

export function signJwt(payload: Record<string, unknown>, expiresInSec: number): string {
  const env = getEnv();
  const header = { alg: 'HS256', typ: 'JWT' };
  const nowSec = Math.floor(Date.now() / 1000);
  const body = { iat: nowSec, exp: nowSec + expiresInSec, ...payload } as Record<string, unknown>;
  const headerB64 = b64url(JSON.stringify(header));
  const payloadB64 = b64url(JSON.stringify(body));
  const data = `${headerB64}.${payloadB64}`;
  const sig = crypto.createHmac('sha256', env.JWT_SIGNING_KEY).update(data).digest();
  const sigB64 = b64url(sig);
  return `${data}.${sigB64}`;
}

export function verifyJwt<T extends Record<string, unknown>>(token: string): T {
  const env = getEnv();
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT format');
  const h = parts[0]!;
  const p = parts[1]!;
  const s = parts[2]!;
  const data = `${h}.${p}`;
  const expected = b64url(crypto.createHmac('sha256', env.JWT_SIGNING_KEY).update(data).digest());
  const sigBuf = decodeB64url(s);
  const expBuf = decodeB64url(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    throw new Error('Invalid signature');
  }
  const payloadJson = decodeB64url(p).toString('utf8');
  const payload = JSON.parse(payloadJson) as T & { exp?: number };
  if (payload.exp && isExpired(payload.exp)) {
    throw new Error('Token expired');
  }
  return payload as T;
}

export function isExpired(exp: number): boolean {
  const nowSec = Math.floor(Date.now() / 1000);
  return nowSec >= exp;
}
