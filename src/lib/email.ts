import { Resend } from "resend";
import { escapeHtml, answerToText, formatDateTime, appUrl } from "@/lib/utils";
import type { Bot, ResponseAnswer } from "@/lib/types";

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ||
  "AI Chatbot Builder <onboarding@resend.dev>";

export interface NotificationInput {
  bot: Pick<Bot, "id" | "name" | "notification_email">;
  responseId: string;
  respondentName: string | null;
  respondentEmail: string | null;
  respondentPhone: string | null;
  answers: ResponseAnswer[];
  createdAt: string;
}

function buildHtml(input: NotificationInput): string {
  const adminLink = `${appUrl()}/dashboard/bots/${input.bot.id}/responses/${input.responseId}`;

  const answerRows = input.answers
    .map(
      (a) => `
        <tr>
          <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f9fafb;vertical-align:top;font-weight:600;">${escapeHtml(
            a.question_text
          )}</td>
          <td style="padding:8px 12px;border:1px solid #e5e7eb;white-space:pre-wrap;">${escapeHtml(
            answerToText(a.value)
          )}</td>
        </tr>`
    )
    .join("");

  return `
  <div style="font-family:system-ui,-apple-system,'Hiragino Sans','Meiryo',sans-serif;color:#111827;max-width:640px;margin:0 auto;">
    <h2 style="font-size:18px;">新しい回答が届きました</h2>
    <p style="font-size:14px;color:#374151;">
      Bot「<strong>${escapeHtml(input.bot.name)}</strong>」に新しい回答がありました。
    </p>
    <table style="border-collapse:collapse;width:100%;font-size:14px;margin:12px 0;">
      <tr>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:600;width:140px;">回答日時</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;">${escapeHtml(
          formatDateTime(input.createdAt)
        )}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:600;">回答者名</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;">${escapeHtml(
          input.respondentName || "—"
        )}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:600;">メール</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;">${escapeHtml(
          input.respondentEmail || "—"
        )}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:600;">電話番号</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;">${escapeHtml(
          input.respondentPhone || "—"
        )}</td>
      </tr>
    </table>
    <h3 style="font-size:15px;margin-top:20px;">回答内容</h3>
    <table style="border-collapse:collapse;width:100%;font-size:14px;">
      ${answerRows || '<tr><td style="padding:8px 12px;border:1px solid #e5e7eb;">（回答なし）</td></tr>'}
    </table>
    <p style="margin-top:24px;">
      <a href="${adminLink}" style="display:inline-block;background:#1b5ff5;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;">
        管理画面で確認する
      </a>
    </p>
    <p style="font-size:12px;color:#6b7280;margin-top:28px;line-height:1.7;border-top:1px solid #e5e7eb;padding-top:16px;">
      このメールは、AI受付bot に新しい回答が送信されたため自動でお送りしています。<br />
      本メールは送信専用アドレスから配信しているため、ご返信いただいてもお答えできない場合があります。
      回答者の方へご連絡される際は、上記の回答者メールアドレス宛にお願いいたします。
    </p>
    <p style="font-size:12px;color:#9ca3af;margin-top:12px;">
      AI受付bot / chatbot-support.com
    </p>
  </div>`;
}

// Plain-text alternative. Sending a multipart (html + text) message improves
// deliverability and lowers the chance of being flagged as spam.
function buildText(input: NotificationInput): string {
  const adminLink = `${appUrl()}/dashboard/bots/${input.bot.id}/responses/${input.responseId}`;
  const lines: string[] = [
    `「${input.bot.name}」に新しい回答が届きました。`,
    "",
    `回答日時: ${formatDateTime(input.createdAt)}`,
    `回答者名: ${input.respondentName || "—"}`,
    `メール: ${input.respondentEmail || "—"}`,
    `電話番号: ${input.respondentPhone || "—"}`,
    "",
    "■ 回答内容",
  ];
  if (input.answers.length === 0) {
    lines.push("（回答なし）");
  } else {
    for (const a of input.answers) {
      lines.push(`・${a.question_text}: ${answerToText(a.value)}`);
    }
  }
  lines.push(
    "",
    `管理画面で確認する: ${adminLink}`,
    "",
    "──────────",
    "このメールは、AI受付bot に新しい回答が送信されたため自動でお送りしています。",
    "本メールは送信専用アドレスから配信しているため、ご返信いただいてもお答えできない場合があります。",
    "回答者の方へご連絡される際は、上記の回答者メールアドレス宛にお願いいたします。",
    "",
    "AI受付bot / chatbot-support.com"
  );
  return lines.join("\n");
}

export interface SendResult {
  sent: boolean;
  skipped?: string;
  error?: string;
}

// Best-effort: never throws. Returns a status so callers can log but still
// return success for the visitor's submission.
export async function sendResponseNotification(
  input: NotificationInput
): Promise<SendResult> {
  const to = input.bot.notification_email?.trim();
  if (!to) return { sent: false, skipped: "通知先メール未設定" };

  const resend = getResend();
  if (!resend) return { sent: false, skipped: "RESEND_API_KEY未設定" };

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `「${input.bot.name}」に新しい回答が届きました`,
      html: buildHtml(input),
      text: buildText(input),
    });
    if (error) {
      return { sent: false, error: String(error.message ?? error) };
    }
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : "送信失敗" };
  }
}
