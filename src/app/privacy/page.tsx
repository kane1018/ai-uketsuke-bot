import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/LegalPageLayout";

export const metadata: Metadata = { title: "プライバシーポリシー | AI受付Bot" };

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      title="プライバシーポリシー"
      description="本サービスにおける利用者情報の取扱いについて説明します。"
    >
      <section>
        <h2>1. 取得する情報</h2>
        <ul>
          <li>氏名、メールアドレスその他アカウント登録情報</li>
          <li>作成したBot、質問、回答、通知先等のサービス利用情報</li>
          <li>契約プラン、決済状態、Customer ID等の決済関連情報（カード番号そのものはStripeが管理します）</li>
          <li>IPアドレス、端末・ブラウザ情報、Cookie、アクセスログ、障害ログ</li>
          <li>問い合わせ時に利用者から提供される情報</li>
        </ul>
      </section>
      <section>
        <h2>2. 利用目的</h2>
        <ul>
          <li>本人確認、アカウント管理、本サービスの提供</li>
          <li>Botの生成・公開、回答保存、通知、利用上限の管理</li>
          <li>料金請求、契約管理、不正利用防止</li>
          <li>障害対応、セキュリティ確保、品質改善</li>
          <li>重要なお知らせ、問い合わせ対応、法令上必要な対応</li>
        </ul>
      </section>
      <section>
        <h2>3. 第三者提供</h2>
        <p className="mt-3">
          法令に基づく場合、生命・身体・財産の保護に必要な場合その他法令で認められる場合を除き、本人の同意なく個人データを第三者へ提供しません。業務委託先への必要な範囲での提供は第三者提供に該当しない場合がありますが、適切な委託先管理を行います。
        </p>
      </section>
      <section>
        <h2>4. 利用する外部サービス</h2>
        <ul>
          <li>Supabase：認証、データベース、関連するバックエンド機能</li>
          <li>Stripe：決済、請求、Customer Portal</li>
          <li>Resend：メール通知</li>
          <li>OpenAI API：質問・文章等のAI生成</li>
          <li>Vercel：アプリケーションのホスティング、配信、ログ管理</li>
        </ul>
        <p className="mt-3">
          各サービスでは、その提供者のプライバシーポリシー等に従って情報が処理されることがあります。AI生成に不要な個人情報や秘密情報を入力しないでください。
        </p>
      </section>
      <section>
        <h2>5. Cookie等</h2>
        <p className="mt-3">
          ログイン状態の維持、セキュリティ、基本機能の提供のためCookieまたは同様の技術を使用します。ブラウザでCookieを無効にすると、一部機能を利用できない場合があります。
        </p>
      </section>
      <section>
        <h2>6. 安全管理</h2>
        <p className="mt-3">
          アクセス制御、権限分離、通信の暗号化、秘密情報の適切な管理等、取り扱う情報の性質に応じた合理的な安全管理措置を講じます。
        </p>
      </section>
      <section>
        <h2>7. 開示・訂正・削除</h2>
        <p className="mt-3">
          本人から、保有個人データの開示、訂正、利用停止、削除等の請求があった場合は、本人確認のうえ法令に従って対応します。契約・会計・不正防止等のため法令上または業務上必要な情報は、直ちに削除できない場合があります。
        </p>
      </section>
      <section>
        <h2>8. 問い合わせ先</h2>
        <p className="mt-3">本番公開前に、個人情報に関する問い合わせ先メールアドレスを記載します。</p>
      </section>
      <section>
        <h2>9. 改定</h2>
        <p className="mt-3">
          法令やサービス内容の変更に応じて本ポリシーを改定します。重要な変更は、本サービス上その他適切な方法で案内します。
        </p>
      </section>
    </LegalPageLayout>
  );
}
