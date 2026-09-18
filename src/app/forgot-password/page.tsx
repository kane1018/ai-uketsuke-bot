"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const redirectTo =
      `${window.location.origin}/auth/callback?next=/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });

    setLoading(false);
    if (error) {
      setError("再設定メールを送信できませんでした。時間をおいて再度お試しください。");
      return;
    }
    setSent(true);
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-6 block text-center text-lg font-bold text-brand-700"
        >
          受付Bot
        </Link>
        <div className="card p-6 sm:p-8">
          <h1 className="text-xl font-bold">パスワードを再設定</h1>
          <p className="mt-1 text-sm text-gray-500">
            登録メールアドレスへ再設定用リンクを送信します
          </p>

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          {sent ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-lg bg-green-50 px-3 py-3 text-sm text-green-700">
                再設定メールを送信しました。メール内のリンクを開いてください。
              </div>
              <Link href="/login" className="btn-secondary w-full text-center">
                ログイン画面へ戻る
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="label" htmlFor="email">
                  メールアドレス
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                className="btn-primary w-full"
                disabled={loading}
              >
                {loading ? "送信中..." : "再設定メールを送る"}
              </button>
              <Link
                href="/login"
                className="btn-ghost block w-full text-center"
              >
                ログイン画面へ戻る
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
