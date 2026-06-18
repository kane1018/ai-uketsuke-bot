import OpenAI from "openai";
import { generatedPlanSchema } from "@/lib/validations";
import { purposeLabel, industryLabel } from "@/lib/constants";
import type { GeneratedBotPlan } from "@/lib/types";

export const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  return new OpenAI({ apiKey });
}

export interface GenerateInput {
  name: string;
  purpose: string;
  industry: string;
  company_name: string;
  service_description: string;
  intake_goal: string;
  final_cta: string;
}

const SYSTEM_PROMPT = `あなたは、日本の中小企業・士業・不動産・採用/人材会社向けの「チャット形式の受付フォーム」を設計する専門家です。

ユーザーが入力した「目的」「業種」「会社情報」をもとに、訪問者に1問ずつ提示するチャット形式の質問フローを設計してください。

重要な制約:
- これはAIが自由に会話するチャットボットではありません。事前に質問を設計し、訪問者が1問ずつ回答していく「チャット形式の受付フォーム」です。
- 質問は3〜8問程度。多すぎないようにしてください。
- 連絡先（氏名・メール・電話番号のうち目的に合うもの）を必ず含めてください。氏名は text、メールは email、電話番号は phone を使ってください。
- 各質問の question_type は次のいずれか: "text"（短文） / "textarea"（長文） / "single"（単一選択） / "multiple"（複数選択） / "email" / "phone" / "date"
- "single" と "multiple" のときだけ options に選択肢（2〜6個）を入れてください。それ以外は options を空配列 [] にしてください。
- sort_order は 1 から始まる連番にしてください。
- opening_message は最初の挨拶、completion_message は回答完了時のお礼、cta_message は最後の誘導文（最終CTA）です。
- すべて自然で丁寧な日本語にしてください。専門用語は避け、初めての訪問者でも答えやすい文章にしてください。

出力は必ず次のJSON形式のみで返してください（前後に説明文やマークダウンを付けないでください）:
{
  "bot_title": "string",
  "bot_description": "string",
  "opening_message": "string",
  "questions": [
    { "question_text": "string", "question_type": "text", "options": [], "is_required": true, "sort_order": 1 }
  ],
  "completion_message": "string",
  "cta_message": "string"
}`;

export function buildUserPrompt(input: GenerateInput): string {
  return [
    `目的: ${purposeLabel(input.purpose)}`,
    `業種: ${industryLabel(input.industry)}`,
    `Bot名: ${input.name || "（未入力）"}`,
    `会社名: ${input.company_name || "（未入力）"}`,
    `サービス説明: ${input.service_description || "（未入力）"}`,
    `受付したい内容: ${input.intake_goal || "（未入力）"}`,
    `最終誘導（CTA）: ${input.final_cta || "（未入力）"}`,
    "",
    "上記をもとに、チャット形式の受付フォームの質問フローを設計し、指定のJSON形式のみで出力してください。",
  ].join("\n");
}

export class AIGenerationError extends Error {
  raw?: string;
  constructor(message: string, raw?: string) {
    super(message);
    this.name = "AIGenerationError";
    this.raw = raw;
  }
}

export interface GenerateResult {
  plan: GeneratedBotPlan;
  prompt: string;
  rawResult: string;
  model: string;
  tokenUsage: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  } | null;
}

export async function generateBotPlan(
  input: GenerateInput
): Promise<GenerateResult> {
  const client = getClient();
  const userPrompt = buildUserPrompt(input);

  // Call the API. Convert any API/network failure into a clean, typed error
  // with a user-facing message (so the route can return it as-is).
  let completion;
  try {
    completion = await client.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });
  } catch (err) {
    const status =
      err instanceof OpenAI.APIError ? err.status : undefined;
    let message = "AIの生成に失敗しました。時間をおいて再度お試しください。";
    if (status === 401)
      message =
        "OpenAI APIキーが無効です。サーバーの設定を確認してください。";
    else if (status === 429)
      message =
        "AIの利用が混み合っています。少し時間をおいて再度お試しください。";
    throw new AIGenerationError(
      message,
      err instanceof Error ? err.message : String(err)
    );
  }

  const rawResult = completion.choices[0]?.message?.content ?? "";

  if (!rawResult.trim()) {
    throw new AIGenerationError("AIから空の応答が返されました", rawResult);
  }

  // Parse + validate. Any failure becomes a clean, typed error.
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawResult);
  } catch {
    throw new AIGenerationError(
      "AIの応答をJSONとして解釈できませんでした。もう一度お試しください。",
      rawResult
    );
  }

  const validated = generatedPlanSchema.safeParse(parsed);
  if (!validated.success) {
    throw new AIGenerationError(
      "AIの応答が想定した形式ではありませんでした。もう一度お試しください。",
      rawResult
    );
  }

  // Normalize: clear options for non-choice types, re-number sort_order.
  const plan: GeneratedBotPlan = {
    ...validated.data,
    questions: validated.data.questions.map((q, i) => ({
      ...q,
      options:
        q.question_type === "single" || q.question_type === "multiple"
          ? q.options.filter((o) => o.trim().length > 0)
          : [],
      sort_order: i + 1,
    })),
  };

  return {
    plan,
    prompt: userPrompt,
    rawResult,
    model: OPENAI_MODEL,
    tokenUsage: completion.usage
      ? {
          prompt_tokens: completion.usage.prompt_tokens,
          completion_tokens: completion.usage.completion_tokens,
          total_tokens: completion.usage.total_tokens,
        }
      : null,
  };
}
