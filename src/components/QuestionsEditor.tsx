"use client";

import { Suspense, useEffect, useRef, useState } from "react";
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
    key: `q_${q.id}`,
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

// Only attach departure guards while there are actual unsaved changes.
export function useUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    function beforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    function beforeNavigate(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement) || (link.target && link.target !== "_self") || link.hasAttribute("download")) return;
      const destination = new URL(link.href, window.location.href);
      if (destination.origin !== window.location.origin || (destination.pathname === window.location.pathname && destination.search === window.location.search)) return;
      if (!window.confirm("未保存の変更があります。変更を破棄して移動しますか？")) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }
    // Modern browsers also expose cancellable same-document back/forward navigation.
    // Keep the link and beforeunload guards for browsers without this API.
    const navigation = (window as Window & { navigation?: EventTarget }).navigation;
    function beforeHistoryNavigate(event: Event) {
      const traversal = event as Event & {
        navigationType?: string;
        destination?: { url: string; sameDocument: boolean };
      };
      if (traversal.navigationType !== "traverse" || !traversal.cancelable || !traversal.destination?.sameDocument) return;
      const destination = new URL(traversal.destination.url);
      if (destination.origin !== window.location.origin || (destination.pathname === window.location.pathname && destination.search === window.location.search)) return;
      if (!window.confirm("未保存の変更があります。変更を破棄して移動しますか？")) event.preventDefault();
    }
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", beforeNavigate, true);
    navigation?.addEventListener("navigate", beforeHistoryNavigate);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", beforeNavigate, true);
      navigation?.removeEventListener("navigate", beforeHistoryNavigate);
    };
  }, [dirty]);
}

function snapshot(questions: DraftQuestion[], opening: string, completion: string, cta: string) {
  return JSON.stringify({
    questions: questions.map((q) => ({
      question_text: q.question_text, question_type: q.question_type,
      options: q.options, is_required: q.is_required,
    })), opening, completion, cta,
  });
}

