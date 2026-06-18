import { randomBytes } from "crypto";

// Generate a hard-to-guess public slug (server-side).
// 18 random bytes -> 24-char base64url string. ~144 bits of entropy.
export function generatePublicSlug(): string {
  return randomBytes(18).toString("base64url");
}

// Build the absolute base URL of the app.
export function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

export function publicChatUrl(slug: string): string {
  return `${appUrl()}/b/${slug}`;
}

export function embedUrl(slug: string): string {
  return `${appUrl()}/embed/${slug}`;
}

export function embedCode(slug: string): string {
  const src = embedUrl(slug);
  return `<iframe src="${src}" width="100%" height="600" frameborder="0" style="border:0;max-width:480px;border-radius:12px;" title="Chatbot"></iframe>`;
}

// Format a timestamp for the Japanese admin UI.
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

// Escape HTML for safe interpolation into email markup.
export function escapeHtml(input: string): string {
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Render an answer value as a readable string.
export function answerToText(value: string | string[]): string {
  if (Array.isArray(value)) return value.join("、");
  return value ?? "";
}
