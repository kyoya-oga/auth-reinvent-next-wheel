# リポジトリガイドライン

本リポジトリは Next.js（Pages Router）を中心に、Cookie/セッション方式の認証 BFF とクライアント群を管理します。貢献を一貫・安全・レビュー容易に保つため、本ガイドに従ってください。詳細な設計は CUSTOM_AUTH_PLAN.md を参照。

## エージェント応答ポリシー（重要）
- 回答言語: 日本語で回答すること。
- 口調: 簡潔・直接的・フレンドリー。過度な冗長説明は避ける。
- 進捗管理: `.kiro/specs/nextjs-bff-auth/tasks.md` を単一のソースとする。
- コマンド/パス/コード識別子はバッククォートで囲む（例: `pnpm -r build`, `pages/api/auth/login.ts`）。
- 変更が複数に渡る場合は要点のみ箇条書きで共有し、詳細は差分に委ねる。

## プロジェクト構成とモジュール
- `api/`: BFF の API 面（プロキシ/認証）。想定構成: `pages/api/auth/*`, `pages/api/proxy/*` と共有 `lib/`。
- `clients/`: フロントエンド（例: `clients/web`/Next.js）。典型: `pages/`, `components/`, `lib/auth/`, `hooks/`, `__tests__/`。
- `CUSTOM_AUTH_PLAN.md`: 認証フロー、Cookie 方針、マイルストーンのソースオブトゥルース。

## ビルド・テスト・開発コマンド
本リポジトリは pnpm ワークスペース構成です。ルートでは `pnpm -r` で各パッケージのスクリプトを一括実行します。各アプリ直下にも標準スクリプトを用意します（`npm`/`pnpm` いずれも可）。
- 開発サーバ: `pnpm -r dev`（各パッケージの `next dev` 等）
- 本番ビルド: `pnpm -r build`
- 型チェック: `pnpm -r typecheck`（tsc）
- Lint/整形: `pnpm -r lint` / `pnpm -r format`
- 単体テスト: `pnpm -r test -- --run`（Vitest）
- E2E: `pnpm -r test:e2e`（Playwright）
スクリプト例（各アプリ直下の `package.json`）:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "test": "vitest",
    "test:e2e": "playwright test",
    "typecheck": "tsc -p tsconfig.json"
}
}
```

## コーディングスタイルと命名規則
- 言語: TypeScript、インデント 2 スペース、セミコロン有り、シングルクォート。
- ファイル名: kebab-case。React コンポーネントは PascalCase、フックは `useX.ts`。
- API ルート: `pages/api/...` 配下は kebab-case（Pages Router）。
- ツール: ESLint（flat config）、Prettier。pre-commit フック（Husky）は使用しません。CI で lint/test/typecheck を実行します。

## テスト指針
- フレームワーク: Vitest（単体）、Supertest（統合）、Playwright（E2E）。
- 置き場所: 実装横の `*.test.ts` か `__tests__/`。
- 目標: 総合 ≥80%。認証 Cookie ヘルパー/ガードは ~100% を狙う。
- 実行: 単体 `pnpm vitest`、E2E `pnpm playwright test`。
 - テスト名は日本語: `describe`/`it` のタイトルは原則日本語で記述する（例: `describe('セッション', ...)`, `it('期限切れトークンでは null を返す', ...)`）。

## コミットとプルリクエスト
- コミット: Conventional Commits（例: `feat: add refresh rotation`, `fix: csrf mismatch handling`）。小さくスコープ明確に。
- PR 必須事項: 目的/影響、関連 Issue、UI はスクリーンショット、セキュリティ影響（Cookie/ヘッダ/トークン）、テスト証跡。
- CI（lint/test/typecheck）を通過してからレビュー。


## セキュリティと設定のヒント
- 設計の Cookie 方針に従う: `at` は `/`（Lax）、`rt` は `/api`（Strict）、`csrf` は `/`。
- トークンを `localStorage` に保存しない。`HttpOnly; Secure; SameSite` Cookie を使用。
- 状態変更リクエストでは `X-CSRF-Token` ヘッダをエコー送信。
- 機密は `.env.local` に保持し、`JWT_SIGNING_KEY` は定期ローテーション。秘密情報はコミットしない。