function EditorInner(props: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setupError = searchParams.get("setupError");
  const justPrepared = searchParams.get("template") === "1";

  const [questions, setQuestions] = useState<DraftQuestion[]>(
    () => props.initialQuestions.map(toDraft)
  );
  const [opening, setOpening] = useState(props.initialOpening);
  const [completion, setCompletion] = useState(props.initialCompletion);
  const [cta, setCta] = useState(props.initialCta);

  const [savedSnapshot, setSavedSnapshot] = useState(() => snapshot(questions, opening, completion, cta));
  const dirty = snapshot(questions, opening, completion, cta) !== savedSnapshot;
  useUnsavedChanges(dirty);
  const saveLock = useRef(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(setupError ? { type: "error", text: setupError } : null);

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

  async function handleSave(preview = false) {
    if (saveLock.current) return;
    if (preview && !dirty) { router.push(`/dashboard/bots/${props.botId}/preview`); return; }
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

    saveLock.current = true;
    setSaving(true);
    try {
      const res = await fetch(`/api/bots/${props.botId}/questions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存に失敗しました");
      const savedQuestions = parsed.data.questions.map((q, index) => ({ ...q, key: questions[index].key }));
      const savedOpening = parsed.data.opening_message ?? "";
      const savedCompletion = parsed.data.completion_message ?? "";
      const savedCta = parsed.data.cta_message ?? "";
      setQuestions(savedQuestions);
      setOpening(savedOpening);
      setCompletion(savedCompletion);
      setCta(savedCta);
      setSavedSnapshot(snapshot(savedQuestions, savedOpening, savedCompletion, savedCta));
      setMessage({ type: "success", text: "保存しました" });
      if (preview) router.push(`/dashboard/bots/${props.botId}/preview`);
      router.refresh();
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "保存に失敗しました",
      });
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5" aria-busy={saving}>
      {justPrepared && !setupError && questions.length > 0 && (
        <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          ✓ 受付テンプレートを準備しました。必要に応じて質問を編集してください。
        </div>
      )}
      {message && (message.type === "error" || !dirty) && (
        <div
          role={message.type === "error" ? "alert" : "status"}
          className={`rounded-lg px-3 py-2 text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <p role="status" className={`text-sm font-medium ${dirty ? "text-amber-700" : "text-gray-600"}`}>
        {saving ? "保存中です…" : dirty ? "未保存の変更があります" : "すべての変更を保存済みです"}
      </p>
      <fieldset disabled={saving} className="min-w-0 space-y-5">
      <legend className="sr-only">受付の質問と案内を編集</legend>
      {/* Chat copy */}
      <details className="card p-4" open>
        <summary className="cursor-pointer text-sm font-semibold">
          あいさつ・回答後の案内を編集
        </summary>
        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor="questions-opening" className="label">最初のあいさつ</label>
            <textarea
              className="input min-h-[60px]"
              id="questions-opening"
              maxLength={1000}
              value={opening}
              onChange={(e) => setOpening(e.target.value)}
              placeholder="例：こんにちは！ご相談内容をお聞かせください。"
            />
          </div>
          <div>
            <label htmlFor="questions-completion" className="label">回答完了時のお礼</label>
            <textarea
              className="input min-h-[60px]"
              id="questions-completion"
              maxLength={1000}
              value={completion}
              onChange={(e) => setCompletion(e.target.value)}
              placeholder="例：ご回答ありがとうございました。"
            />
          </div>
          <div>
            <label htmlFor="questions-followup" className="label">回答後の連絡・次の手順</label>
            <textarea
              className="input min-h-[60px]"
              id="questions-followup"
              maxLength={1000}
              value={cta}
              onChange={(e) => setCta(e.target.value)}
              placeholder="例：担当者より2営業日以内にご連絡いたします。"
            />
          </div>
        </div>
      </details>

      {/* Questions */}
      <div>
        <h2 className="font-semibold">質問項目（{questions.length}）</h2>
        <p className="mt-1 text-xs text-gray-500">
          テンプレートを土台に、質問の追加・削除・並べ替えができます。
        </p>
      </div>

      {questions.length === 0 && (
        <div className="card px-4 py-10 text-center text-sm text-gray-500">
          質問がありません。「質問を追加」から受付項目を作成してください。
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
                  className="grid min-h-[44px] min-w-[44px] place-items-center rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-30"
                  aria-label={`質問 ${idx + 1} を上へ移動`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(q.key, 1)}
                  disabled={idx === questions.length - 1}
                  className="grid min-h-[44px] min-w-[44px] place-items-center rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-30"
                  aria-label={`質問 ${idx + 1} を下へ移動`}
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeQuestion(q.key)}
                  className="grid min-h-[44px] min-w-[44px] place-items-center rounded-lg text-red-700 hover:bg-red-50"
                  aria-label={`質問 ${idx + 1} を削除`}
                >
                  🗑
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label htmlFor={`${q.key}-text`} className="label">質問 {idx + 1} の文章</label>
                <input
                  className="input"
                  id={`${q.key}-text`}
                  maxLength={500}
                  value={q.question_text}
                  onChange={(e) =>
                    patch(q.key, { question_text: e.target.value })
                  }
                  placeholder="例：お名前を教えてください"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor={`${q.key}-type`} className="label">回答の形式</label>
                  <select
                    className="input"
                    id={`${q.key}-type`}
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
                  <label htmlFor={`${q.key}-required`} className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm">
                    <input
                      id={`${q.key}-required`}
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
                  <p className="label">選択肢（1つ以上）</p>
                  <div className="space-y-2">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex gap-2">
                        <label htmlFor={`${q.key}-option-${oi}`} className="sr-only">質問 {idx + 1} の選択肢 {oi + 1}</label>
                        <input
                          id={`${q.key}-option-${oi}`}
                          maxLength={200}
                          className="input"
                          value={opt}
                          onChange={(e) => setOption(q.key, oi, e.target.value)}
                          placeholder={`選択肢 ${oi + 1}`}
                        />
                        <button
                          type="button"
                          onClick={() => removeOption(q.key, oi)}
                          className="btn-ghost shrink-0 px-2 text-red-400"
                          aria-label={`質問 ${idx + 1} の選択肢 ${oi + 1} を削除`}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addOption(q.key)}
                      disabled={q.options.length >= 20}
                      className="min-h-[44px] text-sm font-medium text-brand-700"
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
        disabled={questions.length >= 50}
        className="btn-secondary w-full"
      >
        ＋ 質問を追加
      </button>

      </fieldset>
      <div className="sticky bottom-0 z-10 -mx-4 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={() => handleSave()} className="btn-secondary" disabled={saving || !dirty}>
            {saving ? "保存中…" : "変更を保存"}
          </button>
          <button type="button" onClick={() => handleSave(true)} className="btn-primary" disabled={saving || questions.length === 0}>
            {saving ? "保存中…" : dirty ? "保存して動作確認へ →" : "動作確認へ →"}
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">動作確認では回答は保存されません。確認後、公開へ進めます。</p>
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
