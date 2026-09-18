import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/LegalPageLayout";
import {
  LEGAL_BUSINESS_INFO,
  PRIVACY_PRIVATE_ADDRESS_DISCLOSURE,
} from "@/lib/legal-info";

export const metadata: Metadata = { title: "プライバシーポリシー | AI受付Bot" };

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      title="プライバシーポリシー"
      description="本サービスにおける個人情報その他の利用者情報の取扱いについて説明します。"
    >
      <section>
        <h2>1. 個人情報取扱事業者</h2>
        <dl className="mt-3 space-y-2">
          <div>
            <dt className="font-semibold">事業者名</dt>
            <dd className="font-semibold text-amber-800">{LEGAL_BUSINESS_INFO.businessName}</dd>
          </div>
          <div>
            <dt className="font-semibold">所在地</dt>
            <dd className="font-semibold text-amber-800">
              {PRIVACY_PRIVATE_ADDRESS_DISCLOSURE}
            </dd>
          </div>
          <div>
            <dt className="font-semibold">代表者・運営責任者</dt>
            <dd className="font-semibold text-amber-800">
              {LEGAL_BUSINESS_INFO.representativeName}
            </dd>
          </div>
        </dl>
      </section>

      <section>
        <h2>2. 取得する情報</h2>
        <ul>
          <li>氏名、メールアドレスその他アカウント登録情報</li>
          <li>作成したBot、質問、通知先等のサービス利用情報</li>
          <li>
            公開Botへの回答として入力される氏名、連絡先、自由記述その他
            Bot運営者が設定した質問への回答
          </li>
          <li>
            契約プラン、決済状態、Customer ID等の決済関連情報
            （カード番号そのものはStripeが管理します）
          </li>
          <li>IPアドレス、端末・ブラウザ情報、Cookie、アクセスログ、障害ログ</li>
          <li>問い合わせ時に利用者から提供される情報</li>
        </ul>
      </section>

      <section>
        <h2>3. 利用目的</h2>
        <ul>
          <li>本人確認、アカウント管理、本サービスの提供</li>
          <li>Botの生成・公開、回答の保存・Bot運営者への提供・通知、利用上限の管理</li>
          <li>料金請求、契約管理、解約・返金対応</li>
          <li>不正利用の防止、セキュリティ確保、障害対応</li>
          <li>サービスの品質改善、利用状況の分析</li>
          <li>重要なお知らせ、問い合わせ対応、法令上必要な対応</li>
        </ul>
      </section>

      <section>
        <h2>4. 第三者提供・委託</h2>
        <p className="mt-3">
          公開Botへ入力された回答は、そのBotを作成・運営する利用者（Bot運営者）が
          受付内容を確認・対応するために保存され、当該Bot運営者へ提供されます。
          Bot運営者が定める利用目的やその後の取扱いについては、
          当該Bot運営者の案内もあわせてご確認ください。
        </p>
        <p className="mt-3">
          上記の受付機能による提供、法令に基づく場合、生命・身体・財産の保護に必要な場合
          その他法令で認められる場合を除き、本人の同意なく個人データを第三者へ提供しません。
          本サービスの提供に必要な範囲で個人データの取扱いを外部事業者へ委託する場合は、
          委託先の選定、契約その他の方法により必要かつ適切な監督を行います。
        </p>
      </section>

      <section>
        <h2>5. 利用する外部サービス・国外での取扱い</h2>
        <ul>
          <li>Supabase：認証、データベース、関連するバックエンド機能</li>
          <li>Stripe：決済、請求、Customer Portal</li>
          <li>Resend：メール通知</li>
          <li>OpenAI API：質問・文章等のAI生成</li>
          <li>Vercel：アプリケーションのホスティング、配信、ログ管理</li>
        </ul>
        <p className="mt-3">
          これらの外部サービスの提供者またはデータの保存・処理環境が日本国外に所在する場合があります。
          国外で個人データを取り扱う場合は、適用される法令に従い、
          当該国・地域の個人情報保護制度等を把握したうえで必要な安全管理措置を講じます。
          具体的な国・地域および安全管理措置の概要について確認を希望する場合は、
          下記問い合わせ先へご連絡ください。
        </p>
        <p className="mt-3">
          AI生成に不要な個人情報、要配慮個人情報、パスワードその他の秘密情報を
          プロンプトや自由記述欄へ入力しないでください。
        </p>
      </section>

      <section>
        <h2>6. Cookie等</h2>
        <p className="mt-3">
          ログイン状態の維持、セキュリティ、基本機能の提供のためCookieまたは同様の技術を使用します。
          ブラウザでCookieを無効にすると、一部機能を利用できない場合があります。
        </p>
      </section>

      <section>
        <h2>7. 安全管理措置</h2>
        <p className="mt-3">
          本サービスでは、個人データの性質とリスクに応じ、
          次の技術的・運用上の安全管理を行います。
        </p>
        <ul>
          <li>認証およびアクセス制御により、管理画面・保存データへのアクセスを制限すること</li>
          <li>データベースの行レベル権限制御等により、利用者間のデータアクセスを分離すること</li>
          <li>管理権限を持つ秘密情報をブラウザへ公開せず、サーバー側で管理すること</li>
          <li>通信経路にHTTPSを使用し、送受信時の情報を保護すること</li>
          <li>外部サービスについて、提供条件・セキュリティ・取扱地域等を確認し、必要な監督を行うこと</li>
        </ul>
        <p className="mt-3">
          組織的・人的・物理的な安全管理についても、事業規模と取扱状況に応じた
          運用ルールを整備し、継続的に見直します。
          セキュリティ上の支障がない範囲で、より具体的な安全管理措置の概要について
          本人からの問い合わせに応じます。
        </p>
      </section>

      <section>
        <h2>8. 保存期間・削除</h2>
        <p className="mt-3">
          取得した情報は、利用目的の達成に必要な期間、契約の履行に必要な期間、
          法令上保存が必要な期間または不正利用・紛争対応のため合理的に必要な期間保持します。
          保持する必要がなくなった情報は、法令および運用上必要な範囲を除き、
          適切な方法で削除または匿名化します。バックアップ等には一定期間残存する場合があります。
        </p>
      </section>

      <section>
        <h2>9. 開示・訂正・利用停止等の請求</h2>
        <p className="mt-3">
          本人は、法令に基づき、保有個人データの利用目的の通知、開示、
          第三者提供記録の開示、訂正・追加・削除、利用停止・消去、
          第三者提供の停止等を請求できます。
        </p>
        <p className="mt-3">
          請求は下記問い合わせ先へ、対象アカウントを特定できる情報と希望する手続を記載してご連絡ください。
          本人または正当な代理人であることを確認したうえで、
          法令上開示等を行わないことが認められる場合を除き、合理的な期間内に対応します。
          開示方法は、本人が指定する電磁的方法その他法令上認められる方法を基本とします。
          手数料を定める必要がある場合は、請求手続の前にその金額を案内します。
        </p>
      </section>

      <section>
        <h2>10. 問い合わせ・苦情の申出先</h2>
        <p className="mt-3">
          個人情報に関する問い合わせ・苦情・開示等の請求：
          <span className="font-semibold text-amber-800">
            {LEGAL_BUSINESS_INFO.inquiryEmail}
          </span>
          <br />
          対応時間：
          <span className="font-semibold text-amber-800">
            {LEGAL_BUSINESS_INFO.inquiryResponseTime}
          </span>
        </p>
      </section>

      <section>
        <h2>11. 改定</h2>
        <p className="mt-3">
          法令やサービス内容の変更に応じて本ポリシーを改定します。
          重要な変更は、本サービス上その他適切な方法で、
          効力発生日および変更内容を事前に案内するよう努めます。
        </p>
      </section>
    </LegalPageLayout>
  );
}
