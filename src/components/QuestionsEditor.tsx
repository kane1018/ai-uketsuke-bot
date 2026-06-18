"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { QUESTION_TYPES, questionTypeHasOptions } from "@/lib/constants";
import { questionsSaveSchema } from "@/lib/validations";
import type { BotQuestion, QuestionType } from "@/lib/types";

interface DraftQuestion {
  key: string;
  question_text: string;
  question_type: QuestionType;
  options: string[];
  is_required: boolean;
}

let keyCounter = 0;
function newKey() {
  keyCounter += 1;
  return `q_${Date.now()}_${keyCounter}`;
}

function toDraft(q: BotQuestion): DraftQuestion {
  return {
    key: newKey(),
    question_text: q.question_text,
    question_type: q.question_type,
    options: q.options ?? [],
    is_required: q.is_required,
  };
}

interface Props {
  botId: string;
  initialQuestions: BotQuestion[];
  initialOpening: string;
  initialCompletion: string;
  initialCta: string;
}

function EditorInner(props: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const genError = searchParams.get("genError");
  const justGenerated = searchParams.get("generated") === "1";
  const initialUpgradeRequired = searchParams.get("upgrade") === "1";

  const [questions, setQuestions] = useState<DraftQuestion[]>(
    props.initialQuestions.map(toDraft)
  );
  const [opening, setOpening] = useState(props.initialOpening);
  const [completion, setCompletion] = useState(props.initialCompletion);
  const [cta, setCta] = useState(props.initialCta);

  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(genError ? { type: "error", text: genError } : null);
  const [upgradeRequired, setUpgradeRequired] = useState(initialUpgradeRequired);

  function patch(key: string, changes: Partial<DraftQuestion>) {
    setQuestions((qs) =>
      qs.map((q) => (q.key === key ? { ...q, ...changes } : q))
    );
  }

  function addQuestion() {
    setQuestions((qs) => [
      ...qs,
      {
        key: newKey(),
        question_text: "",
        question_type: "text",
        options: [],
        is_required: true,
      },
    ]);
  }

  function removeQuestion(key: string) {
    setQuestions((qs) => qs.filter((q) => q.key !== key));
  }

  function move(key: string, dir: -1 | 1) {
    setQuestions((qs) => {
      const idx = qs.findIndex((q) => q.key === key);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= qs.length) return qs;
      const copy = [...qs];
      [copy[idx], copy[target]] = [copy[target], copy[idx]];
      return copy;
    });
  }

  function setOption(key: string, optIdx: number, value: string) {
    setQuestions((qs) =>
      qs.map((q) => {
        if (q.key !== key) return q;
        const options = [...q.options];
        options[optIdx] = value;
        return { ...q, options };
      })
    );
  }

  function addOption(key: string) {
    setQuestions((qs) =>
      qs.map((q) =>
        q.key === key ? { ...q, options: [...q.options, ""] } : q
      )
    );
  }

  function removeOption(key: string, optIdx: number) {
    setQuestions((qs) =>
      qs.map((q) =>
        q.key === key
          ? { ...q, options: q.options.filter((_, i) => i !== optIdx) }
          : q
      )
    );
  }

  async function handleSave() {
    setMessage(null);

    const payload = {
      questions: questions.map((q, i) => ({
        question_text: q.question_text.trim(),
        question_type: q.question_type,
        options: questionTypeHasOptions(q.question_type)
          ? q.options.map((o) => o.trim()).filter(Boolean)
          : [],
        is_required: q.is_required,
        sort_order: i + 1,
      })),
      opening_message: opening,
      completion_message: completion,
      cta_message: cta,
    };

    const parsed = questionsSaveSchema.safeParse(payload);
    if (!parsed.success) {
      setMessage({
        type: "error",
        text: parsed.error.issues[0]?.message ?? "入力内容を確認してください",
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/bots/${props.botId}/questions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存に失敗しました");
      setMessage({ type: "success", text: "保存しました" });
      router.refresh();
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "保存に失敗しました",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleRegenerate() {
    if (
      !confirm(
        "AIで質問を作り直しますか？現在編集中の内容は上書きされます（保存するまでDBは変わりません）。"
      )
    )
      return;
    setRegenerating(true);
    setMessage(null);
    setUpgradeRequired(false);
    try {
      const res = await fetch(`/api/bots/${props.botId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) {
        setUpgradeRequired(Boolean(data.upgradeRequired));
        throw new Error(data.error || "生成に失敗しました");
      }
      const plan = data.plan;
      setQuestions(
        (plan.questions as BotQuestion[]).map((q) => ({
          key: newKey(),
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options ?? [],
          is_required: q.is_required,
        }))
      );
      setOpening(plan.opening_message ?? "");
      setCompletion(plan.completion_message ?? "");
      setCta(plan.cta_message ?? "");
      setMessage({
        type: "success",
        text: "AIで再生成しました。内容を確認して保存してください。",
      });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "生成に失敗しました",
      });
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <div className="space-y-5">
      {justGenerated && !genError && questions.length > 0 && (
        <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          ✓ AIが質問を生成しました。内容を確認・編集して保存しましょう。
        </div>
      )}
      {message && (
        <div
          className={`rounded-lg px-3 py-2 text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
          {message.type === "error" && upgradeRequired && (
            <Link href="/pricing" className="ml-2 font-semibold underline">
              プランを確認
            </Link>
          )}
        </div>
      )}

      {/* Chat copy */}
      <details className="card p-4" open>
        <summary className="cursor-pointer text-sm font-semibold">
          チャットの文言（あいさつ・完了・CTA）
        </summary>
        <div className="mt-4 space-y-3">
          <div>
            <label className="label">最初のあいさつ</label>
            <textarea
              className="input min-h-[60px]"
              value={opening}
              onChange={(e) => setOpening(e.target.value)}
              placeholder="例：こんにちは！ご相談内容をお聞かせください。"
            />
          </div>
          <div>
            <label className="label">完了メッセージ</label>
            <textarea
              className="input min-h-[60px]"
              value={completion}
              onChange={(e) => setCompletion(e.target.value)}
              placeholder="例：ご回答ありがとうございました。"
            />
          </div>
          <div>
            <label className="label">最終誘導（CTA）</label>
            <textarea
              className="input min-h-[60px]"
              value={cta}
              onChange={(e) => setCta(e.target.value)}
              placeholder="例：担当者より2営業日以内にご連絡いたします。"
            />
          </div>
        </div>
      </details>

      {/* Questions */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">質問項目（{questions.length}）</h2>
        <button
          type="button"
          onClick={handleRegenerate}
          className="btn-secondary text-sm"
          disabled={regenerating}
        >
          {regenerating ? "生成中..." : "🪄 AIで再生成"}
        </button>
      </div>

      {questions.length === 0 && (
        <div className="card px-4 py-10 text-center text-sm text-gray-500">
          質問がありません。「質問を追加」またはAI再生成で作成できます。
        </div>
      )}

      <div className="space-y-3">
        {questions.map((q, idx) => (
          <div key={q.key} className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400">
                質問 {idx + 1}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => move(q.key, -1)}
                  disabled={idx === 0}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30"
                  aria-label="上へ"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(q.key, 1)}
                  disabled={idx === questions.length - 1}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30"
                  aria-label="下へ"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeQuestion(q.key)}
                  className="rounded p-1 text-red-400 hover:bg-red-50"
                  aria-label="削除"
                >
                  🗑
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="label">質問文</label>
                <input
                  className="input"
                  value={q.question_text}
                  onChange={(e) =>
                    patch(q.key, { question_text: e.target.value })
                  }
                  placeholder="例：お名前を教えてください"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">回答形式</label>
                  <select
                    className="input"
                    value={q.question_type}
                    onChange={(e) =>
                      patch(q.key, {
                        question_type: e.target.value as QuestionType,
                      })
                    }
                  >
                    {QUESTION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-brand-600"
                      checked={q.is_required}
                      onChange={(e) =>
                        patch(q.key, { is_required: e.target.checked })
                      }
                    />
                    必須にする
                  </label>
                </div>
              </div>

              {questionTypeHasOptions(q.question_type) && (
                <div>
                  <label className="label">選択肢</label>
                  <div className="space-y-2">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex gap-2">
                        <input
                          className="input"
                          value={opt}
                          onChange={(e) => setOption(q.key, oi, e.target.value)}
                          placeholder={`選択肢 ${oi + 1}`}
                        />
                        <button
                          type="button"
                          onClick={() => removeOption(q.key, oi)}
                          className="btn-ghost shrink-0 px-2 text-red-400"
                          aria-label="選択肢を削除"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addOption(q.key)}
                      className="text-sm font-medium text-brand-600"
                    >
                      ＋ 選択肢を追加
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addQuestion}
        className="btn-secondary w-full"
      >
        ＋ 質問を追加
      </button>

      {/* Sticky save bar */}
      <div className="sticky bottom-0 -mx-4 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={`/dashboard/bots/${props.botId}/preview`}
            className="btn-ghost text-sm"
          >
            プレビューを見る →
          </Link>
          <button
            type="button"
            onClick={handleSave}
            className="btn-primary"
            disabled={saving}
          >
            {saving ? "保存中..." : "保存する"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function QuestionsEditor(props: Props) {
  return (
    <Suspense fallback={null}>
      <EditorInner {...props} />
    </Suspense>
  );
}
