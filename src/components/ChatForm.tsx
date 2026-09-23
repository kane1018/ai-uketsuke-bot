"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { BotQuestion } from "@/lib/types";
import { validateResponseValue } from "@/lib/response-validation";
import { chatAnswers, chatValue, initialChatState, transitionChat, type ChatAction } from "@/lib/chat-state";

export interface ChatFormProps {
  slug: string;
  botName: string;
  operatorName?: string;
  openingMessage: string;
  completionMessage: string;
  ctaMessage: string;
  questions: BotQuestion[];
  showBranding?: boolean;
  /** Preview mode: answers are NOT submitted to the server. */
  preview?: boolean;
}

export function ChatForm(props: ChatFormProps) {
  // A changed bot/question definition starts a new session, including in the editor.
  const sessionKey = JSON.stringify([props.slug, props.preview, props.questions.map(
    ({ id, question_text, question_type, options, is_required, sort_order }) =>
      [id, question_text, question_type, options, is_required, sort_order]
  )]);
  return <ChatSession key={sessionKey} {...props} />;
}

function ChatSession({ slug, botName, operatorName, openingMessage, completionMessage,
  ctaMessage, questions, showBranding = false, preview = false }: ChatFormProps) {
  const sorted = useMemo(() => [...questions].sort((a, b) => a.sort_order - b.sort_order), [questions]);
  const [state, setState] = useState(() => initialChatState(sorted.length));
  // Update synchronously before React renders: two handlers cannot advance/submit twice.
  const stateRef = useRef(state);
  const composing = useRef(false);
  const compositionEndedAt = useRef(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const id = useId();
  const q = sorted[state.index];
  const value = q ? chatValue(state, q) : "";
  const recipient = operatorName?.trim() || "この受付フォームの運営者";
  const sending = state.phase === "sending";
  const reviewing = state.phase === "review" || sending;
  const complete = state.phase === "complete";
  const inputId = `${id}-input`;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  useEffect(() => {
    // Only move focus after an interaction, to a heading rather than a mobile keyboard.
    if (state.revision > 0) headingRef.current?.focus();
  }, [state.revision]);

  function act(action: ChatAction, revision = state.revision) {
    const previous = stateRef.current;
    const next = transitionChat(stateRef.current, action, revision, sorted, validateResponseValue, preview);
    if (next.revision !== previous.revision) composing.current = false;
    stateRef.current = next;
    setState(next);
    return next;
  }

  async function confirm() {
    if (stateRef.current.phase !== "review" || stateRef.current.revision !== state.revision) return;
    const next = act({ type: "confirm" });
    // Preview takes a purely local transition and never reaches fetch.
    if (preview || next.phase !== "sending" || next.revision === state.revision) return;
    try {
      const res = await fetch("/api/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, answers: chatAnswers(next, sorted) }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.ok !== true) {
        throw new Error(typeof data?.error === "string" ? data.error : "送信を確認できませんでした。時間をおいて再度お試しください。");
      }
      act({ type: "success" }, next.revision);
    } catch (error) {
      act({ type: "failure", error: error instanceof Error ? error.message : "送信できませんでした。再度お試しください。" }, next.revision);
    }
  }

  const status = sending ? "送信しています。しばらくお待ちください。"
    : complete ? (preview ? "プレビューが完了しました。回答は保存・送信されていません。" : "送信が完了しました。")
    : reviewing ? "回答内容を確認してください。まだ送信されていません。"
    : state.phase === "empty" ? "現在、回答できる質問がありません。"
    : `質問 ${state.index + 1} / ${sorted.length}${state.editing ? "・回答を修正中" : ""}`;

  return (
    <div className="flex h-full min-h-0 flex-col bg-gray-50" onKeyDown={(event) => {
      if (event.key === "Enter" && (event.repeat || event.nativeEvent.isComposing || composing.current || event.nativeEvent.keyCode === 229 || Date.now() - compositionEndedAt.current < 100)) {
        // Do not cancel the IME's own conversion; prevent repeated non-IME activation.
        if (!event.nativeEvent.isComposing && !composing.current) event.preventDefault();
      }
    }}>
      <header className="border-b border-gray-200 bg-white px-4 py-3">
        <p className="break-words font-semibold">{botName || "受付フォーム"}</p>
        {showBranding && <p className="text-xs text-gray-500"><a href="/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Powered by 受付Bot</a></p>}
      </header>
      <div className="chat-scroll flex-1 space-y-5 overflow-y-auto p-4">
        {preview && <aside className="rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm text-brand-800">
          <p className="font-semibold">プレビュー・入力の練習</p>
          <p>回答は保存・送信されません。</p>
          <button type="button" className="btn-secondary mt-2 min-h-11" onClick={(event) => { if (event.detail < 2) act({ type: "restart" }); }}>プレビューをやり直す</button>
        </aside>}
        <p className="whitespace-pre-wrap break-words rounded-xl bg-white p-4 text-sm">{openingMessage || "こんにちは！いくつか質問にお答えください。"}</p>
        {!preview && !complete && <p className="text-xs leading-relaxed text-gray-600">
          回答は最後に確認してから、{recipient}へ送信されます。送信先での利用目的は運営者の案内をご確認ください。保存・処理については<a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-brand-700 underline">プライバシーポリシー（別タブ）</a>をご覧ください。
        </p>}
        <p role="status" aria-live="polite" aria-atomic="true" className="text-sm text-gray-600">{status}</p>

        {!reviewing && !complete && state.answered.length > 0 && <ol aria-label="これまでの回答" className="space-y-3">
          {sorted.filter((question) => state.answered.includes(question.id) && question.id !== q?.id).map((question) => (
            <li key={question.id} className="space-y-1 text-sm">
              <p className="whitespace-pre-wrap break-words text-gray-600">{question.question_text}</p>
              <p className="ml-6 whitespace-pre-wrap break-words rounded-xl bg-brand-100 p-3 text-brand-900">{displayValue(chatValue(state, question))}</p>
            </li>
          ))}
        </ol>}

        {state.phase === "question" && q && <form key={`${q.id}-${state.revision}`} noValidate onSubmit={(event) => {
          event.preventDefault();
          if (!composing.current && Date.now() - compositionEndedAt.current >= 100) act({ type: "next" });
        }} className="space-y-4">
          <h2 ref={headingRef} tabIndex={-1} className="whitespace-pre-wrap break-words text-lg font-semibold outline-none">
            {q.question_text} <span className={`badge text-xs ${q.is_required ? "bg-brand-100 text-brand-800" : "bg-gray-200 text-gray-700"}`}>{q.is_required ? "必須" : "任意"}</span>
          </h2>
          <p id={hintId} className="text-sm text-gray-600">{q.question_type === "multiple" ? "当てはまるものをすべて選んでください。" : q.question_type === "single" ? "1つ選んでください。" : "下の欄に入力してください。"}{!q.is_required && " 空欄のまま進めます。"}</p>
          {q.question_type === "single" || q.question_type === "multiple" ? (
            <fieldset aria-describedby={`${hintId}${state.error ? ` ${errorId}` : ""}`} aria-invalid={!!state.error} className="space-y-2">
              <legend className="sr-only">{q.question_text}（{q.is_required ? "必須" : "任意"}）</legend>
              {q.options.map((option, index) => <label key={`${index}-${option}`} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-gray-300 bg-white px-3 py-3 text-base has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
                <input type={q.question_type === "single" ? "radio" : "checkbox"} name={inputId} value={option} className="h-5 w-5 shrink-0 accent-brand-600"
                  checked={Array.isArray(value) ? value.includes(option) : value === option}
                  onChange={() => act({ type: "change", value: q.question_type === "single" ? option : Array.isArray(value) && value.includes(option) ? value.filter((item) => item !== option) : [...(Array.isArray(value) ? value : []), option] })} />
                <span className="min-w-0 whitespace-pre-wrap break-words">{option}</span>
              </label>)}
              {q.question_type === "single" && !q.is_required && <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-gray-300 bg-white px-3 py-3">
                <input type="radio" name={inputId} checked={value === ""} onChange={() => act({ type: "change", value: "" })} className="h-5 w-5 accent-brand-600" />回答しない
              </label>}
            </fieldset>
          ) : <>
            <label htmlFor={inputId} className="sr-only">{q.question_text}（{q.is_required ? "必須" : "任意"}）</label>
            {q.question_type === "textarea" ? <textarea id={inputId} rows={4} className="input !text-base" maxLength={5000} required={q.is_required}
              value={typeof value === "string" ? value : ""} aria-invalid={!!state.error} aria-describedby={`${hintId}${state.error ? ` ${errorId}` : ""}`}
              onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; compositionEndedAt.current = Date.now(); }}
              onChange={(event) => act({ type: "change", value: event.target.value })} />
              : <input id={inputId} className="input min-h-12 min-w-0 !text-base" maxLength={5000} required={q.is_required}
                type={q.question_type === "phone" ? "tel" : q.question_type === "email" ? "email" : q.question_type === "date" ? "date" : "text"}
                inputMode={q.question_type === "phone" ? "tel" : q.question_type === "email" ? "email" : "text"}
                autoComplete={q.question_type === "email" ? "email" : q.question_type === "phone" ? "tel" : q.question_type === "text" && /(お名前|氏名|名前|担当者)/.test(q.question_text) ? "name" : "off"}
                autoCapitalize={q.question_type === "email" ? "none" : undefined} spellCheck={q.question_type === "email" ? false : undefined}
                value={typeof value === "string" ? value : ""} aria-invalid={!!state.error} aria-describedby={`${hintId}${state.error ? ` ${errorId}` : ""}`}
                onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; compositionEndedAt.current = Date.now(); }}
                onChange={(event) => act({ type: "change", value: event.target.value })} />}
          </>}
          {state.error && <p id={errorId} role="alert" className="text-sm text-red-700">{state.error}</p>}
          <div className="flex flex-wrap gap-2">
            {(state.index > 0 || state.editing) && <button type="button" className="btn-secondary min-h-11" onClick={(event) => { if (event.detail < 2) act({ type: "back" }); }}>{state.editing ? "確認画面へ戻る" : "前の質問へ戻る"}</button>}
            <button type="submit" className="btn-primary min-h-11" onClick={(event) => { if (event.detail > 1) event.preventDefault(); }}>{state.editing ? "修正して確認画面へ" : state.index === sorted.length - 1 ? "回答内容を確認する" : "次の質問へ"}</button>
          </div>
        </form>}

        {reviewing && <section className="space-y-4" aria-busy={sending}>
          <h2 ref={headingRef} tabIndex={-1} className="text-lg font-semibold outline-none">回答内容の確認</h2>
          <p className="text-sm text-gray-600">すべての回答をご確認ください。「修正する」から変更できます。</p>
          <ol className="space-y-3">
            {sorted.map((question, index) => <li key={question.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="whitespace-pre-wrap break-words text-sm font-semibold">{index + 1}. {question.question_text} <span className="text-xs text-gray-500">（{question.is_required ? "必須" : "任意"}）</span></h3>
              <p className="mt-2 whitespace-pre-wrap break-words">{displayValue(chatValue(state, question))}</p>
              <button type="button" className="btn-ghost mt-2 min-h-11 !text-brand-700" aria-label={`質問${index + 1}「${question.question_text}」を修正する`} disabled={sending} onClick={(event) => { if (event.detail < 2) act({ type: "edit", index }); }}>修正する</button>
            </li>)}
          </ol>
          {state.error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}<br />回答はこの画面に残っています。内容を確認して再度送信できます。</p>}
          <button type="button" disabled={sending} className="btn-primary min-h-12 w-full" onClick={(event) => { if (event.detail < 2) void confirm(); }}>{sending ? "送信中…" : preview ? "プレビューを完了する（送信しません）" : "この内容で送信する"}</button>
        </section>}
        {complete && <section className="space-y-3 rounded-xl bg-white p-4">
          <h2 ref={headingRef} tabIndex={-1} className="text-lg font-semibold outline-none">{preview ? "プレビュー完了" : "送信完了"}</h2>
          {preview && <p className="text-sm text-brand-800">以下は完了画面の見本です。回答は保存・送信されていません。</p>}
          <p className="whitespace-pre-wrap break-words">{completionMessage || "ご回答ありがとうございました！"}</p>
          {ctaMessage && <p className="whitespace-pre-wrap break-words">{ctaMessage}</p>}
        </section>}
        {state.phase === "empty" && <section className="rounded-xl bg-white p-4">
          <h2 ref={headingRef} tabIndex={-1} className="font-semibold outline-none">質問がまだありません</h2>
          <p className="mt-2 text-sm text-gray-600">{preview ? "質問を追加すると、ここで入力から確認まで試せます。" : "受付の準備中です。時間をおいて再度アクセスするか、運営者へお問い合わせください。"}</p>
        </section>}
      </div>
    </div>
  );
}

function displayValue(value: string | string[]) {
  return (Array.isArray(value) ? value.join("、") : value) || "未回答";
}
