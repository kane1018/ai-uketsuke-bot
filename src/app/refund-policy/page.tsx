import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/LegalPageLayout";
import { LEGAL_BUSINESS_INFO } from "@/lib/legal-info";

export const metadata: Metadata = { title: "解約・返金ポリシー | AI受付Bot" };

export default function RefundPolicyPage() {
  return (
    <LegalPageLayout
      title="解約・返金ポリシー"
      description="有料プランの自動更新、解約時期、利用終了日および返金条件を説明します。"
    >
      <section>
        <h2>1. 月額課金・自動更新</h2>
        <p className="mt-3">
          有料プランは1か月単位の継続課金です。
          初回申込時に料金を決済し、利用者が解約するまで、
          各請求期間の開始時に同一プランが1か月ごとに自動更新されます。
        </p>
      </section>

      <section>
        <h2>2. 解約方法</h2>
        <p className="mt-3">
          ログイン後の「プラン・請求」画面から「支払い・請求・解約を管理」を選び、
          Stripe Customer Portalで解約手続きを行ってください。
          解約手数料はありません。操作できない場合は、下記問い合わせ先へご連絡ください。
        </p>
      </section>

      <section>
        <h2>3. 解約期限・次回請求</h2>
        <p className="mt-3">
          次回更新を希望しない場合は、次回更新日前までに解約手続きを完了してください。
          次回更新日は「プラン・請求」画面またはStripe Customer Portalで確認できます。
          更新処理後に解約した場合、次の請求期間分が課金される場合があります。
        </p>
      </section>

      <section>
        <h2>4. 解約後の利用可能期間</h2>
        <p className="mt-3">
          期間終了時の解約を選択した場合、原則として現在の支払済み請求期間の終了まで
          有料機能を利用できます。終了後は無料プランの上限が適用されます。
          Customer Portalまたは申込画面に別の条件が明示されている場合は、その表示を優先します。
        </p>
      </section>

      <section>
        <h2>5. 利用者都合の返金</h2>
        <p className="mt-3">
          デジタルサービスの性質上、利用者都合による解約、利用しなかった期間、
          プランの選択間違い等について、支払済み料金の日割り計算や返金は原則として行いません。
          次回請求を希望しない場合は、更新日前に解約手続きを完了してください。
        </p>
      </section>

      <section>
        <h2>6. 重複決済・請求誤り・システム不具合</h2>
        <p className="mt-3">
          重複決済、請求金額の誤り、当方のシステム不具合により
          有料サービスを実質的に利用できなかった場合その他当方に原因がある場合は、
          決済日、金額、アカウントおよび障害状況を確認のうえ、
          返金、請求取消し、利用期間延長その他適切な方法で個別に対応します。
        </p>
      </section>

      <section>
        <h2>7. 返金方法・時期</h2>
        <p className="mt-3">
          返金を行う場合は、原則としてStripeを通じて元の決済方法へ返金します。
          当方で返金処理を行った後、実際に利用明細へ反映される時期は
          カード会社その他の決済事業者により異なります。
        </p>
      </section>

      <section>
        <h2>8. 法令上の権利</h2>
        <p className="mt-3">
          本ポリシーは、消費者契約法その他の法令により利用者に認められる権利を
          不当に制限するものではありません。
        </p>
      </section>

      <section>
        <h2>9. 問い合わせ先</h2>
        <p className="mt-3">
          課金・解約・返金に関する問い合わせ先：
          <span className="font-semibold text-amber-800">
            {LEGAL_BUSINESS_INFO.inquiryEmail}
          </span>
          <br />
          対応時間：
          <span className="font-semibold text-amber-800">
            {LEGAL_BUSINESS_INFO.inquiryResponseTime}
          </span>
          <br />
          カード番号、セキュリティコード、パスワード等の機密情報は送信しないでください。
        </p>
      </section>
    </LegalPageLayout>
  );
}
