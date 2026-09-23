"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { industryLabel, purposeLabel } from "@/lib/constants";
import { botBasicInfoSchema, type BotBasicInfoInput } from "@/lib/validations";
import { useUnsavedChanges } from "@/components/QuestionsEditor";

export function BasicInfoEditor({ botId, initialInfo }: { botId: string; initialInfo: BotBasicInfoInput }) {
  const router = useRouter();
  const [info, setInfo] = useState(initialInfo);
  const [saved, setSaved] = useState(JSON.stringify(initialInfo));
  const dirty = JSON.stringify(info) !== saved;
  useUnsavedChanges(dirty);
  const lock = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function update(key: keyof BotBasicInfoInput, value: string) {
    setInfo((current) => ({ ...current, [key]: value }));
    setSuccess(false);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    setError(null);
    setSuccess(false);
    if (!info.company_name.trim()) {
      setError("公開に必要な会社・事業者名を入力してください。");
      document.getElementById("info-company")?.focus();
      return;
    }
    const parsed = botBasicInfoSchema.safeParse({ ...info, purpose: initialInfo.purpose, industry: initialInfo.industry });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "入力内容を確認してください");
      return;
    }
    lock.current = true;
    setSaving(true);
    try {
      // Purpose and industry determine the original template and stay unchanged.
      const { name, company_name, notification_email, service_description, intake_goal, final_cta } = parsed.data;
      const response = await fetch(`/api/bots/${botId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ info: { name, company_name, notification_email, service_description, intake_goal, final_cta } }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "基本情報を保存できませんでした");
      setInfo(parsed.data);
      setSaved(JSON.stringify(parsed.data));
      setSuccess(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存できませんでした。もう一度お試しください。");
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }

  return <form onSubmit={save} className="max-w-2xl space-y-5" aria-busy={saving}>
    <div><h2 className="text-lg font-bold">基本情報</h2>
      <p className="mt-1 text-sm text-gray-600">受付の名前・運営者名・回答通知の送信先を変更できます。</p>
      <p className="mt-2 text-sm text-gray-500">目的：{purposeLabel(info.purpose)} ／ 業種：{industryLabel(info.industry)}</p></div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <p role="status" className={`text-sm ${dirty ? "text-amber-700" : "text-gray-600"}`}>{saving ? "保存中です…" : dirty ? "未保存の変更があります" : success ? "基本情報を保存しました" : "保存済みの基本情報です"}</p>
    <fieldset disabled={saving} className="card min-w-0 space-y-4 p-5">
      <legend className="sr-only">基本情報を編集</legend>
      <div><label htmlFor="info-company" className="label">会社・事業者名（必須）</label>
        <input id="info-company" className="input" required maxLength={100} autoComplete="organization" value={info.company_name} onChange={(e) => update("company_name", e.target.value)} aria-describedby="info-company-help" />
        <p id="info-company-help" className="mt-1 text-xs text-gray-500">公開画面に表示する運営者名です。個人事業の場合は屋号または氏名を入力してください。</p></div>
      <div><label htmlFor="info-name" className="label">受付の名前（必須）</label>
        <input id="info-name" className="input" required maxLength={100} value={info.name} onChange={(e) => update("name", e.target.value)} /></div>
      <div><label htmlFor="info-email" className="label">回答通知のメールアドレス（必須）</label>
        <input id="info-email" className="input" type="email" required maxLength={254} autoComplete="email" value={info.notification_email} onChange={(e) => update("notification_email", e.target.value)} />
        <p className="mt-1 text-xs text-gray-500">新しい回答のお知らせを受け取るアドレスです。</p></div>
      <details className="rounded-lg border border-gray-200 p-3">
        <summary className="cursor-pointer text-sm font-semibold">任意：サービスの説明・受付の方針</summary>
        <div className="mt-4 space-y-4">
          {([
            ["service_description", "サービスの説明", 2000],
            ["intake_goal", "受付で確認したいこと", 2000],
            ["final_cta", "回答後の案内", 1000],
          ] as const).map(([key, label, maxLength]) => <div key={key}>
            <label htmlFor={`info-${key}`} className="label">{label}</label>
            <textarea id={`info-${key}`} className="input min-h-[80px]" maxLength={maxLength} value={info[key]} onChange={(e) => update(key, e.target.value)} />
          </div>)}
          <p className="text-xs leading-relaxed text-gray-600">ひな形のままのあいさつ・回答後の案内は、この設定に合わせて更新します。ご自身で編集した文章や質問は上書きしません。公開前に、<Link href={`/dashboard/bots/${botId}/edit`} className="font-medium text-brand-700 underline">「質問を編集」</Link>で確認・変更してください。</p>
        </div>
      </details>
    </fieldset>
    <div className="flex flex-wrap gap-3">
      <button type="submit" className="btn-primary" disabled={saving || !dirty}>{saving ? "保存中…" : "基本情報を保存"}</button>
      <Link href={`/dashboard/bots/${botId}/publish`} className="btn-secondary">公開条件を確認する →</Link>
    </div>
  </form>;
}
