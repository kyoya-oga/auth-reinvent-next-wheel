
# カスタム認証実装計画  
*Next.js (Pages Router) – Cookie ベース認証 + BFF プロキシ*

---

## 1. 目的と対象外
### 必須要件
- **プロダクションレディ**: OWASP ASVS L2 相当を満たし、可用性 99.9% を目標とする  
- **Cookie ベース / セッション方式**（`localStorage` にトークンを保存しない）  
- **BFF (Backend‑for‑Frontend)** は純粋なプロキシとして動作
  - API Routes を **Edge Function** として実装し、そこで認証を終端
  - Upstream API へ必要なヘッダを付与
- **Pages Router**（`getServerSideProps` と API ルート）で動作。Edge Middleware は Cookie の読み書きが制限されるため使用しない

### やらないこと
- JWT やセッション ID をブラウザに露出  
- BFF 層にビジネスロジックを混在させること

---

## 2. ハイレベルアーキテクチャ

```
ブラウザ ──► Next.js BFF (Pages Router)
             ├─ /api/auth/*        (login, refresh, logout, csrf)
             └─ /api/proxy/*       (認証付きパススルー)
                                    │
                                    ▼
                              Upstream REST API
```

- **公開ページ**: セッションなしでレンダリング  
- **保護ページ**: `getServerSideProps` 内でセッションを確認する HOC `withAuthPage()` でラップ  

- **Auth ガードユーティリティ**: API ルートで Cookie 検証・トークン更新を行い、クライアント側では TanStack Query の `onError`/`queryFn` で 401 を捕捉してリフレッシュを実施

---

## 3. トークン & Cookie 戦略

| Cookie                        | Path   | 属性                                | TTL        | ペイロード          |
| ----------------------------- | ------ | ----------------------------------- | ---------- | ------------------- |
| `at` (アクセス・トークン)     | `/`    | `HttpOnly; Secure; SameSite=Lax`    | 15 分      | JWT または不透明 ID |
| `rt` (リフレッシュ・トークン) | `/api` | `HttpOnly; Secure; SameSite=Strict` | 7 日       | JWT または不透明 ID |
| `csrf` (CSRF 対策)            | `/`    | `Secure; SameSite=Lax`              | セッション | ランダムノンス      |

**ポイント**

1. **ダブルサブミット CSRF**: クライアントは `document.cookie` から `csrf` を読み取り、`X-CSRF-Token` ヘッダにエコーバック  
2. **SameSite ポリシー**  
   - `at`: `Lax` – 通常ナビゲーションでは送信。サードパーティコンテキストでは送信されない  
   - `rt`: `Strict` – リフレッシュエンドポイントへの CSRF を防止  
3. **ローテーション**: `at` はリフレッシュ毎に、`rt` は 1 日ごとに再発行

---

## 4. 詳細フロー

### 4.1 ログイン  
1. `POST /api/auth/login`（資格情報）→ BFF  
2. BFF が API の `POST /auth/login` に転送  
3. **200 OK** で `{ accessToken, refreshToken }` を受領  
4. BFF が `Set-Cookie` ヘッダ (`at`, `rt`, `csrf`) を設定し、ユーザープロファイル JSON を返却  

### 4.2 認証付きリクエスト  
- **SSR**: ヘルパー `getSession(ctx)` が `at` を検証し、期限切れなら内部 `refresh()` を呼び出す  
- **CSR**: フロントエンドは TanStack Query + `fetch('/api/proxy/...')` を使用。HTTP クライアント層が 401 を検知し、サイレントリフレッシュを試行

### 4.3 リフレッシュ  
`POST /api/auth/refresh`（ボディなし）。BFF は `rt` を読み取り API `/auth/refresh` へ転送。新しい `at` とローテートされた `rt` を `Set-Cookie`

### 4.4 ログアウト  
`POST /api/auth/logout` ⇒ BFF → API `/auth/logout`。BFF は Cookie を `Max-Age=0` で削除

### 4.5 CSRF 保護  
`POST | PUT | PATCH | DELETE` の各ルートは `csrf` Cookie と `X-CSRF-Token` ヘッダが一致することを要求

---

## 5. 実装フェーズ

| フェーズ | 範囲                                                      | 成功基準                           |
| -------- | --------------------------------------------------------- | ---------------------------------- |
| 0        | **スキャフォルディング**: ESLint, Prettier, Husky, Vitest | CI が通る                          |
| 1        | **Auth エンドポイント** (`/api/auth/*`)                   | 手動ログイン成功、Cookie 設定      |
| 2        | **プロキシ層** (`/api/proxy/*`)                           | 認証済み API が 200                |
| 3        | **ページガード** (`withAuthPage`, `useSession`)           | 未認証は `/login` へリダイレクト   |
| 4        | **リフレッシュ & サイレント更新**                         | 30 分 soak で 401 なし             |
| 5        | **ハードニング & 可観測性**                               | OWASP ZAP Aランク、Prometheus 指標 |

---

## 6. セキュリティハードニングチェックリスト
- `helmet` (CSP, HSTS, XSS-Protection)  
- `/api/auth/login` を Redis ストアでレート制限  
- ブルートフォース検出 (fail‑2‑ban 相当)  
- `JWT_SIGNING_KEY` を 90 日ごとにローテーションし 2 キー重複期間を設ける  
- API 側のパスワードハッシュは **argon2id**  
- CSP で `eval` やインラインスクリプトを禁止  

- SSG/ISR ページにユーザー固有データを埋め込む場合は GSSP に切り替える指針を明記

---

## 7. 自動テスト

### Unit (Vitest)
- トークンサービス (発行/検証/ローテーション)  
- Cookie ヘルパー (`setAuthCookies`, `clearAuthCookies`)  

### Integration (Supertest)
- モック API に対する認証サイクル end‑to‑end  

### E2E (Playwright)
- 正常系ログイン / ログアウト  
- トークン期限切れ + サイレント更新  
- CSRF 不一致で 403  

---

## 8. 今後の拡張
- **WebAuthn** MFA  
- **パスワードレス** (マジックリンク)  
- **SSE** によるセッション失効プッシュ  

---

> **Status:** Draft v1.0 – 最終更新 2025‑07‑09
