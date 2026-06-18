// Shared domain types for the AI Chatbot Builder.

export type BotStatus = "draft" | "published" | "archived";

export type ResponseStatus = "new" | "contacted" | "closed";

export type QuestionType =
  | "text"
  | "textarea"
  | "single"
  | "multiple"
  | "email"
  | "phone"
  | "date";

export interface Profile {
  id: string;
  email: string | null;
  name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Bot {
  id: string;
  user_id: string;
  name: string;
  purpose: string;
  industry: string;
  company_name: string;
  service_description: string;
  intake_goal: string;
  final_cta: string;
  notification_email: string;
  opening_message: string;
  completion_message: string;
  cta_message: string;
  status: BotStatus;
  public_slug: string;
  created_at: string;
  updated_at: string;
}

export interface BotQuestion {
  id: string;
  bot_id: string;
  question_text: string;
  question_type: QuestionType;
  options: string[];
  is_required: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// A single answer captured from a public chat session.
export interface ResponseAnswer {
  question_id: string | null;
  question_text: string;
  question_type: QuestionType;
  value: string | string[];
}

export interface BotResponse {
  id: string;
  bot_id: string;
  respondent_name: string | null;
  respondent_email: string | null;
  respondent_phone: string | null;
  answers: ResponseAnswer[];
  status: ResponseStatus;
  created_at: string;
}

// Shape the AI must return (also see lib/validations.ts).
export interface GeneratedQuestion {
  question_text: string;
  question_type: QuestionType;
  options: string[];
  is_required: boolean;
  sort_order: number;
}

export interface GeneratedBotPlan {
  bot_title: string;
  bot_description: string;
  opening_message: string;
  questions: GeneratedQuestion[];
  completion_message: string;
  cta_message: string;
}
