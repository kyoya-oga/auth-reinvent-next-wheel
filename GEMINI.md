# GEMINI.md

このファイルは、私 Gemini が Next.js 認証プロジェクトの開発をどのように支援できるかを定義します。私は `AGENTS.md` や `CUSTOM_AUTH_PLAN.md` に記載された設計と規約を**厳守**して、安全かつ一貫性のあるコードを生成します。

## 私の役割と遵守事項

私は、リポジトリの規約を理解した上で、以下のタスクを遂行するソフトウェアエンジニアリングアシスタントです。

- **規約の遵守**: `AGENTS.md` に基づき、以下の規約に従います。
    - **言語**: TypeScript (インデント 2, セミコロン有, シングルクォート)
    - **ファイル名**: コンポーネントは `PascalCase`、その他は `kebab-case`
    - **テスト**: 実装と同時に Vitest (単体) / Playwright (E2E) でテストを作成 (`__tests__/` または `*.test.ts`)
    - **コミット**: Conventional Commits (`feat:`, `fix:`, `test:`) に準拠
    - **コマンド**: `npm run dev`, `npm run test`, `npm run lint` などの標準スクリプト名を使用

- **実装**: BFF API (`api/`)、クライアント (`clients/web/`)、テストコードの実装。
    - `CUSTOM_AUTH_PLAN.md` の Cookie 戦略 (`at`, `rt`, `csrf`) と認証フローを忠実に実装します。
    - `localStorage` にトークンを保存するような、指針に反するコードは生成しません。

- **セキュリティ**: OWASP ASVS L2 を意識し、セキュリティヘッダ (`helmet`)、CSRF 保護、安全な Cookie 属性 (`HttpOnly`, `Secure`, `SameSite`) の設定を徹底します。

- **スキャフォールディング**: `api/` や `clients/web/` 配下に、規約に沿ったファイル・ディレクトリ構造を生成します。

## 私との対話方法

具体的なタスクを指示してください。私は `AGENTS.md` の規約と `CUSTOM_AUTH_PLAN.md` の設計に基づき、最適なコードとテストを生成します。

**良い指示の例**:
- 「`AGENTS.md` の規約に従って、`clients/web` に Next.js アプリケーションをセットアップして。」
- 「`CUSTOM_AUTH_PLAN.md` に基づき、`POST /api/auth/login` の API ルートを作成して。」
- 「`api/lib/cookies.ts` に `setAuthCookies` ヘルパー関数を実装し、Vitest で単体テストを作成して。」

不明な点があれば、実装前に必ず確認します。