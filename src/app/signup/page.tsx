"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { signupSchema } from "@/lib/validations";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const parsed = signupSchema.safeParse({ name, email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "入力内容を確認してください");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { name: parsed.data.name },
        emailRedirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/auth/callback`
            : undefined,
      },
    });
    setLoading(false);

    if (error) {
      setError(
        error.message.includes("already")
          ? "このメールアドレスは既に登録されています"
          : "登録に失敗しました。時間をおいて再度お試しください。"
      );
      return;
    }

    // If email confirmation is OFF, a session is returned and we go straight in.
    if (data.session) {
      router.push("/dashboard");
      router.refresh();
      return;
    }
    // If confirmation is ON, ask the user to check their inbox.
    setNotice(
      "確認メールを送信しました。メール内のリンクをクリックして登録を完了してください。"
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-6 block text-center text-lg font-bold text-brand-700"
        >
          AI受付Bot
        </Link>
        <div className="card p-6 sm:p-8">
          <h1 className="text-xl font-bold">新規登録</h1>
          <p className="mt-1 text-sm text-gray-500">
            無料でアカウントを作成します
          </p>

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          {notice && (
            <div className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
              {notice}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="label" htmlFor="name">
                お名前
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
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
            <div>
              <label className="label" htmlFor="password">
                パスワード（8文字以上）
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="btn-primary w-full"
              disabled={loading}
            >
              {loading ? "登録中..." : "アカウントを作成"}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-gray-200" />
            <span className="text-xs text-gray-400">または</span>
            <span className="h-px flex-1 bg-gray-200" />
          </div>

          <GoogleSignInButton label="Googleで続ける" next="/dashboard" />

          <p className="mt-6 text-center text-sm text-gray-500">
            既にアカウントをお持ちの方は{" "}
            <Link href="/login" className="font-semibold text-brand-600">
              ログイン
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
