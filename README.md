# AI受付Bot作成サービス（MVP）

目的と業種を選ぶだけで、AIが質問項目・会話フロー・完了メッセージを自動生成し、
**チャット形式の受付フォーム**を作れるWebアプリです。

> **MVPの本質**は「AIが自由会話するチャットbot」ではなく、
> **「AIが質問設計を作り、公開画面ではチャット形式フォームとして回答を集めるサービス」** です。
> 公開チャット画面では訪問者に質問を1問ずつ提示し、回答を保存します（公開画面でAIが自由回答することはありません）。

---

## 目次

1. [技術構成](#技術構成)
2. [セットアップ手順](#セットアップ手順)
3. [必要な環境変数](#必要な環境変数)
4. [Supabaseで実行するSQL](#supabaseで実行するsql)
5. [Supabase Authentication の設定](#supabase-authentication-の設定)
6. [OpenAI APIキー設定](#openai-apiキー設定)
7. [Resendの送信元設定](#resendの送信元設定)
8. [ローカル起動・ビルド確認](#ローカル起動ビルド確認)
9. [Vercelデプロイ時の注意点](#vercelデプロイ時の注意点)
10. [画面・API一覧](#画面api一覧)
11. [セキュリティ設計](#セキュリティ設計)
12. [よくあるエラーと対処](#よくあるエラーと対処)
13. [MVPで未実装の機能](#mvpで未実装の機能)

---

## 技術構成

- **Next.js 14（App Router）** + **TypeScript**
- **Tailwind CSS**
- **Supabase**（Auth / PostgreSQL、Row Level Security 有効）
- **OpenAI API**（質問設計の生成のみ。`gpt-4o-mini` 既定）
- **Resend**（新着回答のメール通知）
- **Stripe Checkout / Billing / Customer Portal**（月額サブスクリプション）
- **Vercel** デプロイ想定

---

## セットアップ手順

```bash
# 1. 依存関係のインストール
npm install

# 2. 環境変数ファイルを作成して値を埋める
cp .env.example .env.local
#   → 下記「必要な環境変数」を参照し、実際のキーを入力

# 3. Supabase に schema.sql を流す（後述）

# 4. 開発サーバー起動
npm run dev   # http://localhost:3000
```

> `.env.local` は `.gitignore` 済みです。**実キーは絶対にコミットしないでください。**

---

## 必要な環境変数

`.env.example` をコピーして `.env.local` を作成し、以下を設定します。

| 変数名 | 必須 | 説明 |
| --- | :---: | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase の Project URL（例: `https://xxxx.supabase.co`） |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase の **anon public** key（ブラウザ公開OK） |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase の **service_role** key（**サーバー専用・公開厳禁**） |
| `OPENAI_API_KEY` | ✅ | OpenAI APIキー |
| `OPENAI_MODEL` | 任意 | 使用モデル。未指定なら `gpt-4o-mini` |
| `RESEND_API_KEY` | 任意 | Resend APIキー。未設定でも回答保存は動作し、**通知のみスキップ** |
| `RESEND_FROM_EMAIL` | 任意 | 送信元。例: `AI Chatbot Builder <onboarding@resend.dev>` |
| `NEXT_PUBLIC_APP_URL` | ✅ | アプリの公開URL。公開URL・埋め込みコード・メール内リンクの生成に使用。ローカルは `http://localhost:3000` |
| `STRIPE_SECRET_KEY` | 課金時必須 | StripeのSecret key（サーバー専用） |
| `STRIPE_WEBHOOK_SECRET` | 課金時必須 | Webhook endpointのSigning secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | 課金時必須 | StripeのPublishable key |
| `STRIPE_PRICE_LIGHT` | 課金時必須 | ライト（1,980円/月）のPrice ID |
| `STRIPE_PRICE_STANDARD` | 課金時必須 | スタンダード（4,980円/月）のPrice ID |
| `STRIPE_PRICE_PRO` | 課金時必須 | プロ（9,800円/月）のPrice ID |

現在確認済みの**Stripeテスト環境**の対応は以下です。本番ではこの3件を使わず、
同じ金額・月額周期で作成した本番環境のPrice IDへ差し替えてください。

```text
STRIPE_PRICE_LIGHT=price_1TjZ1UFoat2NfwYmBrkP7bCy
STRIPE_PRICE_STANDARD=price_1TjZ1rFoat2NfwYmgmk5zHRq
STRIPE_PRICE_PRO=price_1TjZ2CFoat2NfwYmSBgulHmr
```

`NEXT_PUBLIC_*` はブラウザに露出します。anon key と APP_URL のみで、**OpenAI / service_role / Resend のキーは含めないでください**。

`STRIPE_SECRET_KEY` と `STRIPE_WEBHOOK_SECRET` も必ずサーバー専用にし、`NEXT_PUBLIC_`を付けないでください。

---

## Supabaseで実行するSQL

[Supabase ダッシュボード](https://supabase.com/dashboard) → 対象プロジェクト → **SQL Editor** で
[`supabase/schema.sql`](supabase/schema.sql) の内容を貼り付けて実行してください。

このSQL一発で以下が作成されます（再実行しても安全な構成）。

- **テーブル**: `profiles` / `bots` / `bot_questions` / `bot_responses` / `ai_generation_logs`
- **enum**: `bot_status` / `response_status` / `question_type`
- **index**: 各外部キー・`public_slug`・`created_at` 等
- **trigger**:
  - `updated_at` 自動更新（profiles / bots / bot_questions）
  - `auth.users` 追加時に `profiles` を自動作成（`handle_new_user`、SECURITY DEFINER）
- **RLS ポリシー**（下記「セキュリティ設計」参照）

実行後、Table Editor で5テーブルと「RLS enabled」表示を確認してください。

課金機能を既存DBへ追加する場合は、続けて
[`supabase/migrations/20260618_add_billing.sql`](supabase/migrations/20260618_add_billing.sql)
をSQL Editorで実行します。以下が追加されます。

- `subscriptions`: Stripe Customer / Subscriptionと現在プラン
- `usage_events`: Bot作成・回答受信・AI生成の監査イベント
- `billing_events`: Stripe Webhookの冪等処理ログ

Stripeのtest/liveレコードを分離する場合は、その後に
[`supabase/migrations/202606180001_separate_stripe_modes.sql`](supabase/migrations/202606180001_separate_stripe_modes.sql)
を実行します。既存の課金行は削除せず`test`として保持し、同じユーザーがtest/liveそれぞれのCustomer・Subscriptionを持てる構成へ変更します。

---

## Stripe月額課金の設定

### 1. Stripeアカウントと商品を作る

1. Stripe Dashboardでアカウントを作成し、まずはテストモードを使用します。
2. Product catalogで以下の3商品（または1商品に3つのPrice）を作成します。
   - light: 1,980円、毎月
   - standard: 4,980円、毎月
   - pro: 9,800円、毎月
3. それぞれの `price_...` を `STRIPE_PRICE_LIGHT` / `STRIPE_PRICE_STANDARD` / `STRIPE_PRICE_PRO` に設定します。
4. Developers > API keysからSecret keyとPublishable keyを取得します。

### 2. Customer Portalを有効化する

Stripe Dashboard > Settings > Billing > Customer portalで、支払い方法の更新、請求履歴、サブスクリプション解約を有効にします。プラン間変更をPortalで行う場合は、上記3つのPriceを変更先として許可します。

### 3. Webhook endpointを設定する

本番のWebhook URLは次のとおりです。

```text
https://<本番ドメイン>/api/stripe/webhook
```

送信するイベント:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

Endpoint作成後のSigning secret (`whsec_...`) を `STRIPE_WEBHOOK_SECRET`に設定します。Webhookはraw bodyと署名を検証し、`billing_events.stripe_event_id`で二重処理を防ぎます。

### 4. ローカルでStripe CLIを使う

```bash
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

`stripe listen`が表示する `whsec_...` をローカルの `STRIPE_WEBHOOK_SECRET`に設定します。別ターミナルでアプリを起動し、`/pricing`からStripeのテストカードでCheckoutを完了させます。

### 5. Vercel本番設定

Vercel Project > Settings > Environment Variablesに以下をProduction用として追加します。

```text
STRIPE_MODE
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_PRICE_LIGHT
STRIPE_PRICE_STANDARD
STRIPE_PRICE_PRO
```

`STRIPE_MODE`はテスト環境では`test`、本番環境では`live`にします。テストモードと本番モードでKey / Price / Webhook secretはすべて別物です。本番切り替え時は7項目を同じモードで統一し、再デプロイしてください。

### 6. 本番反映後の確認

1. `/pricing`に4プランが表示される。
2. 未ログインの有料プラン操作は`/login`へ移動する。
3. ログイン後のCheckout完了で`/dashboard/billing?success=true`へ戻る。
4. Stripe DashboardのWebhookが200となり、`subscriptions`のplan/statusが更新される。
5. `/dashboard/billing`でプラン、利用量、次回更新日が表示される。
6. Customer Portalで支払い方法変更と解約ができる。
7. Bot作成、AI生成、公開Botへの回答が各上限で停止する。

テスト課金の終了方法、テストCustomer IDをlive環境へ混在させないための注意、
本番用Price ID、live切り替え手順、法務・表示チェックリストは
[`docs/stripe-production-cutover.md`](docs/stripe-production-cutover.md)を参照してください。

---

## Supabase Authentication の設定

1. **Authentication → Providers → Email** を有効化。
2. **Authentication → URL Configuration**
   - **Site URL**: 本番URL（ローカル確認時は `http://localhost:3000`）
   - **Redirect URLs** に以下を追加:
     - `http://localhost:3000/auth/callback`
     - `https://<本番ドメイン>/auth/callback`
3. **メール確認（Confirm email）について**
   - **ローカルでの動作確認時は OFF を推奨**
     （Authentication → Providers → Email → "Confirm email" をオフ）。
     OFFなら登録直後にそのままログイン状態になり、すぐ検証できます。
   - 本番では ON 推奨。ONの場合、登録後に届く確認メールのリンク
     （`/auth/callback` 経由）をクリックして登録が完了します。
     この動作には上記 **Redirect URLs の登録が必須**です。

---

## Googleログイン（Google OAuth）の設定

メール＋パスワードに加え、Googleログインに対応しています（`/login`・`/signup` の
「Googleでログイン / Googleで続ける」ボタン）。有効化には **Google Cloud** と
**Supabase** 双方の設定が必要です（コード側の追加実装は不要）。

### ① Google Cloud Console
1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成（または既存を選択）。
2. **APIとサービス → OAuth 同意画面** を設定（External / 公開）。アプリ名・サポートメール等を入力。
3. **APIとサービス → 認証情報 → 認証情報を作成 → OAuth クライアント ID**
   - **アプリケーションの種類**: `ウェブ アプリケーション`
   - **承認済みの JavaScript 生成元（Authorized JavaScript origins）**:
     - `https://ai-uketsuke-bot.vercel.app`
     - `http://localhost:3000`
   - **承認済みのリダイレクト URI（Authorized redirect URIs）**:
     - **Supabase が指定する Callback URL** を貼り付け（下記②で確認）:
       `https://tyzqmjwuwptjfrthibjd.supabase.co/auth/v1/callback`
4. 発行された **クライアント ID** と **クライアント シークレット** を控える。

### ② Supabase
1. **Authentication → Sign In / Providers → Google** を有効化。
2. ①の **Client ID** と **Client Secret** を貼り付けて保存。
   - この画面に表示される **Callback URL（`…supabase.co/auth/v1/callback`）** を、
     ①の「承認済みのリダイレクト URI」に登録してください（往復で一致させる）。
3. **Authentication → URL Configuration**（メール認証と共通）
   - **Site URL**: `https://ai-uketsuke-bot.vercel.app`
   - **Redirect URLs** に本番・ローカル双方を許可:
     - `https://ai-uketsuke-bot.vercel.app/**`
     - `http://localhost:3000/**`
     （アプリは `…/auth/callback?next=/dashboard` へ戻るため、`/**` で許容されます）

### 動作
- ボタン押下 → `supabase.auth.signInWithOAuth({ provider: "google" })` → Google認証 →
  Supabase → アプリの `/auth/callback`（`code` をセッションに交換）→ `/dashboard`。
- 初回ログイン時、`auth.users` 追加トリガー `handle_new_user` が `profiles` を自動作成
  （`id` 一致・`email`・`name`/`full_name` を保存、重複は `on conflict do nothing`）。
- **Vercel への追加環境変数は不要**（Client ID/Secret は Supabase 側に保持）。

---

## OpenAI APIキー設定

1. [OpenAI Platform](https://platform.openai.com/api-keys) でAPIキーを発行。
2. `.env.local` の `OPENAI_API_KEY` に設定。
3. モデルを変えたい場合は `OPENAI_MODEL`（既定 `gpt-4o-mini`）。
4. 質問生成は **JSON強制出力**（`response_format: json_object`）で行い、
   パース不可・スキーマ不一致・APIエラー（401/429等）はすべて利用者向けの
   日本語メッセージに変換され、エディタから再生成できます。

> OpenAIは **質問設計の生成のみ** に使用します。公開チャットでの自由回答は実装していません。

---

## Resendの送信元設定

1. [Resend](https://resend.com) でAPIキーを発行し、`RESEND_API_KEY` に設定。
2. **送信元ドメインの検証**:
   - 自社ドメインから送るには Resend の **Domains** でDNS（SPF/DKIM）を検証し、
     `RESEND_FROM_EMAIL` をそのドメインのアドレスに設定。
   - 検証前のお試しでは、Resendのテスト用 `onboarding@resend.dev` を `from` に使えます
     （※この場合、送信先は基本的に**自分のアカウントのメール宛て**に限られます）。
3. `RESEND_API_KEY` 未設定でも、回答自体は保存され通知だけがスキップされます
   （送信可否はサーバーログで確認可能）。

---

## ローカル起動・ビルド確認

```bash
npm run dev        # 開発サーバー（http://localhost:3000）
npm run build      # 本番ビルド
npm run start      # 本番起動（build後）
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit による型チェック
```

> 環境変数が無くても `npm run build` は成功します（全ページが動的レンダリングのため）。
> 実際のログイン・生成・通知には実キーが必要です。

---

## Vercelデプロイ時の注意点

1. **環境変数を Vercel に登録**
   Project → Settings → Environment Variables に、上表の変数をすべて設定します
   （`SUPABASE_SERVICE_ROLE_KEY` / `OPENAI_API_KEY` / `RESEND_API_KEY` は
   `NEXT_PUBLIC_` を付けない＝サーバー専用として登録）。
2. **`NEXT_PUBLIC_APP_URL`** には本番URL（例: `https://your-app.vercel.app`）を設定。
   これが公開URL・埋め込みコード・メール内リンクに使われます。
3. **Supabase の Redirect URLs / Site URL** に本番URLを追加（前述）。
4. **ランタイム**
   - API Route（`/api/*`）は Node.js サーバーレスで動作（service_role / OpenAI / Resend を使用）。`edge` 指定はしていません。
   - `middleware.ts` は Edge で動作し、`@supabase/ssr` でセッションを更新します（Supabase公式パターン）。ビルド時に出る `process.version` に関する警告は、Edgeで実行されないコードパスへの参照で、動作に影響しません。
5. **`service_role` key はクライアントへ出ません**
   （`src/lib/supabase/admin.ts` はAPI Routeからのみ import。`NEXT_PUBLIC_` も付けません）。
6. `npm run build` がローカルで通ることを確認してからデプロイしてください。

---

## 画面・API一覧

### 画面

| 種別 | パス | 内容 |
| --- | --- | --- |
| 公開 | `/` | トップページ |
| 公開 | `/pricing` | 料金プラン一覧・Checkout導線 |
| 公開 | `/login`, `/signup` | ログイン / 新規登録 |
| 公開 | `/b/[public_slug]` | 公開チャット画面（LINE風・1問ずつ） |
| 公開 | `/embed/[public_slug]` | iframe埋め込み用（ヘッダー・ナビなし） |
| 管理 | `/dashboard` | ダッシュボード（統計・最近のBot） |
| 管理 | `/dashboard/billing` | 現在プラン・利用量・請求管理 |
| 管理 | `/dashboard/bots` | Bot一覧 |
| 管理 | `/dashboard/bots/new` | 作成ウィザード（目的→業種→基本情報→AI生成） |
| 管理 | `/dashboard/bots/[id]` | Bot概要 |
| 管理 | `/dashboard/bots/[id]/edit` | 質問編集 / AI再生成 |
| 管理 | `/dashboard/bots/[id]/preview` | チャットプレビュー（保存されない） |
| 管理 | `/dashboard/bots/[id]/publish` | 公開設定・公開URL・埋め込みコード |
| 管理 | `/dashboard/bots/[id]/responses` | 回答ログ一覧 |
| 管理 | `/dashboard/bots/[id]/responses/[rid]` | 回答詳細・ステータス変更 |

### API

| メソッド | パス | 認証 | 用途 |
| --- | --- | :---: | --- |
| POST | `/api/bots` | 必須 | Bot作成（draft） |
| PATCH/DELETE | `/api/bots/[id]` | 必須 | Bot更新（基本情報/状態）/削除 |
| POST | `/api/bots/[id]/generate` | 必須 | AIで質問・文言を生成 |
| PUT | `/api/bots/[id]/questions` | 必須 | 質問の一括保存 |
| POST | `/api/responses` | 不要(公開) | 訪問者の回答送信＋メール通知 |
| PATCH | `/api/responses/[id]` | 必須 | 回答ステータス更新 |
| POST | `/api/stripe/checkout` | 必須 | Stripe Checkout Session作成 |
| POST | `/api/stripe/portal` | 必須 | Customer Portal Session作成 |
| POST | `/api/stripe/webhook` | Stripe署名 | 契約・支払いイベント反映 |

---

## セキュリティ設計

- **RLS 有効**。ユーザーは自分のBot・回答ログのみ閲覧/編集可能。
- 公開チャットは **published のBotのみ** RLSで読取可能。`draft` / `archived` は公開URLでも **404**（存在も漏らさない）。
- 回答送信はサーバーAPIが **service_role** で処理（公開状態確認・必須チェック・レート制限・通知）。
  **公開INSERTポリシーは作らず**、直接の書き込みを不可にしています。
- OpenAI / service_role / Resend / Stripe Secret のキーは**サーバー専用**。クライアント非露出。
- Stripe Webhookはraw bodyの署名を検証し、イベントIDで冪等化。
- 入力は **Zod** で検証。メール本文は **HTMLエスケープ**（XSS対策）。
- `public_slug` は `crypto.randomBytes(18)`（約144bit）で推測困難。
- 簡易レート制限（回答: IP単位20回/10分、生成: ユーザー単位10回/分）。
  ※ プロセス内メモリのため単一インスタンス向け。本番スケール時はRedis等へ差し替え推奨。

---

## よくあるエラーと対処

| 症状 | 原因 | 対処 |
| --- | --- | --- |
| ログイン/登録でエラー、画面が真っ白 | Supabase URL / anon key が未設定・誤り | `.env.local` を確認し再起動 |
| 登録後ログインできない | Confirm email が ON で未確認 | 確認メールのリンクをクリック、または Confirm email を OFF |
| 確認メールのリンクでエラー | Redirect URLs 未登録 | Supabase の URL Configuration に `/auth/callback` を追加 |
| AI生成が「APIキーが無効です」 | `OPENAI_API_KEY` 誤り・期限切れ | 正しいキーを設定 |
| AI生成が「混み合っています」 | OpenAI 側のレート制限(429) | 時間をおいて再試行 |
| 回答は保存されるがメールが来ない | `RESEND_API_KEY` 未設定 / 送信元ドメイン未検証 | キー設定とドメイン検証、サーバーログ確認 |
| `/dashboard` が `/login` に飛ぶ | 未ログイン | ログインする（仕様どおりの保護） |
| 公開URLが 404 | Bot が未公開（draft/archived） | 「公開設定」で公開する |
| ビルド時の `process.version` 警告 | middlewareのEdgeバンドル由来 | 動作に影響なし（無視可） |

---

## MVPで未実装の機能

以下は意図的に未実装です（DB・コード構造は拡張しやすく設計）。

- 年払い・一回払い・クーポン・従量課金
- LINE・Slack・Gmail・Google Sheets 連携
- PDF読み込み / RAG / **公開画面でのAI自由回答**
- 複雑な分岐シナリオ / チーム管理 / 多言語対応
- 独自ドメイン機能 / 高度な分析レポート

> この方針（AIは質問設計の生成に限定、公開画面はチャット形式フォーム）を維持してください。
