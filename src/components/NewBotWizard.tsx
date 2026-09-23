"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { INDUSTRIES, PURPOSES, purposeLabel, type IndustryValue, type PurposeValue } from "@/lib/constants";
import { botBasicInfoSchema, questionsSaveSchema } from "@/lib/validations";
import { buildBotTemplate } from "@/lib/bot-templates";

type Step = 1 | 2 | 3;
const steps = ["目的", "業種", "基本情報"];

export function NewBotWizard({ defaultEmail, initialPurpose, initialIndustry }: {
  defaultEmail: string;
  initialPurpose?: PurposeValue;
  initialIndustry?: IndustryValue;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const heading = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(step);
  const busy = useRef(false);
  const createdBotId = useRef<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [creationUncertain, setCreationUncertain] = useState(false);
  const [purpose, setPurpose] = useState<string>(initialPurpose ?? "");
  const [industry, setIndustry] = useState<string>(initialIndustry ?? "");
  const [nameEdited, setNameEdited] = useState(false);
  const [form, setForm] = useState({
    name: initialPurpose ? `${purposeLabel(initialPurpose)}フォーム` : "お問い合わせ受付",
    company_name: "", notification_email: defaultEmail,
    service_description: "", intake_goal: "", final_cta: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const template = buildBotTemplate({ purpose, industry, ...form });

  useEffect(() => {
    if (previousStep.current !== step) heading.current?.focus();
    previousStep.current = step;
  }, [step]);

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || creationUncertain) return;
    setError(null);
    setUpgradeRequired(false);
    if (!form.company_name.trim()) {
      setError("会社・事業者名を入力してください。公開画面で受付の運営者として表示されます。");
      document.getElementById("new-company")?.focus();
      return;
    }
    const parsed = botBasicInfoSchema.safeParse({ purpose, industry, ...form });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "入力内容を確認してください");
      return;
    }
    const generated = questionsSaveSchema.safeParse(buildBotTemplate(parsed.data));
    if (!generated.success) {
      setError("サービスの説明・受付で確認したいことが長いため、あいさつを保存できません。任意の説明を短くするか、空欄で作成してから質問編集で入力してください（あいさつは1,000文字まで）。");
      document.getElementById("new-intake_goal")?.closest("details")?.setAttribute("open", "");
      return;
    }
    busy.current = true;
    setSubmitting(true);
    try {
      let botId = createdBotId.current;
      if (!botId) {
        setProgress("受付の下書きを作成しています…");
        // If the POST response is lost, do not blindly repeat a potentially committed creation.
        let response: Response;
        let data;
        try {
          response = await fetch("/api/bots", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(parsed.data),
          });
          data = await response.json();
        } catch {
          setCreationUncertain(true);
          throw new Error("作成結果を確認できませんでした。Bot一覧に下書きがあるか確認してください。");
        }
        if (!response.ok) {
          setUpgradeRequired(Boolean(data.upgradeRequired));
          if (response.status >= 500) setCreationUncertain(true);
          throw new Error(data.error || "Botを作成できませんでした");
        }
        if (typeof data.bot?.id !== "string" || !data.bot.id) {
          setCreationUncertain(true);
          throw new Error("作成結果を確認できませんでした。Bot一覧から確認してください。");
        }
        botId = data.bot.id as string;
        createdBotId.current = botId;
        setDraftId(botId);
      }
      setProgress("質問を保存しています…");
      const plan = generated.data;
      const response = await fetch(`/api/bots/${botId}/questions`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(plan),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "質問を保存できませんでした");
      setProgress("保存しました。質問の編集画面へ進みます…");
      router.push(`/dashboard/bots/${botId}/edit?template=1`);
      // Keep the synchronous lock until navigation unmounts this wizard.
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存できませんでした。もう一度お試しください。");
      setProgress("");
      setSubmitting(false);
      busy.current = false;
    }
  }

  return <div className="space-y-5">
    <ol aria-label="作成の手順" className="grid grid-cols-3 gap-2">
      {steps.map((label, index) => <li key={label} aria-current={step === index + 1 ? "step" : undefined}
        className={`rounded-xl px-3 py-3 text-center text-sm font-semibold ${step === index + 1 ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600"}`}>
        <span className="mr-1">{index + 1}.</span>{label}
      </li>)}
    </ol>
    <h1 ref={heading} tabIndex={-1} className="text-xl font-bold outline-none">{step === 1 ? "どんな受付を作りますか？" : step === 2 ? "あなたの業種を教えてください" : "受付の基本情報を入力しましょう"}</h1>
    <p role="status" className="text-sm text-gray-600">{progress || `ステップ ${step} / 3：${steps[step - 1]}`}</p>
    {error && <div role="alert" className="space-y-2 rounded-xl bg-red-50 p-4 text-sm text-red-700">
      <p>{error}</p>
      {draftId && <><p>下書きは作成済みです。「質問の保存を再試行」で同じBotに保存します。</p>
        <Link className="inline-block font-semibold underline" href={`/dashboard/bots/${draftId}/edit`}>作成済みの下書きを編集する →</Link></>}
      {(creationUncertain || upgradeRequired) && <Link className="block font-semibold underline" href="/dashboard/bots">Bot一覧で作成済みの受付を確認する →</Link>}
      {upgradeRequired && <Link className="block underline" href="/pricing">プランを確認する</Link>}
    </div>}
    {step < 3 ? <>
      <div className="grid gap-3 sm:grid-cols-2">
        {(step === 1 ? PURPOSES : INDUSTRIES).map((item) => {
          const selected = (step === 1 ? purpose : industry) === item.value;
          return <button key={item.value} type="button" aria-pressed={selected}
            className={`card flex items-start gap-3 p-4 text-left ${selected ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500" : "hover:border-brand-300"}`}
            onClick={() => {
              if (step === 1) {
                setPurpose(item.value);
                if (!nameEdited) update("name", `${item.label}フォーム`);
              } else setIndustry(item.value);
            }}>
            <span aria-hidden="true" className="text-2xl">{item.icon}</span>
            <span><span className="block font-semibold">{item.label}{selected ? " ✓" : ""}</span><span className="mt-1 block text-sm text-gray-600">{item.description}</span></span>
          </button>;
        })}
      </div>
      <div className="flex items-center justify-between gap-3">
        {step === 2 ? <button type="button" className="btn-secondary" onClick={() => setStep(1)}>目的に戻る</button> : <Link href="/dashboard/bots" className="btn-ghost">Bot一覧に戻る</Link>}
        <button type="button" className="btn-primary" disabled={step === 1 ? !purpose : !industry} onClick={() => setStep(step === 1 ? 2 : 3)}>{step === 1 ? "次へ：業種を選ぶ" : "次へ：基本情報を入力"}</button>
      </div>
    </> : <form onSubmit={handleCreate} className="space-y-5" aria-busy={submitting}>
      <fieldset disabled={submitting || Boolean(draftId) || creationUncertain} className="card min-w-0 space-y-4 p-5 disabled:opacity-70">
        <legend className="sr-only">受付の基本情報</legend>
        <div><label htmlFor="new-company" className="label">会社・事業者名（必須）</label>
          <input id="new-company" className="input" required maxLength={100} autoComplete="organization" value={form.company_name} onChange={(e) => update("company_name", e.target.value)} aria-describedby="new-company-help" placeholder="例：山田行政書士事務所" />
          <p id="new-company-help" className="mt-1 text-xs text-gray-500">お客様に表示する運営者名です。個人事業の場合は屋号または氏名を入力してください。</p></div>
        <div><label htmlFor="new-name" className="label">受付の名前（必須）</label>
          <input id="new-name" className="input" required maxLength={100} value={form.name} onChange={(e) => { setNameEdited(true); update("name", e.target.value); }} />
          <p className="mt-1 text-xs text-gray-500">公開する受付画面のタイトルです。あとから変更できます。</p></div>
        <div><label htmlFor="new-email" className="label">回答通知のメールアドレス（必須）</label>
          <input id="new-email" className="input" required type="email" maxLength={254} autoComplete="email" value={form.notification_email} onChange={(e) => update("notification_email", e.target.value)} aria-describedby="new-email-help" />
          <p id="new-email-help" className="mt-1 text-xs text-gray-500">新しい回答のお知らせを受け取るアドレスです。</p></div>
        <details className="rounded-lg border border-gray-200 p-3">
          <summary className="cursor-pointer text-sm font-semibold">任意：サービスの説明・受付後の案内を加える</summary>
          <div className="mt-4 space-y-4">
            {([
              ["service_description", "サービスの説明", "サービス内容の紹介文です。「受付で確認したいこと」が未入力の場合、最初のあいさつに使います。", 2000],
              ["intake_goal", "受付で確認したいこと", "最初のあいさつでお客様に伝える受付の目的です。具体的な質問は作成後に編集できます。", 2000],
              ["final_cta", "回答後の案内", "例：担当者から2営業日以内にメールでご連絡します。", 1000],
            ] as const).map(([key, label, help, maxLength]) => <div key={key}>
              <label htmlFor={`new-${key}`} className="label">{label}</label>
              <textarea id={`new-${key}`} className="input min-h-[80px]" maxLength={maxLength} value={form[key]} onChange={(e) => update(key, e.target.value)} aria-describedby={`new-${key}-help`} />
              <p id={`new-${key}-help`} className="mt-1 text-xs text-gray-500">{help}</p>
            </div>)}
          </div>
        </details>
      </fieldset>
      <section className="card p-5" aria-labelledby="sample-heading">
        <h2 id="sample-heading" className="font-semibold">作成される質問（{template.questions.length}件）</h2>
        <p className="mt-1 text-sm text-gray-600">このひな形から始めます。作成後に質問や順番を編集できます。</p>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-gray-700">{template.questions.map((question, index) => <li key={index}>{question.question_text}<span className="ml-2 text-xs text-gray-500">{question.is_required ? "必須" : "任意"}</span></li>)}</ol>
      </section>
      <div className="flex flex-wrap justify-between gap-3">
        <button type="button" className="btn-secondary" disabled={submitting || Boolean(draftId) || creationUncertain} onClick={() => setStep(2)}>業種に戻る</button>
        <button type="submit" className="btn-primary" disabled={submitting || creationUncertain}>{submitting ? "保存中…" : draftId ? "質問の保存を再試行" : "下書きを作成して質問を編集 →"}</button>
      </div>
      <p className="text-center text-xs text-gray-500">ここではまだ公開されません。動作を確認してから公開できます。</p>
    </form>}
  </div>;
}
