# 受付Bot

用途と業種を選び、用意された質問テンプレートを編集して公開できる、
**チャット形式の受付フォーム作成サービス**です。

生成AIはBot作成・公開・回答受付の実行経路に使用しません。
公開画面では保存済みの質問を1問ずつ表示し、回答をSupabaseへ保存します。

料金・AI利用・利用上限の正本は [docs/product-policy.md](docs/product-policy.md) です。
本番Stripeの切替状況は
[docs/stripe-production-cutover.md](docs/stripe-production-cutover.md) を参照してください。

## 現行プロダクト

| プラン | 月額 | Bot数 | 月間回答数 | iframe | ロゴ |
| --- | ---: | ---: | --- | --- | --- |
| 無料 | 0円 | 1 | 30件 | 不可 | 表示 |
| ライト | 980円 | 1 | 無制限 | 可 | 表示 |
| スタンダード | 1,980円 | 3 | 無制限 | 可 | 非表示 |
| プロ | 3,980円 | 10 | 無制限 | 可 | 非表示 |

- 初期費用なし
- 1か月単位の自動更新
- 有料プランは回答件数による従量課金・超過課金なし
- 無料プランのみ月30件で回答受付を停止
- Bot作成は「用途 × 業種」のローカルテンプレート方式
- 公開URLと、有料プラン向けiframe埋め込みに対応

## 技術構成

- Next.js 15.5.25 / App Router / TypeScript
- React 18
- Tailwind CSS
- Supabase: Auth / PostgreSQL / RLS
- Stripe Checkout / Billing / Customer Portal
- Resend: 新着回答のメール通知
- Vercel: 本番ホスティング

## セットアップ

```bash
npm ci
cp .env.example .env.local
npm run dev
```

ローカルURLは `http://localhost:3000` です。
実キーを含む `.env.local` はコミットしないでください。

## 環境変数

| 変数 | 必須 | 用途 |
| --- | :---: | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | サーバー専用DB操作 |
| `RESEND_API_KEY` | 通知時 | 回答通知メール |
| `RESEND_FROM_EMAIL` | 通知時 | Resendで検証済みの送信元 |
| `NEXT_PUBLIC_APP_URL` | ✅ | 公開URL。Productionは `https://chatbot-support.com` |
| `STRIPE_MODE` | 課金時 | `test` または `live` |
| `STRIPE_SECRET_KEY` | 課金時 | Stripeサーバーキー。restricted key対応 |
| `STRIPE_WEBHOOK_SECRET` | 課金時 | Webhook signing secret |
| `STRIPE_PRICE_LIGHT` | 課金時 | 980円/月のPrice ID |
| `STRIPE_PRICE_STANDARD` | 課金時 | 1,980円/月のPrice ID |
| `STRIPE_PRICE_PRO` | 課金時 | 3,980円/月のPrice ID |
| `STRIPE_EXPECTED_ACCOUNT_ID` | 本番切替時 | 使用中Stripeアカウントを固定するreadiness Gate |
| `STRIPE_PORTAL_CONFIGURATION_ID` | 任意 | 事前作成済みCustomer Portal設定 |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | 任意 | 現行Hosted Checkoutでは未使用 |

`STRIPE_EXPECTED_ACCOUNT_ID` をlive環境で設定すると、
`/api/stripe/readiness` は次をすべて確認します。

- 現在のStripeキーが期待するアカウントを指している
- `charges_enabled=true`
- `payouts_enabled=true`
- blockingな `currently_due` / `past_due` / `disabled_reason` がない

このGateを使うrestricted keyには、current accountを読み取れる権限が必要です。
未設定時は既存の共用Stripe本番を壊さないため、アカウント状態チェックだけをスキップします。

## Bot作成方式

`src/lib/bot-templates.ts` が用途・業種に応じた質問をローカルで組み立てます。
利用者は生成された質問、開始メッセージ、完了メッセージ等を編集して公開します。

OpenAI SDK、OpenAI APIキー、AI生成API Routeはアプリのランタイムに存在しません。
この条件は `tests/product-policy.test.mjs` で回帰検証しています。

## Supabase

本番プロジェクトは東京リージョン `ap-northeast-1` を使用します。

主要テーブル:

- `profiles`
- `bots`
- `bot_questions`
- `bot_responses`
- `subscriptions`
- `usage_events`
- `billing_events`
- `rate_limit_buckets`

既存本番DBの更新は `supabase/migrations/` の履歴を正とします。
本番へ適用済みのmigrationとリポジトリのmigration履歴は揃えて管理してください。

`supabase/schema.sql` と過去migrationには、AI利用時代の
`ai_generation_logs` 等の互換・履歴資産が残っていますが、
現在のアプリ実行経路からは参照していません。
削除する場合は履歴を書き換えず、新しいcleanup migrationで行います。

## 認証

Supabase Authで以下に対応します。

- メールアドレス + パスワード
- Google OAuth
- パスワード再設定

