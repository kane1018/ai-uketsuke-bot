"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Reusable "Continue with Google" button for the login & signup pages.
// Uses Supabase Auth signInWithOAuth (PKCE). After Google authenticates, the
// browser is redirected to /auth/callback, which exchanges the code for a
// session and forwards to `next` (default /dashboard).
export function GoogleSignInButton({
  label = "Googleで続ける",
  next = "/dashboard",
}: {
  label?: string;
  next?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
          next
        )}`,
        // Let the user pick which Google account to use.
        queryParams: { prompt: "select_account" },
      },
    });
    // On success the browser navigates away to Google, so we only handle errors.
    if (error) {
      setError(
        "Googleログインを開始できませんでした。時間をおいて再度お試しください。"
      );
      setLoading(false);
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="btn-secondary w-full"
        aria-label={label}
      >
        <GoogleIcon />
        {loading ? "リダイレクト中..." : label}
      </button>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9082c1.7018-1.5668 2.6841-3.874 2.6841-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.4673-.806 5.9564-2.1818l-2.9082-2.2581c-.806.54-1.8368.8591-3.0482.8591-2.344 0-4.3282-1.5832-5.036-3.7104H.9573v2.3318C2.4382 15.9832 5.4818 18 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71c-.18-.54-.2823-1.1168-.2823-1.71s.1023-1.17.2823-1.71V4.9582H.9573C.3477 6.1732 0 7.5477 0 9s.3477 2.8268.9573 4.0418L3.964 10.71z"
      />
      <path
        fill="#EA4335"
        d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5814-2.5814C13.4636.8918 11.4264 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.964 7.29C4.6718 5.1627 6.656 3.5795 9 3.5795z"
      />
    </svg>
  );
}
