# カスタム認証 実装ステップ

このドキュメントでは `CUSTOM_AUTH_PLAN.md` の内容に沿って認証基盤を実装していく際の具体的なタスクを列挙します。実装担当は Codex と想定します。

## 1. プロジェクトのスキャフォルド
1. Next.js (Pages Router) + TypeScript で新規プロジェクトを生成する
2. ESLint, Prettier, Husky, Vitest をセットアップし、CI が回ることを確認
3. `api/` と `clients/` ディレクトリに基本的な構成を作成

## 2. 認証 API ルート
1. `/api/auth/login` を Edge Function として実装
   - 入力検証後、Upstream API `/auth/login` に資格情報を転送
   - レスポンスの `accessToken` `refreshToken` を Cookie (`at`, `rt`, `csrf`) として設定
2. `/api/auth/refresh` でリフレッシュ処理を実装
   - `rt` Cookie を検証し、Upstream API `/auth/refresh` へ転送
   - 新しい `at` とローテーション済み `rt` を返し Cookie を再設定
3. `/api/auth/logout` でログアウト処理
   - Upstream API `/auth/logout` を呼び出し Cookie を削除

## 3. プロキシ層
1. `/api/proxy/*` ルートを作成し、認証付きリクエストのパススルーを実装
2. ここで `at` を検証し、期限切れの場合は内部的に `/api/auth/refresh` を呼び出す
3. Upstream API へ必要な認証ヘッダを付与して転送

## 4. フロントエンド側ユーティリティ
1. `withAuthPage()` HOC を実装し、`getServerSideProps` でセッションチェック
2. `useSession()` フックを作成し、TanStack Query のエラーハンドリングで 401 を検知したらサイレントリフレッシュを実行
3. CSRF トークンは `document.cookie` から読み取り、`fetch` 時に `X-CSRF-Token` ヘッダとして送信

## 5. セキュリティハードニング
1. `helmet` を導入し CSP, HSTS などヘッダを追加
2. `/api/auth/login` には Redis ベースのレートリミットを実装
3. JWT 署名鍵やセッションストアのシークレットは Secret Manager から取得
4. 監査ログと Prometheus 指標を出力するミドルウェアを BFF 層に追加

## 6. 自動テスト
1. Vitest でユニットテスト (トークンサービス, Cookie ヘルパー)
2. Supertest による API 統合テスト (モック API との認証サイクル)
3. Playwright を用いた E2E テスト (ログイン/ログアウト、トークン期限切れ更新、CSRF 403)

## 7. 運用と拡張
1. 上記ステップ完了後、OWASP ZAP でセキュリティスキャンを実施し問題がないことを確認
2. Prometheus + Grafana でメトリクスを可視化
3. 将来的な WebAuthn や SSE によるセッション失効などの拡張ポイントをコード内に TODO として残す

