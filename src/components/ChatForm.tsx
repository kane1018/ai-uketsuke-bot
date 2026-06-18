"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { BotQuestion, ResponseAnswer } from "@/lib/types";

interface ChatMessage {
  id: string;
  role: "bot" | "user";
  text: string;
}

export interface ChatFormProps {
  slug: string;
  botName: string;
  openingMessage: string;
  completionMessage: string;
  ctaMessage: string;
  questions: BotQuestion[];
  showBranding?: boolean;
  /** Preview mode: answers are NOT submitted to the server. */
  preview?: boolean;
}

const DEFAULT_OPENING = "こんにちは！いくつか質問にお答えください。";
const DEFAULT_COMPLETION = "ご回答ありがとうございました！";

export function ChatForm({
  slug,
  botName,
  openingMessage,
  completionMessage,
  ctaMessage,
  questions,
  showBranding = false,
  preview = false,
}: ChatFormProps) {
  const sorted = useMemo(
    () => [...questions].sort((a, b) => a.sort_order - b.sort_order),
    [questions]
  );

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<ResponseAnswer[]>([]);
  const [finished, setFinished] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Draft input state for the current question.
  const [textValue, setTextValue] = useState("");
  const [multiValue, setMultiValue] = useState<string[]>([]);
  const [inputError, setInputError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  const currentQuestion: BotQuestion | undefined = sorted[currentIndex];

  // Seed the conversation with the opening message + first question.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const initial: ChatMessage[] = [
      { id: "opening", role: "bot", text: openingMessage || DEFAULT_OPENING },
    ];
    if (sorted[0]) {
      initial.push({
        id: `q-${sorted[0].id}`,
        role: "bot",
        text: sorted[0].question_text,
      });
    }
    setMessages(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, finished, submitting]);

  function resetDraft() {
    setTextValue("");
    setMultiValue([]);
    setInputError(null);
  }

  function pushUserMessage(text: string) {
    setMessages((m) => [
      ...m,
      { id: `a-${Date.now()}-${Math.random()}`, role: "user", text },
    ]);
  }

  function advance(answer: ResponseAnswer, displayText: string) {
    pushUserMessage(displayText);
    const nextAnswers = [...answers, answer];
    setAnswers(nextAnswers);
    resetDraft();

    const next = currentIndex + 1;
    if (next < sorted.length) {
      const q = sorted[next];
      setCurrentIndex(next);
      // Slight delay so it feels conversational.
      setTimeout(() => {
        setMessages((m) => [
          ...m,
          { id: `q-${q.id}`, role: "bot", text: q.question_text },
        ]);
      }, 350);
    } else {
      setCurrentIndex(next);
      finish(nextAnswers);
    }
  }

  async function finish(finalAnswers: ResponseAnswer[]) {
    if (preview) {
      showCompletion();
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          answers: finalAnswers.map((a) => ({
            question_id: a.question_id,
            question_text: a.question_text,
            question_type: a.question_type,
            value: a.value,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "送信に失敗しました");
      }
      showCompletion();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "送信に失敗しました"
      );
    } finally {
      setSubmitting(false);
    }
  }

  function showCompletion() {
    setMessages((m) => {
      const extra: ChatMessage[] = [
        {
          id: "completion",
          role: "bot",
          text: completionMessage || DEFAULT_COMPLETION,
        },
      ];
      if (ctaMessage) {
        extra.push({ id: "cta", role: "bot", text: ctaMessage });
      }
      return [...m, ...extra];
    });
    setFinished(true);
  }

  // ---- input handlers --------------------------------------------------
  function validateText(q: BotQuestion, value: string): string | null {
    const v = value.trim();
    if (q.is_required && !v) return "回答を入力してください";
    if (!v) return null;
    if (q.question_type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
      return "正しいメールアドレスを入力してください";
    if (q.question_type === "phone" && !/^[0-9+\-() ]{8,20}$/.test(v))
      return "正しい電話番号を入力してください";
    return null;
  }

  function submitText() {
    if (!currentQuestion) return;
    const err = validateText(currentQuestion, textValue);
    if (err) {
      setInputError(err);
      return;
    }
    const value = textValue.trim();
    advance(
      {
        question_id: currentQuestion.id,
        question_text: currentQuestion.question_text,
        question_type: currentQuestion.question_type,
        value,
      },
      value || "（スキップ）"
    );
  }

  function submitSingle(option: string) {
    if (!currentQuestion) return;
    advance(
      {
        question_id: currentQuestion.id,
        question_text: currentQuestion.question_text,
        question_type: currentQuestion.question_type,
        value: option,
      },
      option
    );
  }

  function toggleMulti(option: string) {
    setMultiValue((prev) =>
      prev.includes(option)
        ? prev.filter((o) => o !== option)
        : [...prev, option]
    );
  }

  function submitMulti() {
    if (!currentQuestion) return;
    if (currentQuestion.is_required && multiValue.length === 0) {
      setInputError("1つ以上選択してください");
      return;
    }
    advance(
      {
        question_id: currentQuestion.id,
        question_text: currentQuestion.question_text,
        question_type: currentQuestion.question_type,
        value: multiValue,
      },
      multiValue.length ? multiValue.join("、") : "（スキップ）"
    );
  }

  const showInput = !finished && !submitting && currentQuestion;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm text-white">
          🤖
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {botName || "受付Bot"}
          </p>
          <p className="text-[11px] text-gray-400">オンライン</p>
        </div>
        {showBranding && (
          <span className="ml-auto text-[10px] text-gray-400">Powered by AI受付Bot</span>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="chat-scroll flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m) => (
          <Bubble key={m.id} role={m.role} text={m.text} />
        ))}

        {submitting && (
          <Bubble role="bot" text="送信しています…" />
        )}

        {/* Progress indicator */}
        {!finished && sorted.length > 0 && (
          <p className="pt-1 text-center text-[11px] text-gray-400">
            {Math.min(currentIndex + 1, sorted.length)} / {sorted.length}
          </p>
        )}

        {finished && !preview && (
          <p className="pt-2 text-center text-[11px] text-gray-400">
            送信が完了しました
          </p>
        )}
        {finished && preview && (
          <p className="pt-2 text-center text-[11px] text-gray-400">
            （プレビュー：回答は保存されません）
          </p>
        )}
      </div>

      {/* Input area */}
      {showInput && (
        <div className="border-t border-gray-200 bg-white p-3">
          {inputError && (
            <p className="mb-2 text-xs text-red-600">{inputError}</p>
          )}

          {/* single */}
          {currentQuestion.question_type === "single" && (
            <div className="flex flex-wrap gap-2">
              {currentQuestion.options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => submitSingle(opt)}
                  className="rounded-full border border-brand-300 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100"
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {/* multiple */}
          {currentQuestion.question_type === "multiple" && (
            <div>
              <div className="mb-2 flex flex-wrap gap-2">
                {currentQuestion.options.map((opt) => {
                  const active = multiValue.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggleMulti(opt)}
                      className={`rounded-full border px-4 py-2 text-sm font-medium ${
                        active
                          ? "border-brand-500 bg-brand-600 text-white"
                          : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {active ? "✓ " : ""}
                      {opt}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={submitMulti}
                className="btn-primary w-full"
              >
                送信
              </button>
            </div>
          )}

          {/* textarea */}
          {currentQuestion.question_type === "textarea" && (
            <div className="space-y-2">
              <textarea
                className="input min-h-[72px]"
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                placeholder="回答を入力..."
              />
              <button
                type="button"
                onClick={submitText}
                className="btn-primary w-full"
              >
                送信
              </button>
            </div>
          )}

          {/* text / email / phone / date */}
          {["text", "email", "phone", "date"].includes(
            currentQuestion.question_type
          ) && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitText();
              }}
              className="flex gap-2"
            >
              <input
                className="input"
                type={
                  currentQuestion.question_type === "email"
                    ? "email"
                    : currentQuestion.question_type === "phone"
                    ? "tel"
                    : currentQuestion.question_type === "date"
                    ? "date"
                    : "text"
                }
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                placeholder="回答を入力..."
                autoFocus
              />
              <button type="submit" className="btn-primary shrink-0">
                送信
              </button>
            </form>
          )}

          {!currentQuestion.is_required && (
            <button
              type="button"
              onClick={() => {
                if (currentQuestion.question_type === "multiple") {
                  advance(
                    {
                      question_id: currentQuestion.id,
                      question_text: currentQuestion.question_text,
                      question_type: currentQuestion.question_type,
                      value: [],
                    },
                    "（スキップ）"
                  );
                } else {
                  advance(
                    {
                      question_id: currentQuestion.id,
                      question_text: currentQuestion.question_text,
                      question_type: currentQuestion.question_type,
                      value: "",
                    },
                    "（スキップ）"
                  );
                }
              }}
              className="mt-2 w-full text-center text-xs text-gray-400 hover:text-gray-600"
            >
              この質問をスキップ
            </button>
          )}
        </div>
      )}

      {submitError && (
        <div className="border-t border-gray-200 bg-white p-3">
          <p className="mb-2 text-sm text-red-600">{submitError}</p>
          <button
            type="button"
            onClick={() => finish(answers)}
            className="btn-primary w-full"
          >
            再送信する
          </button>
        </div>
      )}
    </div>
  );
}

function Bubble({ role, text }: { role: "bot" | "user"; text: string }) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-brand-600 px-3.5 py-2 text-sm text-white">
          {text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-bl-sm border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-800 shadow-sm">
        {text}
      </div>
    </div>
  );
}
