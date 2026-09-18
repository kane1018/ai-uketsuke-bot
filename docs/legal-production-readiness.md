# 法務公開前チェックリスト

調査・更新日: 2026-09-18

## 現在の状態

コード側の法務文面・課金導線は、以下の観点で補強済みです。

- 特定商取引法の通信販売表示
- 月額サブスクリプションの自動更新・解約条件
- 申込直前の契約条件確認
- 個人情報保護法32条の公表事項
- 開示・訂正・利用停止等の請求手続
- 安全管理措置・国外取扱いの説明
- 消費者契約法を踏まえた免責・責任制限
- 利用者都合の返金条件と、重複決済・当方不具合時の例外
- 法務情報未確定時のStripe live決済ブロック

## 本番課金前に必ず確定する事業者情報

`src/lib/legal-info.ts` の以下7項目は、事業者本人が確認した実値だけを入力します。

1. 事業者名
2. 代表者・運営責任者名
3. 所在地
4. 電話番号
5. 公開用メールアドレス
6. 問い合わせメールアドレス
7. 問い合わせ対応時間

リポジトリ、Stripe、Vercel、GitHub、環境変数等から本人情報を推測して埋めないこと。

### 住所・電話番号を公開したくない場合

特定商取引法11条ただし書に基づき、一定の表示事項は、
「請求があれば書面または電子メール等で遅滞なく提供する」旨を明示し、
実際に申込みの意思決定前に十分な時間的余裕をもって提供できる体制があれば
省略できる場合があります。

この方式を採る場合は、現在の単純なフル表示方式とは別に、
請求導線・案内文・実運用を実装してから利用してください。

## 国外クラウド・委託先

現在確認できているSupabase本番プロジェクトのリージョンは
`ap-northeast-1`（東京リージョン）です。

本サービスでは次の外部サービスを利用します。

- Supabase
- Stripe
- Resend
- OpenAI API
- Vercel

国外で個人データを取り扱う可能性があるサービスについては、
契約・リージョン設定・実際のデータフローを定期的に確認し、
必要な外国制度の把握、安全管理措置、委託先監督を行います。
プライバシーポリシーでは、具体的な国・地域と措置の概要について
問い合わせに応じる導線を設けています。

## 課金画面

料金ページでは以下を明示します。

- 月額料金
- 1か月契約
- 1か月ごとの自動更新
- 初回・継続時の支払時期
- 次回更新日前までの解約
- 解約手数料なし
- 支払済み期間終了までの利用
- 利用者都合の日割り返金なし

Stripe Checkoutの決済確定ボタン付近にも、同じ要点を表示します。

## 本番Go-Live Gate

次をすべて満たすまでStripeのlive決済を開始しないこと。

- `LEGAL_PENDING_VALUE` が公開事業者情報に残っていない
- 特商法ページの事業者情報が実態と一致する
- 料金ページとStripe Priceの金額・請求周期が一致する
- Stripe Dashboardの公開事業者情報が実態と一致する
- 利用規約・プライバシーポリシー・特商法・返金ポリシーへ常時アクセスできる
- Checkout上で月額・自動更新・解約条件を確認できる
- Customer Portalから実際に解約できる
- 問い合わせメールが受信できる
- 個人情報の開示等請求へ対応できる運用がある

## 主な公式根拠

- 消費者庁「通信販売｜特定商取引法ガイド」
  https://www.no-trouble.caa.go.jp/what/mailorder/
- 消費者庁「通信販売広告について」
  https://www.no-trouble.caa.go.jp/what/mailorder/advertising.html
- 消費者庁「通信販売広告Q&A」
  https://www.no-trouble.caa.go.jp/qa/advertising.html
- 消費者庁「通信販売の申込み段階における表示についてのガイドライン」
  https://www.caa.go.jp/policies/policy/consumer_transaction/specified_commercial_transactions/
- 個人情報保護委員会「個人情報の保護に関する法律についてのガイドライン（通則編）」
  https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/
- 個人情報保護委員会「個人情報保護法の基本」
  https://www.ppc.go.jp/files/pdf/kihon_202309.pdf
- 個人情報保護委員会「外的環境の把握」に関するFAQ
  https://www.ppc.go.jp/all_faq_index/faq1-q10-24
  https://www.ppc.go.jp/all_faq_index/faq1-q10-25/
- 消費者庁「消費者契約法 逐条解説」
  https://www.caa.go.jp/policies/policy/consumer_system/consumer_contract_act/annotations
- 国税庁「No.6902 『総額表示』の義務付け」
  https://www.nta.go.jp/taxes/shiraberu/taxanswer/shohi/6902.htm

## 注意

このチェックリストは公開準備の実務資料です。
個別案件の適法性を最終判断するものではなく、
事業モデルや契約条件が変わった場合は再確認が必要です。
