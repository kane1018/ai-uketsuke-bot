export const USE_CASES = [
  {
    slug: "professional", name: "士業の相談受付", audience: "行政書士・税理士・社労士など", purpose: "consultation", industry: "professional",
    title: "相談の概要が、最初の問い合わせでわかる。",
    description: "相談分野・内容・希望時期・連絡先を順に聞き、初回相談に向けた情報を整理する受付フォーム。電話やメールで何度も聞き直す前の事前ヒアリングに。",
    problem: "『相談したいです』だけのメールでは、どの手続きの相談か、いつまでに必要かが分かりません。最初に聞く項目を決めておくと、担当者が内容を見てから返信できます。",
    examples: ["相談の分野（手続き・書類・費用など）", "相談したい内容", "相談の希望時期", "お名前・メールアドレス"],
    setup: "事務所の相談案内ページやメール署名に公開URLを置きます。ホームページへの埋め込みを選ぶこともできます。質問編集では『期限のある手続きですか』など事務所で必要な項目に変更してください。",
    caution: "法律相談への自動回答や案件の受任判断は行いません。マイナンバー、身分証明書、詳細な機微情報を最初の受付で集める用途は避け、別の適切な手段をご案内ください。",
    benefit: "相談前の聞き直しを減らすための、最初の受付に。",
  },
  {
    slug: "realestate", name: "不動産の問い合わせ受付", audience: "売買・賃貸・管理の不動産事業者", purpose: "inquiry", industry: "realestate",
    title: "物件の問い合わせを、必要な条件と一緒に。",
    description: "購入・売却・賃貸などの問い合わせ種別と相談内容、連絡方法をまとめて受け付ける会話形式のフォーム。物件紹介前の条件確認にも使えます。",
    problem: "物件への問い合わせ後、予算や希望エリア、入居時期を一つずつ聞き直していませんか。受付時点で必要な質問を並べておくと、担当者が連絡する前に希望を把握できます。",
    examples: ["問い合わせの種類（購入・売却・賃貸など）", "希望する条件や問い合わせ内容", "希望する連絡方法", "お名前・連絡先"],
    setup: "物件紹介ページの問い合わせボタンやSNSプロフィールから公開URLへ案内します。質問編集で予算・エリア・入居希望時期を追加できます。まずは項目を増やしすぎず、返信に必要なものに絞ってください。",
    caution: "物件検索、空室確認、内見日時の自動確定はしません。受付後に担当者が確認する流れです。広告に記載する物件情報や個人情報の利用目的は、運営者自身で確認してください。",
    benefit: "担当者が連絡する前に、希望条件を把握。",
  },
  {
    slug: "recruiting", name: "採用・応募の受付", audience: "採用担当者・人材サービス事業者", purpose: "recruit", industry: "recruiting",
    title: "応募者の希望を、面談の前に揃える。",
    description: "希望する職種・働き方・経験・連絡先などを順番に聞ける応募受付フォーム。SNSや採用ページから、スマートフォンでも入力しやすい入口を作れます。",
    problem: "SNSやメールからの応募は、希望職種や連絡可能な時期が抜けやすくなります。共通の受付項目を用意し、面談に必要な情報を先に確認する用途に向いています。",
    examples: ["希望する職種・働き方", "経験やスキル（任意）", "面談・連絡の希望時期", "お名前・メールアドレス"],
    setup: "採用ページや募集投稿に受付URLを掲載します。応募者の負担にならないよう、最初の質問は少なめに。入力が必須か任意かを質問ごとに設定し、詳しい経歴は面談で確認する構成にもできます。",
    caution: "履歴書のファイル添付、応募者の自動評価、面談予約の自動確定はありません。公正な採用に関係しない情報や不要な機微情報は収集しない質問設計にしてください。",
    benefit: "面談につながる最初の情報を、迷わず入力。",
  },
] as const;

export function getUseCase(slug: string) { return USE_CASES.find((item) => item.slug === slug); }
export function createPath(purpose: string, industry: string) {
  return `/dashboard/bots/new?purpose=${encodeURIComponent(purpose)}&industry=${encodeURIComponent(industry)}`;
}
export function signupPath(purpose?: string, industry?: string) {
  const next = purpose && industry ? createPath(purpose, industry) : "/dashboard/bots/new";
  return `/signup?next=${encodeURIComponent(next)}`;
}
