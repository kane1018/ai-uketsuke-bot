import type { BotQuestion, ResponseAnswer } from "./types";

export interface ChatState {
  phase: "question" | "review" | "sending" | "complete" | "empty";
  index: number;
  editing: boolean;
  revision: number;
  values: Record<string, ResponseAnswer["value"]>;
  answered: string[];
  error: string | null;
}

export type ChatAction =
  | { type: "change"; value: ResponseAnswer["value"] }
  | { type: "next" | "back" | "confirm" | "success" | "restart" }
  | { type: "edit"; index: number }
  | { type: "failure"; error: string };

type Validator = (question: BotQuestion, value: ResponseAnswer["value"]) => string | null;

export function initialChatState(count: number): ChatState {
  return { phase: count ? "question" : "empty", index: 0, editing: false,
    revision: 0, values: {}, answered: [], error: null };
}

export function chatValue(state: ChatState, question: BotQuestion): ResponseAnswer["value"] {
  return state.values[question.id] ?? (question.question_type === "multiple" ? [] : "");
}

export function chatAnswers(state: ChatState, questions: BotQuestion[]): ResponseAnswer[] {
  return questions.map((q) => ({ question_id: q.id, question_text: q.question_text,
    question_type: q.question_type, value: chatValue(state, q) }));
}

// Revision checks reject events from a previous screen and duplicate transitions.
// Validation is injected so the browser and Node tests use the same server rules.
export function transitionChat(
  state: ChatState, action: ChatAction, revision: number,
  questions: BotQuestion[], validate: Validator, preview: boolean
): ChatState {
  if (revision !== state.revision) return state;
  const move = (patch: Partial<ChatState>): ChatState =>
    ({ ...state, error: null, ...patch, revision: state.revision + 1 });
  if (action.type === "restart") {
    return preview && state.phase !== "sending"
      ? { ...initialChatState(questions.length), revision: state.revision + 1 } : state;
  }
  if (state.phase === "sending") {
    if (action.type === "success") return move({ phase: "complete" });
    if (action.type === "failure") return move({ phase: "review", error: action.error });
    return state;
  }
  if (state.phase === "review") {
    if (action.type === "edit" && questions[action.index]) {
      return move({ phase: "question", index: action.index, editing: true });
    }
    if (action.type === "confirm") {
      for (const [index, question] of questions.entries()) {
        const error = validate(question, chatValue(state, question));
        if (error) return move({ phase: "question", index, editing: true, error });
      }
      return move({ phase: preview ? "complete" : "sending" });
    }
    return state;
  }
  const question = questions[state.index];
  if (state.phase !== "question" || !question) return state;
  if (action.type === "change") {
    return { ...state, error: null, values: { ...state.values, [question.id]: action.value } };
  }
  if (action.type === "back") {
    if (state.editing) return move({ phase: "review", editing: false });
    return state.index > 0 ? move({ index: state.index - 1 }) : state;
  }
  if (action.type !== "next") return state;
  const raw = chatValue(state, question);
  const value = typeof raw === "string" ? raw.trim() : raw;
  const error = validate(question, value);
  if (error) return { ...state, error };
  return move({
    values: { ...state.values, [question.id]: value },
    answered: state.answered.includes(question.id) ? state.answered : [...state.answered, question.id],
    phase: state.editing || state.index === questions.length - 1 ? "review" : "question",
    index: state.editing ? state.index : Math.min(state.index + 1, questions.length - 1),
    editing: false,
  });
}
