# Stripe本番決済 切り替えチェックリスト

この文書は、テストモードで検証済みの月額課金をStripe本番モードへ切り替えるための手順です。
秘密値はリポジトリ、Issue、チャット、スクリーンショットへ貼り付けず、StripeとVercelの管理画面内だけで扱います。

## 2026-09-18 現在の本番状態

- Stripeアカウントは本人確認済みで、カード決済・入金とも有効。追加の必須確認事項はない。
- AI受付Botの3つのlive Priceは有効で、ライト1,980円、スタンダード4,980円、プロ9,800円、すべてJPY・月次。
- 本番Webhook Endpointは有効で、必要な6イベントを購読済み。
- Supabaseにはtestモードの課金検証履歴のみ存在し、live subscription / live billing eventはまだない。
- 本番 `/api/stripe/readiness` は `failureStage=stripe_secret_key` で停止中。Productionの有効な `sk_live_...` が認識されるまでlive課金を開始しない。
- Stripeアカウントは他サービスと共用しており、アカウント共通の表示名・プロフィールはAI受付Bot専用ではない。Checkout Session上部は「AI受付Bot」に上書き済みだが、領収書等のアカウント共通表示について本番開始前に運用方針を確定する。
- AI受付Bot専用Customer Portal設定はSecret keyが有効になった後、readiness/Portal処理が必要条件を満たす設定を自動探索し、存在しなければ作成する。

## モードを混在させない

StripeのAPIキー、Price ID、Webhook signing secret、Customer ID、Subscription IDはテストモードと本番モードで別物です。
切り替えるときは、実際に使用するStripeサーバー設定を同じモードへまとめて変更してから再デプロイします。現在の決済導線はStripe Hosted Checkoutへリダイレクトする方式で、Stripe.jsは使用していません。

| Vercel環境変数 | テスト環境 | 本番環境 |
| --- | --- | --- |
| `STRIPE_MODE` | `test` | `live` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | 任意（Stripe.js追加時） | 任意（現行Hosted Checkoutでは未使用） |
| `STRIPE_SECRET_KEY` | `sk_test_...` / `rk_test_...` | `sk_live_...` / `rk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | テストEndpointの`whsec_...` | 本番Endpointの`whsec_...` |
| `STRIPE_PRICE_LIGHT` | テストPrice ID | `price_1TjYf7Foat2NfwYmpRakEuXo` |
| `STRIPE_PRICE_STANDARD` | テストPrice ID | `price_1TjYh9Foat2NfwYmJdkeTKRE` |
| `STRIPE_PRICE_PRO` | テストPrice ID | `price_1TjYixFoat2NfwYmEGfrWsMy` |

テストEndpointのWebhook secretを本番Endpointへ流用しないでください。Price IDもモードをまたいで利用できません。アプリは`STRIPE_MODE`とSecret keyのprefix、およびWebhook/Subscriptionの`livemode`を照合し、不一致を拒否します。

## DBとアプリのtest/live分離

[`supabase/migrations/202606180001_separate_stripe_modes.sql`](../supabase/migrations/202606180001_separate_stripe_modes.sql)を適用すると、`subscriptions`と`billing_events`に`stripe_mode`が追加されます。

- 既存行は削除せず、すべて`test`としてバックフィルする
- 同一ユーザーがtest/liveそれぞれ1件のsubscriptionを保持できる
- Customer ID、Subscription ID、Webhook event IDの一意性をモードごとに管理する
- RLS設定は変更しない
- Billing画面、Checkout、Portal、Webhook、プラン上限制御は現在の`STRIPE_MODE`だけを参照する

liveへ切り替えた直後、live subscriptionがまだないユーザーは無料プランとして表示されます。test subscriptionは検証証跡として残りますが、liveモードから参照されません。live Checkoutを完了すると、同じユーザーのlive用Customer/subscription行が別に作成されます。

## テストsubscriptionの扱い

現時点のテストsubscriptionは、解約動作とWebhook同期を追加確認するまで残して構いません。

- Portalで「期間終了時にキャンセル」を設定すると、`customer.subscription.updated`により`cancel_at_period_end`が反映されることを確認する。
- 実際に終了または即時キャンセルした場合は、`customer.subscription.updated`または`customer.subscription.deleted`により`status`が更新されることを確認する。
- Stripe上のテストデータを削除しても、本番モードのStripeデータには影響しない。

重要: migration適用前にAPIキーだけをliveへ変更すると、同じユーザーのCheckoutがテストCustomer IDをlive APIへ渡して失敗します。必ずmigrationを先に適用し、既存行が`stripe_mode = 'test'`になったことを確認してから`STRIPE_MODE=live`へ切り替えてください。単なるPortalキャンセルではStripe ID自体は残るため、モード分離の代わりにはなりません。

## 本番切り替え手順

1. 下記の法務・表示項目を確定し、`/terms`、`/privacy`、`/legal`、`/refund-policy`をProductionで公開する。
   - 4ページが未ログインでHTTP 200となることを確認する。
   - `/pricing`とサイトフッターから4ページへ遷移できることを確認する。
   - プレースホルダーを残さず、事業者本人または専門家の確認を完了する。
2. Stripe Dashboard、Checkout、領収書、Customer Portalに表示する公開ビジネス名が、法務ページの事業者表示と整合していることを確認する。
3. Stripe本番モードで3プランと上記Price IDの金額・通貨・月次課金を再確認する。
   - 2026-09-18確認: ライト1,980円、スタンダード4,980円、プロ9,800円、すべてJPY・1か月周期でactive。
   - Stripe Priceの `tax_behavior` は現時点で `unspecified`。アプリは追加税額を加算せずPriceのunit_amountを請求総額として表示・決済する構成。
4. Stripe本番モードのCustomer Portalで、支払い方法変更、請求履歴、プラン変更、キャンセル条件を設定する。
   - 2026-09-18確認: 支払い方法変更、請求履歴、期間終了時の解約は有効。解約時のprorationはnone。
   - AI受付Bot専用Customer Portal設定を使用する。`STRIPE_PORTAL_CONFIGURATION_ID` が設定済みならその設定を利用し、未設定ならアプリが初回Portal利用時に専用設定を自動作成して再利用する。
   - 自動作成する専用設定には、利用規約URL `https://chatbot-support.com/terms`、プライバシーポリシーURL `https://chatbot-support.com/privacy`、支払方法変更、請求履歴、期間終了時解約を設定する。
