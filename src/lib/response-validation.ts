import type { BotQuestion, ResponseAnswer } from "@/lib/types";

type QuestionForValidation = Pick<
  BotQuestion,
  "id" | "question_text" | "question_type" | "options" | "is_required"
>;

export function validateResponseValue(
  question: QuestionForValidation,
  value: ResponseAnswer["value"]
): string | null {
  const empty = Array.isArray(value) ? value.length === 0 : value.trim() === "";
  if (question.is_required && empty) return `「${question.question_text}」は必須です`;
  if (empty) return null;

  switch (question.question_type) {
    case "multiple": {
      if (!Array.isArray(value)) return `「${question.question_text}」の回答形式が不正です`;
      if (value.some((item) => !question.options.includes(item))) {
        return `「${question.question_text}」に無効な選択肢が含まれています`;
      }
      return null;
    }
    case "single": {
      if (Array.isArray(value) || !question.options.includes(value)) {
        return `「${question.question_text}」の選択肢が不正です`;
      }
      return null;
    }
    case "email":
      if (Array.isArray(value) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return `「${question.question_text}」に正しいメールアドレスを入力してください`;
      }
      return null;
    case "phone":
      if (Array.isArray(value) || !/^[0-9+\-() ]{8,20}$/.test(value)) {
        return `「${question.question_text}」に正しい電話番号を入力してください`;
      }
      return null;
    case "date": {
      if (Array.isArray(value) || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return `「${question.question_text}」の日付が不正です`;
      }
      const date = new Date(`${value}T00:00:00Z`);
      if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
        return `「${question.question_text}」の日付が不正です`;
      }
      return null;
    }
    case "text":
    case "textarea":
      return Array.isArray(value) ? `「${question.question_text}」の回答形式が不正です` : null;
  }
}
