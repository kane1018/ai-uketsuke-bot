import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/LegalPageLayout";
import { LEGAL_BUSINESS_INFO } from "@/lib/legal-info";

export const metadata: Metadata = { title: "解約・返金ポリシー | AI受付Bot" };

export default function RefundPolicyPage() {
  return (
    <LegalPageLayout
      title="解約・返金ポリシー"
      description="有料プランの解約時期と返金の基本方針を説明します。"
    >
      <section>
        <h2>1. 月額課金</h2>
        <p className="mt-3">
          有料プランは月額の継続課金です。申込時に初回料金を決済し、解約されるまで請求期間ごとに自動更新されます。
        </p>
      </section>
      <section>
        <h2>2. 解約方法</h2>
        <p className="mt-3">
          ログイン後の「プラン・請求」画面から「支払い・請求・解約を管理」を選び、Stripe Customer Portalで解約手続きを行ってください。操作できない場合は、下記問い合わせ先へご連絡ください。
        </p>
      </section>
      <section>
        <h2>3. 解約後の利用可能期間</h2>
        <p className="mt-3">
          期間終了時の解約を選択した場合、原則として現在の支払済み請求期間の終了まで有料機能を利用できます。終了後は無料プランの上限が適用されます。即時解約等、申込画面またはCustomer Portalに別の条件が表示される場合はその表示を優先します。
        </p>
      </section>
      <section>
        <h2>4. 日割り返金</h2>
        <p className="mt-3">
          デジタルサービスの性質上、利用者都合による解約について、支払済み料金の日割り計算や返金は原則として行いません。解約前に次回請求日をご確認ください。
        </p>
      </section>
      <section>
        <h2>5. 重複決済・システム不具合</h2>
        <p className="mt-3">
          重複決済、請求金額の誤り、当方のシステム不具合によりサービスを利用できなかった場合は、決済日、金額、アカウントを確認のうえ、返金、請求取消し、利用期間延長等の適切な方法で個別に対応します。
        </p>
      </section>
      <section>
        <h2>6. 問い合わせ先</h2>
        <p className="mt-3">
          課金・解約・返金に関する問い合わせ先：
          <span className="font-semibold text-amber-800">{LEGAL_BUSINESS_INFO.inquiryEmail}</span>
          <br />
          対応時間：
          <span className="font-semibold text-amber-800">
            {LEGAL_BUSINESS_INFO.inquiryResponseTime}
          </span>
          <br />
          カード番号などの機密情報はメールに記載しないでください。
        </p>
      </section>
    </LegalPageLayout>
  );
}