本番のSite URL / Redirect URLには `chatbot-support.com` を設定します。
Google OAuthのClient ID / SecretはSupabase側に保持し、Vercelへ追加する必要はありません。

## Stripe課金

現行フローはStripe Hosted Checkoutです。

- `POST /api/stripe/checkout`: Checkout Session作成
- `POST /api/stripe/portal`: Customer Portal Session作成
- `POST /api/stripe/webhook`: Subscription / Invoiceイベント同期
- `GET /api/stripe/readiness`: 本番構成の安全確認

Webhook購読イベント:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

Webhookは署名検証し、`billing_events` でイベントIDを冪等化します。
test/liveはDB上でも分離します。

Stripeアカウント変更時は、旧アカウントのCustomer IDを新アカウントへ再利用しません。
Checkout / Portal双方でCustomer IDの有効性を確認し、アカウント移行時は
古いStripe参照をクリアして再作成します。

専用Stripeアカウントへの本番切替手順、Price、Portal、Webhook、E2Eの記録は
[docs/stripe-production-cutover.md](docs/stripe-production-cutover.md) を正とします。

## Resend通知

公開Botへ回答が届くと、Botごとの通知先メールへ新着通知を送信します。

`RESEND_API_KEY` が未設定、または通知先メールが未設定の場合も、
回答保存自体は成功し、通知のみスキップします。

## 主要画面

| 種別 | パス | 内容 |
| --- | --- | --- |
| 公開 | `/` | トップ |
| 公開 | `/pricing` | 料金・Checkout導線 |
| 公開 | `/login`, `/signup` | 認証 |
| 公開 | `/b/[public_slug]` | 公開受付フォーム |
| 公開 | `/embed/[public_slug]` | iframe用受付フォーム |
| 公開 | `/terms` | 利用規約 |
| 公開 | `/privacy` | プライバシーポリシー |
| 公開 | `/legal` | 特定商取引法に基づく表記 |
| 公開 | `/refund-policy` | 解約・返金ポリシー |
| 管理 | `/dashboard` | ダッシュボード |
| 管理 | `/dashboard/billing` | プラン・請求管理 |
| 管理 | `/dashboard/bots` | Bot一覧 |
| 管理 | `/dashboard/bots/new` | Bot作成 |
| 管理 | `/dashboard/bots/[id]/edit` | 質問編集 |
| 管理 | `/dashboard/bots/[id]/publish` | 公開設定 |
| 管理 | `/dashboard/bots/[id]/responses` | 回答一覧 |

## API

| Method | Path | 認証 | 用途 |
| --- | --- | :---: | --- |
| POST | `/api/bots` | 必須 | Bot作成 |
| PATCH / DELETE | `/api/bots/[id]` | 必須 | Bot更新 / 削除 |
| PUT | `/api/bots/[id]/questions` | 必須 | 質問一括保存 |
| POST | `/api/responses` | 不要 | 公開回答受付 |
| PATCH | `/api/responses/[id]` | 必須 | 回答ステータス更新 |
| POST | `/api/stripe/checkout` | 必須 | Checkout |
| POST | `/api/stripe/portal` | 必須 | Customer Portal |
| POST | `/api/stripe/webhook` | Stripe署名 | 課金イベント反映 |
| GET | `/api/stripe/readiness` | 不要 | Stripe本番構成確認 |

## セキュリティと上限制御

- RLSを有効化
- 公開Bot/質問を匿名DB直読させず、Server Componentから必要列のみ取得
- 公開回答はサーバーAPI + service_role経由
- Zodによる入力検証
- 回答値をサーバー側の質問定義と照合
- メールHTMLをエスケープ
- Stripe Webhook署名検証
- Stripe event IDによる冪等処理
- `public_slug` は約144bitのランダム値
- Bot作成上限はDBトランザクション内で原子的に判定
- 無料プランの月30回答上限もDB関数内で原子的に判定
- 有料プランは回答数無制限
- スパム・過負荷対策のレート制限は料金上限とは別に適用

## 検証

CIとローカルでは以下を通すことを完了条件にします。

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

GitHub Actionsも同じ4チェックを実行します。

## 運用・法務文書

- [プロダクト方針](docs/product-policy.md)
- [Stripe本番切替](docs/stripe-production-cutover.md)
- [法務公開前チェック](docs/legal-production-readiness.md)
- [foundation hardening hotfix](docs/foundation-hardening-hotfix.md)

完全な住所はWeb上へ公開せず、現行方針では請求があった場合に
申込みの意思決定前に十分な時間的余裕をもって電子メールで開示します。
具体的な表示・運用条件は法務文書を正としてください。

## MVP対象外

現時点で完成条件に含めない機能:

- 年払い・一回払い・クーポン・従量課金
- LINE / Slack / Gmail / Google Sheets連携
- PDF / RAG / AI自由回答
- 複雑な条件分岐
- チーム管理
- 多言語
- 独自ドメイン
- 高度な分析レポート

これらは将来機能であり、現行MVPの未完了工程として扱いません。
