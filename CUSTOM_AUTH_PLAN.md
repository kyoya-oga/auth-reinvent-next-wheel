

# Custom Authentication Implementation Plan  
*For Next.js (Pages Router) ‑ Cookie‑Based Auth with BFF Proxy*

---

## 1. Goals & Non‑Goals
### Must
- **Production‑ready**: OWASP ASVS L2 coverage, 99.9 % uptime target.
- **Cookie‑based, session‑oriented** (no tokens in `localStorage`).
- **BFF (Backend‑for‑Frontend) acts purely as a proxy** that:
  - Terminates authentication at the edge.
  - Attaches required headers to the upstream API.
- **Works in the Pages Router** (`getServerSideProps`, API routes, middlewares).

### Must NOT
- Expose raw JWTs or session IDs to the browser.
- Mix business logic in the BFF layer.

---

## 2. High‑Level Architecture

```
Browser ──► Next.js BFF (Pages Router)
             ├─ /api/auth/*        (login, refresh, logout, csrf)
             └─ /api/proxy/*       (authenticated pass‑through)
                                    │
                                    ▼
                              Upstream REST API
```

- **Public Pages**: rendered without session.  
- **Protected Pages**: wrapped with HOC `withAuthPage()` that checks the session in `getServerSideProps`.  
- **Middleware (`_middleware.ts`)**: protects `/api/proxy/**`, auto‑refreshes tokens.

---

## 3. Token & Cookie Strategy

| Cookie               | Path   | Flags                               | TTL     | Payload          |
| -------------------- | ------ | ----------------------------------- | ------- | ---------------- |
| `at` (Access Token)  | `/`    | `HttpOnly; Secure; SameSite=Lax`    | 15 min  | JWT or opaque ID |
| `rt` (Refresh Token) | `/api` | `HttpOnly; Secure; SameSite=Strict` | 7 days  | JWT or opaque ID |
| `csrf` (Anti‑CSRF)   | `/`    | `Secure; SameSite=Lax`              | Session | Random nonce     |

**Key points**

1. **Double‑Submit CSRF**: Client reads `csrf` via `document.cookie` and echoes it in `X‑CSRF‑Token`.
2. **Sticky SameSite**:
   - `Lax` on `at` allows normal navigation while blocking 3rd‑party contexts.
   - `Strict` on `rt` prevents CSRF on refresh endpoint.
3. **Rotation**: `at` rotates on each refresh; `rt` rotates once a day.

---

## 4. Detailed Flow

### 4.1 Login  
1. `POST /api/auth/login` (credentials) → BFF  
2. BFF forwards to `POST /auth/login` on API.  
3. On **200**, API returns `{ accessToken, refreshToken }`.  
4. BFF sets `Set‑Cookie` headers (`at`, `rt`, `csrf`) and returns user profile JSON.

### 4.2 Authenticated Requests  
- **Server‑Side (SSR)**: helper `getSession(ctx)` decodes `at`; if expired, calls internal `refresh()` before proceeding.  
- **Client‑Side (CSR)**: Frontend uses `fetch('/api/proxy/...')`. Middleware intercepts 401, attempts silent refresh.

### 4.3 Refresh  
`POST /api/auth/refresh` (no body). BFF reads `rt`, forwards to `/auth/refresh`, sets new `at`, rotated `rt`.

### 4.4 Logout  
`POST /api/auth/logout` ⇒ BFF → API `/auth/logout`. BFF clears cookies with `Max‑Age=0`.

### 4.5 CSRF Protection  
- All state‑changing routes (`POST|PUT|PATCH|DELETE`) require matching `csrf` cookie & `X‑CSRF‑Token` header.

---

## 5. Implementation Phases

| Phase | Scope                                                   | Success Criteria                                           |
| ----- | ------------------------------------------------------- | ---------------------------------------------------------- |
| 0     | **Scaffolding**: Add ESLint, Prettier, Husky, Vitest.   | CI green.                                                  |
| 1     | **Auth Endpoints** (`/api/auth/*`).                     | Manual login works; cookies set.                           |
| 2     | **Proxy Layer** (`/api/proxy/*`) with middleware guard. | Protected API returns 200 with valid session.              |
| 3     | **Page Guards** (`withAuthPage`, `useSession`).         | Protected pages redirect to `/login` when unauthenticated. |
| 4     | **Refresh Logic & Silent Renew**.                       | No 401s during 30‑min soak test.                           |
| 5     | **Hardening & Observability**.                          | OWASP ZAP score ≥ A; Prometheus metrics exposed.           |

---

## 6. Security Hardening Checklist
- `helmet` (CSP, HSTS, XSS‑Protection).
- Rate‑limit `/api/auth/login` (Redis store).
- Brute‑force detection (fail‑2‑ban style).
- Rotate `JWT_SIGNING_KEY` every 90 days; keep 2‑key overlap.
- Use **argon2id** for password hashing on the API side.
- Content‑Security‑Policy blocks `eval` & inline scripts.

---

## 7. Automated Testing

### Unit (Vitest)
- Token service (issue/verify/rotate).
- Cookie helper (`setAuthCookies`, `clearAuthCookies`).

### Integration (Supertest)
- End‑to‑end auth cycle against mocked API.

### E2E (Playwright)
- Happy path login/logout.
- Token expiry + silent refresh.
- CSRF failure returns 403.

---

## 8. Deployment & Ops

| Item            | Production Setting                                    |
| --------------- | ----------------------------------------------------- |
| Next.js Runtime | Node 18 LTS in Docker Alpine                          |
| Secrets         | HashiCorp Vault (K8s sidecar)                         |
| HTTPS           | Terminated at Cloudflare; origin certs pinned         |
| Logging         | Pino + Elastic APM with requestId correlation         |
| Metrics         | Prometheus `/metrics` via custom `/api/metrics` route |
| Alerting        | PagerDuty on 5xx > 1 % in 5 min                       |

Rollback: blue/green releases with feature flag to disable auth middleware if emergency.

---

## 9. Post‑Launch Monitoring
- **login_success_total / login_failure_total** counters
- Token refresh latency histogram
- 401/403 ratio per endpoint
- Suspicious IP list (geo anomaly detection)

---

## 10. Future Enhancements
- **WebAuthn** MFA.
- **Passwordless magic‑link** flow.
- **SSE** for session revocation push.

---

> **Status:** Draft v1.0 — Last updated: 2025‑07‑09
