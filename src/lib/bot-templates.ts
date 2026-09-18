import type { QuestionType } from "@/lib/types";
import { industryLabel, purposeLabel } from "@/lib/constants";

export interface TemplateQuestion {
  question_text: string;
  question_type: QuestionType;
  options: string[];
  is_required: boolean;
  sort_order: number;
}

export interface BotTemplatePlan {
  opening_message: string;
  questions: TemplateQuestion[];
  completion_message: string;
  cta_message: string;
}

export interface BotTemplateInput {
  purpose: string;
  industry: string;
  company_name?: string;
  service_description?: string;
  intake_goal?: string;
  final_cta?: string;
}

type QuestionSeed = Omit<TemplateQuestion, "sort_order">;

function q(
  question_text: string,
  question_type: QuestionType,
  options: string[] = [],
  is_required = true
): QuestionSeed {
  return { question_text, question_type, options, is_required };
}
const PURPOSE_QUESTIONS: Record<string, QuestionSeed[]> = {
  inquiry: [
    q("お問い合わせ内容を教えてください。", "textarea"),
    q("ご希望の連絡方法を選んでください。", "single", ["メール", "電話", "どちらでも可"]),
  ],
  consultation: [
    q("ご相談内容を教えてください。", "textarea"),
    q("ご相談の希望時期を教えてください。", "single", [
      "できるだけ早く",
      "1週間以内",
      "1か月以内",
      "特に決まっていない",
    ]),
  ],
  lead: [
    q("ご興味のあるサービス・内容を教えてください。", "textarea"),
    q("導入・利用を検討している時期を教えてください。", "single", [
      "すぐに",
      "1か月以内",
      "3か月以内",
      "情報収集中",
    ]),
  ],
  diagnosis: [
    q("現在の状況やご希望を教えてください。", "textarea"),
    q("特に重視する点を教えてください。", "textarea", [], false),
  ],
  recruit: [
    q("希望する職種・働き方を教えてください。", "text"),
    q("これまでのご経験やスキルを簡単に教えてください。", "textarea", [], false),
    q("面談・連絡を希望する時期を教えてください。", "single", [
      "できるだけ早く",
      "1週間以内",
      "1か月以内",
      "特に決まっていない",
    ]),
  ],
};

const INDUSTRY_QUESTIONS: Record<string, QuestionSeed> = {
  professional: q("ご相談の分野を選んでください。", "single", [
    "手続きについて",
    "必要書類について",
    "費用について",
    "その他",
  ]),
  realestate: q("お問い合わせの種類を選んでください。", "single", [
    "購入",
    "売却",
    "賃貸",
    "管理",
    "その他",
  ]),
  recruiting: q("お問い合わせの種類を選んでください。", "single", [
    "仕事を探している",
    "人材を探している",
    "採用について相談したい",
    "その他",
  ]),
  other: q("お問い合わせの種類を選んでください。", "single", [
    "サービスについて",
    "料金について",
    "予約・日程について",
    "その他",
  ]),
};

const CONTACT_QUESTIONS: QuestionSeed[] = [
  q("お名前を教えてください。", "text"),
  q("メールアドレスを教えてください。", "email"),
  q("電話番号を教えてください。", "phone", [], false),
];

export function buildBotTemplate(input: BotTemplateInput): BotTemplatePlan {
  const company = input.company_name?.trim();
  const purpose = purposeLabel(input.purpose);
  const industry = industryLabel(input.industry);
  const purposeQuestions = PURPOSE_QUESTIONS[input.purpose] ?? PURPOSE_QUESTIONS.inquiry;
  const industryQuestion = INDUSTRY_QUESTIONS[input.industry] ?? INDUSTRY_QUESTIONS.other;
  const seeds: QuestionSeed[] = [
    CONTACT_QUESTIONS[0],
    industryQuestion,
    ...purposeQuestions,
    CONTACT_QUESTIONS[1],
    CONTACT_QUESTIONS[2],
  ];

  const unique = seeds.filter(
    (item, index, all) =>
      all.findIndex(
        (candidate) =>
          candidate.question_text === item.question_text &&
          candidate.question_type === item.question_type
      ) === index
  );

  const questions = unique.map((item, index) => ({
    ...item,
    options: [...item.options],
    sort_order: index + 1,
  }));

  const subject = company ? `${company}の` : "";
  const detail = input.intake_goal?.trim() || input.service_description?.trim();
  const opening_message = detail
    ? `${subject}${purpose}です。${detail}について、いくつか確認させてください。`
    : `${subject}${purpose}です。${industry}向けの受付項目に沿って、いくつか確認させてください。`;

  return {
    opening_message,
    questions,
    completion_message: "ご回答ありがとうございました。内容を確認のうえ、担当者よりご連絡します。",
    cta_message:
      input.final_cta?.trim() ||
      "担当者より順次ご連絡します。しばらくお待ちください。",
  };
}
