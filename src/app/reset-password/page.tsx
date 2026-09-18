"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setReady(Boolean(data.user));
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8 || password.length > 72) {
      setError("パスワードは8〜72文字で入力してください。");
      return;
    }
    if (password !== confirmPassword) {
      setError("確認用パスワードが一致しません。");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setLoading(false);
      setError("パスワードを更新できませんでした。再設定メールからもう一度お試しください。");
      return;
    }

    await supabase.auth.signOut();
    router.push("/login?passwordReset=1");
    router.refresh();
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
          <h1 className="text-xl font-bold">新しいパスワードを設定</h1>
          <p className="mt-1 text-sm text-gray-500">
            今後ログインに使用するパスワードを設定してください
          </p>

          {!ready && (
            <div className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              再設定メール内のリンクからこの画面を開いてください。
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="label" htmlFor="password">
                新しいパスワード
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                maxLength={72}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="confirmPassword">
                新しいパスワード（確認）
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                className="input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
                maxLength={72}
                required
              />
            </div>
            <button
              type="submit"
              className="btn-primary w-full"
              disabled={!ready || loading}
            >
              {loading ? "更新中..." : "パスワードを更新する"}
            </button>
            <Link
              href="/forgot-password"
              className="btn-ghost block w-full text-center"
            >
              再設定メールを送り直す
            </Link>
          </form>
        </div>
      </div>
    </div>
  );
}
