"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PURPOSES, INDUSTRIES } from "@/lib/constants";
import { botBasicInfoSchema } from "@/lib/validations";

type Step = 1 | 2 | 3;

export default function NewBotWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);

  const [purpose, setPurpose] = useState<string>("");
  const [industry, setIndustry] = useState<string>("");
  const [form, setForm] = useState({
    name: "",
    company_name: "",
    service_description: "",
    intake_goal: "",
    final_cta: "",
    notification_email: "",
  });

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [upgradeRequired, setUpgradeRequired] = useState(false);

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleCreate() {
    setError(null);
    setUpgradeRequired(false);

    const payload = { purpose, industry, ...form };
    const parsed = botBasicInfoSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "入力内容を確認してください");
      return;
    }

    setSubmitting(true);
    try {
      // 1) Create the bot (draft).
      setProgress("Botを作成しています...");
      const createRes = await fetch("/api/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const created = await createRes.json();
      if (!createRes.ok) {
        setUpgradeRequired(Boolean(created.upgradeRequired));
        throw new Error(created.error || "Botの作成に失敗しました");
      }
      const botId: string = created.bot.id;

      // 2) Generate questions with AI.
      setProgress("AIが質問項目を生成しています...");
      const genRes = await fetch(`/api/bots/${botId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const gen = await genRes.json();

      // Even if generation fails, the bot exists — send the user to the editor.
      if (!genRes.ok) {
        if (gen.upgradeRequired) {
          router.push(
            `/dashboard/bots/${botId}/edit?genError=${encodeURIComponent(
              gen.error || "生成に失敗しました"
            )}&upgrade=1`
          );
          return;
        }
        router.push(
          `/dashboard/bots/${botId}/edit?genError=${encodeURIComponent(
            gen.error || "生成に失敗しました"
          )}`
        );
        return;
      }

      router.push(`/dashboard/bots/${botId}/edit?generated=1`);
    } catch (err) {
      setSubmitting(false);
      setProgress("");
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Stepper */}
      <div className="mb-6 flex items-center gap-2">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                step >= (n as Step)
                  ? "bg-brand-600 text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {n}
            </div>
            {n < 3 && (
              <div
                className={`h-0.5 flex-1 ${
                  step > (n as Step) ? "bg-brand-600" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <p>{error}</p>
          {upgradeRequired && (
            <Link href="/pricing" className="mt-2 inline-block font-semibold underline">
              プランを確認する
            </Link>
          )}
        </div>
      )}

      {/* Step 1: Purpose */}
      {step === 1 && (
        <section>
          <h1 className="text-lg font-bold">① 目的を選んでください</h1>
          <p className="mt-1 text-sm text-gray-500">
            Botで何をしたいですか？
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {PURPOSES.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPurpose(p.value)}
                className={`card flex items-start gap-3 p-4 text-left transition-all ${
                  purpose === p.value
                    ? "ring-2 ring-brand-500"
                    : "hover:border-brand-300"
                }`}
              >
                <span className="text-2xl">{p.icon}</span>
                <span>
                  <span className="block font-semibold">{p.label}</span>
                  <span className="mt-0.5 block text-xs text-gray-500">
                    {p.description}
                  </span>
                </span>
              </button>
            ))}
          </div>
          <div className="mt-6 flex justify-between">
            <Link href="/dashboard/bots" className="btn-ghost">
              キャンセル
            </Link>
            <button
              type="button"
              className="btn-primary"
              disabled={!purpose}
              onClick={() => setStep(2)}
            >
              次へ
            </button>
          </div>
        </section>
      )}

      {/* Step 2: Industry */}
      {step === 2 && (
        <section>
          <h1 className="text-lg font-bold">② 業種を選んでください</h1>
          <p className="mt-1 text-sm text-gray-500">
            あなたの業種に合った質問をAIが作ります
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {INDUSTRIES.map((i) => (
              <button
                key={i.value}
                type="button"
                onClick={() => setIndustry(i.value)}
                className={`card flex items-start gap-3 p-4 text-left transition-all ${
                  industry === i.value
                    ? "ring-2 ring-brand-500"
                    : "hover:border-brand-300"
                }`}
              >
                <span className="text-2xl">{i.icon}</span>
                <span>
                  <span className="block font-semibold">{i.label}</span>
                  <span className="mt-0.5 block text-xs text-gray-500">
                    {i.description}
                  </span>
                </span>
              </button>
            ))}
          </div>
          <div className="mt-6 flex justify-between">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setStep(1)}
            >
              戻る
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={!industry}
              onClick={() => setStep(3)}
            >
              次へ
            </button>
          </div>
        </section>
      )}

      {/* Step 3: Basic info */}
      {step === 3 && (
        <section>
          <h1 className="text-lg font-bold">③ 基本情報を入力</h1>
          <p className="mt-1 text-sm text-gray-500">
            入力内容をもとにAIが質問を生成します
          </p>

          <div className="mt-4 space-y-4">
            <Field label="Bot名" required>
              <input
                className="input"
                placeholder="例：無料相談受付Bot"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
              />
            </Field>
            <Field label="会社名・屋号">
              <input
                className="input"
                placeholder="例：山田行政書士事務所"
                value={form.company_name}
                onChange={(e) => update("company_name", e.target.value)}
              />
            </Field>
            <Field label="サービス説明">
              <textarea
                className="input min-h-[80px]"
                placeholder="例：相続・遺言に関する手続きの代行を行っています。"
                value={form.service_description}
                onChange={(e) =>
                  update("service_description", e.target.value)
                }
              />
            </Field>
            <Field label="受付したい内容">
              <textarea
                className="input min-h-[80px]"
                placeholder="例：相談内容、希望日時、連絡先を聞きたい"
                value={form.intake_goal}
                onChange={(e) => update("intake_goal", e.target.value)}
              />
            </Field>
            <Field label="最終誘導（CTA）">
              <input
                className="input"
                placeholder="例：担当者より2営業日以内にご連絡します"
                value={form.final_cta}
                onChange={(e) => update("final_cta", e.target.value)}
              />
            </Field>
            <Field label="通知先メールアドレス" required>
              <input
                className="input"
                type="email"
                placeholder="例：info@example.com"
                value={form.notification_email}
                onChange={(e) =>
                  update("notification_email", e.target.value)
                }
              />
              <p className="mt-1 text-xs text-gray-400">
                新しい回答が届いたら、このアドレスに通知します
              </p>
            </Field>
          </div>

          <div className="mt-6 flex justify-between">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setStep(2)}
              disabled={submitting}
            >
              戻る
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleCreate}
              disabled={submitting}
            >
              {submitting ? progress || "作成中..." : "AIで質問を生成する"}
            </button>
          </div>

          {submitting && (
            <p className="mt-3 text-center text-sm text-brand-600">
              {progress}しばらくお待ちください…
            </p>
          )}
        </section>
      )}
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
