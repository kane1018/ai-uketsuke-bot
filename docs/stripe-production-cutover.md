# Stripe本番決済 切り替えチェックリスト

この文書は、テストモードで検証済みの月額課金をStripe本番モードへ切り替えるための手順です。
秘密値はリポジトリ、Issue、チャット、スクリーンショットへ貼り付けず、StripeとVercelの管理画面内だけで扱います。

## モードを混在させない

StripeのAPIキー、Price ID、Webhook signing secret、Customer ID、Subscription IDはテストモードと本番モードで別物です。
切り替えるときは、次の7項目を同じモードへまとめて変更してから再デプロイします。

| Vercel環境変数 | テスト環境 | 本番環境 |
| --- | --- | --- |
| `STRIPE_MODE` | `test` | `live` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | `pk_live_...` |
| `STRIPE_SECRET_KEY` | `sk_test_...` | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | テストEndpointの`whsec_...` | 本番Endpointの`whsec_...` |
| `STRIPE_PRICE_LIGHT` | テストPrice ID | `price_1TjYf7Foat2NfwYmpRakEuXo` |
| `STRIPE_PRICE_STANDARD` | テストPrice ID | `price_1TjYh9Foat2NfwYmJdkeTKRE` |
| `STRIPE_PRICE_PRO` | テストPrice ID | `price_1TjYiXFoat2NfwYmEGfrWsMy` |

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
4. Stripe本番モードのCustomer Portalで、支払い方法変更、請求履歴、プラン変更、キャンセル条件を設定する。
5. Stripe本番モードでWebhook Endpointを作成する。
   - URL: `https://ai-uketsuke-bot.vercel.app/api/stripe/webhook`
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
9. Vercel Productionの7環境変数を、`STRIPE_MODE=live`を含む同一のliveモード値へまとめて変更する。test/liveの値を部分的に混在させない。
10. Productionを再デプロイし、deploymentがReadyであることを確認する。
11. `/pricing`から少額または実カードでCheckoutを1件確認する。実課金になるため、金額・返金方針・実施担当者を事前承認する。
12. `/dashboard/billing?success=true`へ戻り、プラン、status、次回更新日を確認する。
13. `subscriptions`にlive Customer/Subscription/Priceが反映されたことを確認する。
14. `billing_events`に対象イベントが保存され、Stripeの本番Webhook配信が成功していることを確認する。
15. Customer Portalで契約内容、支払い方法、プラン変更、キャンセル、戻り先を確認する。
16. Bot作成、AI生成、公開回答、回答ログ、メール通知をスモークテストする。

## 法務・表示チェックリスト

実課金を開始する前に、専門家の確認を含めて次を公開・確定します。

### 正式事業者情報反映チェック

正式情報は[`src/lib/legal-info.ts`](../src/lib/legal-info.ts)の`LEGAL_BUSINESS_INFO`へ集約します。ほかのページへ同じ情報を直接重複入力せず、次の未確定値を事業者本人が確定してください。

- [ ] 事業者名
- [ ] 運営責任者名
- [ ] 所在地
- [ ] 電話番号と、請求時開示方式を採用できるかの専門家確認
- [ ] 法務ページに表示するメールアドレス
- [ ] 個人情報・課金・解約・返金の問い合わせ先メールアドレス
- [ ] 問い合わせ対応時間または標準回答期間
- [ ] 販売価格の税込／税別表示
- [ ] Stripe Checkout、領収書、Customer Portalに表示する公開ビジネス名
- [ ] `LEGAL_PENDING_VALUE`（`【未確定】`）がProductionの法務ページに残っていないこと
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
- 問題時はlive/test値を混在させず、7項目を一組として扱う。
