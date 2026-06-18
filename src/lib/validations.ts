import { z } from "zod";
import { PURPOSES, INDUSTRIES } from "@/lib/constants";

const purposeValues = PURPOSES.map((p) => p.value) as [string, ...string[]];
const industryValues = INDUSTRIES.map((i) => i.value) as [string, ...string[]];

export const questionTypeSchema = z.enum([
  "text",
  "textarea",
  "single",
  "multiple",
  "email",
  "phone",
  "date",
]);

// ---------------------------------------------------------------------
// Bot basic-info form (creation wizard step 3 + edits)
// ---------------------------------------------------------------------
export const botBasicInfoSchema = z.object({
  name: z.string().trim().min(1, "Bot名を入力してください").max(100),
  purpose: z.enum(purposeValues, {
    errorMap: () => ({ message: "目的を選択してください" }),
  }),
  industry: z.enum(industryValues, {
    errorMap: () => ({ message: "業種を選択してください" }),
  }),
  company_name: z.string().trim().max(100).optional().default(""),
  service_description: z.string().trim().max(2000).optional().default(""),
  intake_goal: z.string().trim().max(2000).optional().default(""),
  final_cta: z.string().trim().max(1000).optional().default(""),
  notification_email: z
    .string()
    .trim()
    .email("正しいメールアドレスを入力してください")
    .max(254),
});

export type BotBasicInfoInput = z.infer<typeof botBasicInfoSchema>;

// ---------------------------------------------------------------------
// Questions (editor save)
// ---------------------------------------------------------------------
export const questionSchema = z
  .object({
    question_text: z.string().trim().min(1, "質問文を入力してください").max(500),
    question_type: questionTypeSchema,
    options: z.array(z.string().trim().max(200)).max(20).default([]),
    is_required: z.boolean().default(true),
    sort_order: z.number().int().min(0),
  })
  .superRefine((q, ctx) => {
    if (
      (q.question_type === "single" || q.question_type === "multiple") &&
      q.options.filter((o) => o.length > 0).length < 1
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "選択肢を1つ以上入力してください",
        path: ["options"],
      });
    }
  });

export const questionsSaveSchema = z.object({
  questions: z.array(questionSchema).max(50),
  opening_message: z.string().trim().max(1000).optional(),
  completion_message: z.string().trim().max(1000).optional(),
  cta_message: z.string().trim().max(1000).optional(),
});

// ---------------------------------------------------------------------
// AI generation request
// ---------------------------------------------------------------------
export const generateSchema = z.object({
  bot_id: z.string().uuid(),
});

// ---------------------------------------------------------------------
// AI output (what the model must return)
// ---------------------------------------------------------------------
export const generatedQuestionSchema = z.object({
  question_text: z.string().min(1).max(500),
  question_type: questionTypeSchema.catch("text"),
  options: z.array(z.string()).default([]),
  is_required: z.boolean().default(true),
  sort_order: z.number().int().default(0),
});

export const generatedPlanSchema = z.object({
  bot_title: z.string().default(""),
  bot_description: z.string().default(""),
  opening_message: z.string().default(""),
  questions: z.array(generatedQuestionSchema).min(1).max(30),
  completion_message: z.string().default(""),
  cta_message: z.string().default(""),
});

// ---------------------------------------------------------------------
// Public response submission
// ---------------------------------------------------------------------
export const publicAnswerSchema = z.object({
  question_id: z.string().uuid().nullable(),
  question_text: z.string().max(500),
  question_type: questionTypeSchema,
  // value is either a string (most types) or string[] (multiple)
  value: z.union([z.string().max(5000), z.array(z.string().max(2000)).max(50)]),
});

export const publicResponseSchema = z.object({
  slug: z.string().min(1).max(100),
  respondent_name: z.string().trim().max(100).nullable().optional(),
  respondent_email: z
    .string()
    .trim()
    .email()
    .max(254)
    .nullable()
    .optional()
    .or(z.literal("")),
  respondent_phone: z.string().trim().max(40).nullable().optional(),
  answers: z.array(publicAnswerSchema).max(50),
});

export type PublicResponseInput = z.infer<typeof publicResponseSchema>;

// ---------------------------------------------------------------------
// Response status update
// ---------------------------------------------------------------------
export const responseStatusUpdateSchema = z.object({
  status: z.enum(["new", "contacted", "closed"]),
});

// ---------------------------------------------------------------------
// Bot status update (publish / archive)
// ---------------------------------------------------------------------
export const botStatusUpdateSchema = z.object({
  status: z.enum(["draft", "published", "archived"]),
});

// ---------------------------------------------------------------------
// Auth forms
// ---------------------------------------------------------------------
export const signupSchema = z.object({
  name: z.string().trim().min(1, "お名前を入力してください").max(100),
  email: z.string().trim().email("正しいメールアドレスを入力してください"),
  password: z.string().min(8, "パスワードは8文字以上で入力してください").max(72),
});

export const loginSchema = z.object({
  email: z.string().trim().email("正しいメールアドレスを入力してください"),
  password: z.string().min(1, "パスワードを入力してください"),
});
