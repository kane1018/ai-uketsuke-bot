import { type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicResponseSchema } from "@/lib/validations";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { sendResponseNotification } from "@/lib/email";
import { jsonError, jsonOk, handleRouteError } from "@/lib/api";
import type { ResponseAnswer } from "@/lib/types";
import { getEffectivePlan, recordUsageEvent } from "@/lib/billing";
import { validateResponseValue } from "@/lib/response-validation";

export const maxDuration = 30;

// Public endpoint: a visitor submits answers to a published bot.
// No auth. We validate, rate-limit, confirm the bot is published, store the
// response via service role, and fire a notification email.
export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP: 20 submissions / 10 minutes.
    const ip = getClientIp(request.headers);
    const rl = await rateLimit(`submit:${ip}`, 20, 10 * 60_000);
    if (!rl.success) {
      return jsonError(
        "送信回数が上限に達しました。しばらくしてからお試しください。",
        429
      );
    }

    const body = await request.json();
    const input = publicResponseSchema.parse(body);

    const admin = createAdminClient();

    // The bot must exist AND be published.
    const { data: bot, error: botError } = await admin
      .from("bots")
      .select("id, user_id, name, status, notification_email")
      .eq("public_slug", input.slug)
      .single();

    if (botError || !bot || bot.status !== "published") {
      return jsonError("このBotは公開されていません", 404);
    }

    const { plan } = await getEffectivePlan(bot.user_id);

    // Load the published questions so we can map answers to real question ids
    // and ignore any client-supplied junk.
    const { data: questions } = await admin
      .from("bot_questions")
      .select("id, question_text, question_type, options, is_required")
      .eq("bot_id", bot.id)
      .order("sort_order", { ascending: true });

    const questionList = questions ?? [];

    // Build a clean answers array keyed off the server's questions.
    const answers: ResponseAnswer[] = [];
    let respondentEmail: string | null =
      (input.respondent_email as string) || null;
    let respondentPhone: string | null = input.respondent_phone || null;
    let respondentName: string | null = input.respondent_name || null;

    for (const q of questionList) {
      const submitted = input.answers.find(
        (a) => a.question_id === q.id
      );
      const value = submitted?.value ?? "";

      const validationError = validateResponseValue(
        { ...q, options: Array.isArray(q.options) ? q.options : [] },
        value
      );
      if (validationError) return jsonError(validationError, 422);

      answers.push({
        question_id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        value,
      });

      // Infer contact fields from typed questions.
      const flat = Array.isArray(value) ? value.join("、") : String(value);
      if (q.question_type === "email" && flat && !respondentEmail)
        respondentEmail = flat;
      if (q.question_type === "phone" && flat && !respondentPhone)
        respondentPhone = flat;
      // Best-effort name: first short-text answer to a "名前 / 氏名 / お名前" question.
      if (
        q.question_type === "text" &&
        flat &&
        !respondentName &&
        /(お名前|氏名|名前|担当者)/.test(q.question_text)
      )
        respondentName = flat;
    }

    // Free-plan monthly-limit enforcement and response insert run in one DB transaction.
    // Paid plans pass a null limit, so legitimate submissions are not capped.
    const { data: rows, error: insertError } = await admin.rpc(
      "insert_response_with_monthly_limit",
      {
        p_bot_id: bot.id,
        p_limit: plan.monthlyResponseLimit,
        p_respondent_name: respondentName ?? "",
        p_respondent_email: respondentEmail ?? "",
        p_respondent_phone: respondentPhone ?? "",
        p_answers: answers,
      }
    );
    const insertResult = Array.isArray(rows) ? rows[0] : rows;

    if (insertError) {
      console.error("[responses] atomic insert failed:", insertError);
      return jsonError("回答の保存に失敗しました", 500);
    }
    if (insertResult?.limit_reached) {
      return jsonError(
        "無料プランの月間回答数上限に達しています。Bot運営者にお問い合わせください。",
        429
      );
    }
    if (!insertResult?.response_id || !insertResult?.response_created_at) {
      return jsonError("回答の保存に失敗しました", 500);
    }

    const inserted = {
      id: insertResult.response_id as string,
      created_at: insertResult.response_created_at as string,
    };

    // Fire-and-collect the email (never blocks success on email failure).
    const emailResult = await sendResponseNotification({
      bot: {
        id: bot.id,
        name: bot.name,
        notification_email: bot.notification_email,
      },
      responseId: inserted.id,
      respondentName,
      respondentEmail,
      respondentPhone,
      answers,
      createdAt: inserted.created_at,
    });

    if (!emailResult.sent) {
      console.warn("[responses] notification not sent:", emailResult);
    }

    await recordUsageEvent(bot.user_id, "response_received", {
      bot_id: bot.id,
      response_id: inserted.id,
    });

    return jsonOk({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