5. Stripe本番モードのWebhook Endpointを確認する。
   - URL: `https://chatbot-support.com/api/stripe/webhook`
   - 2026-09-18: AI受付Bot用live Webhook Endpoint作成済み（Endpoint ID `we_1UGuk3Foat2NfwYmoT7fdYsT`）。Signing SecretはVercelの `STRIPE_WEBHOOK_SECRET` へ安全に設定済み。旧Endpoint `we_1UGuabFoat2NfwYm3xFYt7cN` は無効化済み。
   - イベント:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
6. 本番Endpointで発行されたWebhook secretを安全に控える。
7. test/live分離migrationが適用され、既存行が`test`として保持されていることを確認する。
8. 実決済前の最終確認を実施する。
   - 法務4ページと料金・解約条件の表示が確定している。
   - Stripe公開ビジネス名、Price、税、Customer Portal、本番Webhookが確定している。
   - 切り替え日時、担当者、テスト金額、返金方法、ロールバック手順が承認されている。
9. Vercel ProductionのStripeサーバー環境変数（`STRIPE_MODE`、`STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`、3つのPrice ID）を同一のliveモード値へまとめて変更する。test/liveの値を部分的に混在させない。`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` は現行Hosted Checkoutでは未使用。`STRIPE_PORTAL_CONFIGURATION_ID` は専用設定を事前作成した場合のみ設定し、未設定時はアプリの自動作成を利用する。
   - 2026-09-18現在、`STRIPE_MODE`、Webhook secret、3つのlive Price ID、`NEXT_PUBLIC_APP_URL` は本番設定済み。
   - 残るブロッカーは `STRIPE_SECRET_KEY`。共有Stripeアカウントの既存Standard keyは他サービスへ影響する可能性があるためローテーションしない。AI受付Bot専用のlive restricted key（`rk_live_...`）を推奨し、必要権限だけを付与してVercelへ設定する。既存の専用Standard keyを安全に管理できる場合は `sk_live_...` も利用可能。いずれも `/api/stripe/readiness` がHTTP 200 / `ready:true` になるまで本番課金を開始しない。
10. Productionを再デプロイし、deploymentがReadyであることを確認する。
11. `/pricing`から少額または実カードでCheckoutを1件確認する。実課金になるため、金額・返金方針・実施担当者を事前承認する。
12. `/dashboard/billing?success=true`へ戻り、プラン、status、次回更新日を確認する。
13. `subscriptions`にlive Customer/Subscription/Priceが反映されたことを確認する。
14. `billing_events`に対象イベントが保存され、Stripeの本番Webhook配信が成功していることを確認する。
15. Customer Portalで契約内容、支払い方法、プラン変更、キャンセル、戻り先を確認する。
16. Bot作成、AI生成、公開回答、回答ログ、メール通知をスモークテストする。

