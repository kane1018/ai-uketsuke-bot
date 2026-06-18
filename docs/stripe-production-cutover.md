# Stripe本番決済 切り替えチェックリスト

この文書は、テストモードで検証済みの月額課金をStripe本番モードへ切り替えるための手順です。
秘密値はリポジトリ、Issue、チャット、スクリーンショットへ貼り付けず、StripeとVercelの管理画面内だけで扱います。

## モードを混在させない

StripeのAPIキー、Price ID、Webhook signing secret、Customer ID、Subscription IDはテストモードと本番モードで別物です。
切り替えるときは、次の6項目を同じモードへまとめて変更してから再デプロイします。

| Vercel環境変数 | テスト環境 | 本番環境 |
| --- | --- | --- |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | `pk_live_...` |
| `STRIPE_SECRET_KEY` | `sk_test_...` | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | テストEndpointの`whsec_...` | 本番Endpointの`whsec_...` |
| `STRIPE_PRICE_LIGHT` | テストPrice ID | `price_1TjYf7Foat2NfwYmpRakEuXo` |
| `STRIPE_PRICE_STANDARD` | テストPrice ID | `price_1TjYh9Foat2NfwYmJdkeTKRE` |
| `STRIPE_PRICE_PRO` | テストPrice ID | `price_1TjYiXFoat2NfwYmEGfrWsMy` |

テストEndpointのWebhook secretを本番Endpointへ流用しないでください。Price IDもモードをまたいで利用できません。

## テストsubscriptionの扱い

現時点のテストsubscriptionは、解約動作とWebhook同期を追加確認するまで残して構いません。

- Portalで「期間終了時にキャンセル」を設定すると、`customer.subscription.updated`により`cancel_at_period_end`が反映されることを確認する。
- 実際に終了または即時キャンセルした場合は、`customer.subscription.updated`または`customer.subscription.deleted`により`status`が更新されることを確認する。
- Stripe上のテストデータを削除しても、本番モードのStripeデータには影響しない。

重要: 現在の`subscriptions`行にはテストモードの`stripe_customer_id`と`stripe_subscription_id`が保存されています。APIキーだけをliveへ変更すると、同じユーザーのCheckoutがテストCustomer IDをlive APIへ渡して失敗します。live切り替え前に、次のどちらかを実装・実施してください。

1. 推奨: `subscriptions`をStripe mode（test/live）で分離し、モードごとにCustomer/Subscriptionを保持する。
2. 暫定: 対象テストユーザーの契約終了をWebhookで確認後、管理者承認のもとでテスト用Stripe IDをlive移行用に安全に切り離す。既存Bot・回答・ユーザーは削除しない。

単なるPortalキャンセルではStripe ID自体は残るため、この問題は解消しません。

## 本番切り替え手順

1. 下記の法務・表示項目を公開し、Stripe上の公開ビジネス情報を確定する。
2. Stripe本番モードで3プランと上記Price IDの金額・通貨・月次課金を再確認する。
3. Stripe本番モードのCustomer Portalで、支払い方法変更、請求履歴、プラン変更、キャンセル条件を設定する。
4. Stripe本番モードでWebhook Endpointを作成する。
   - URL: `https://ai-uketsuke-bot.vercel.app/api/stripe/webhook`
   - イベント:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
5. 本番Endpointで発行されたWebhook secretを安全に控える。
6. テストCustomer ID混在問題が解消済みであることを確認する。
7. Vercel Productionの6環境変数を、同一のliveモード値へまとめて変更する。
8. Productionを再デプロイする。
9. `/pricing`から少額または実カードでCheckoutを1件確認する。実課金になるため、金額・返金方針・実施担当者を事前承認する。
10. `/dashboard/billing?success=true`へ戻り、プラン、status、次回更新日を確認する。
11. `subscriptions`にlive Customer/Subscription/Priceが反映されたことを確認する。
12. `billing_events`に対象イベントが保存され、StripeのWebhook配信が成功していることを確認する。
13. Customer Portalで契約内容、支払い方法、プラン変更、キャンセル、戻り先を確認する。
14. Bot作成、AI生成、公開回答、回答ログ、メール通知をスモークテストする。

## 法務・表示チェックリスト

実課金を開始する前に、専門家の確認を含めて次を公開・確定します。

- 利用規約
- プライバシーポリシー
- 特定商取引法に基づく表記
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
- 問題時はlive/test値を混在させず、6項目を一組として扱う。