## 課金状態とダウングレード時の運用

- `past_due` はStripeの支払い再試行中として扱い、その間は現在の有料プラン権限を一時的に維持する。
- Stripe側で `unpaid` または `canceled` になった時点で、アプリの有効プランは無料プランへ戻る。
- ダウングレード後に既存Bot数が新プラン上限を超えても、既存Botを自動削除・自動停止しない。
- Bot数が上限を超えている間は新しいBotの作成を拒否する。利用者は不要Botを削除するか、上位プランへ変更する。
- iframe利用可否とロゴ表示は常に現在の有効プランへ追従する。既存Bot数を維持していても旧プランの付加機能を固定しない。
- Billing画面では `past_due` とBot数超過を明示し、利用者が状態を把握できるようにする。

## 法務・表示チェックリスト

実課金を開始する前に、専門家の確認を含めて次を公開・確定します。

### 正式事業者情報反映チェック

正式情報は[`src/lib/legal-info.ts`](../src/lib/legal-info.ts)の`LEGAL_BUSINESS_INFO`へ集約します。実装済みの値と、公開前に外部確認が必要な項目を分けて管理します。

- [x] 事業者名・運営責任者名を反映
- [x] 電話番号を反映
- [x] 法務ページ表示用メールアドレスと問い合わせ先メールアドレスを反映
- [x] 問い合わせ対応時間を反映
- [x] 所在地は公開せず、請求時に遅滞なく電子メールで開示する案内を実装
- [x] 料金表示は`PLANS`のStripe対象プラン金額から生成し、別途税額を加算しない表示へ統一
- [x] `LEGAL_PENDING_VALUE`（`【未確定】`）が`LEGAL_BUSINESS_INFO`に残っていない
- [ ] 住所の請求時開示方式を含む特商法表示について、事業者本人または専門家が最終確認
- [x] Stripe Checkout上部の表示名はSession単位で「AI受付Bot」に上書き
- [x] AI受付Botの3つのlive Productにsubscription用明細表記 `AI UKETSUKE BOT` を設定
- [ ] Stripeの領収書・Customer Portal等で使われるアカウント共通のPublic business nameを最終確認
  - Stripeアカウントは他サービスと共用しているため、CheckoutのSession単位表示名とは別に、領収書・Portal上のBusiness nameはアカウント共通となる。
  - 他サービスへ影響するアカウント共通名の変更は自動実施しない。共通の法的事業者名へ統一するか、AI受付Bot専用Stripeアカウントへ分離するかを本番課金開始前に確定する。
- [ ] `/terms`、`/privacy`、`/legal`、`/refund-policy`の事業者本人または専門家による最終確認

販売価格、商品代金以外の必要料金、支払方法、支払時期、サービス提供時期、解約方法、返金条件、動作環境は同ファイルの`LEGAL_DISCLOSURE_ITEMS`に集約しています。実課金開始前に、実際の運用・Stripe設定と一致していることを再確認してください。

- 利用規約（`/terms`）
- プライバシーポリシー（`/privacy`）
- 特定商取引法に基づく表記（`/legal`）
- 解約・返金ポリシー（`/refund-policy`）
- 契約期間、自動更新、解約の効力発生日と操作方法
- 返金・日割り・請求失敗時の扱い
- 正式な事業者名、代表者名、所在地、電話番号（省略可否を含め法令に従う）
- 問い合わせ先と対応時間
- 各プランの税込／税別、料金、提供内容、利用上限
- Stripe Checkout、領収書、Customer Portalに表示する公開ビジネス名
- StripeのStatement descriptor（カード明細表記）
- `/pricing`から「特定商取引法に基づく表記」へ容易に到達できる導線
- 申込最終確認画面で、価格、契約期間、自動更新、解約条件などを確認・訂正できる表示
- 取得する個人情報の利用目的、第三者提供、委託、安全管理、問い合わせ窓口

法務文面は事業形態・販売地域・対象顧客により要件が変わるため、公開前に専門家へ確認してください。

## 切り替え後の記録

- 切り替え日時、担当者、Vercel deployment URLを記録する。
- 使用したPrice IDとWebhook Endpoint IDを記録する（秘密値は記録しない）。
- 初回liveイベントのStripe event IDとDB反映結果を記録する。
- 問題時はlive/test値を混在させず、実際に使用するStripeサーバー設定を一組として扱う。
