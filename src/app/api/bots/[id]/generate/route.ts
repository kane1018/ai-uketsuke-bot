import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateBotPlan, AIGenerationError } from "@/lib/openai";
import { rateLimit } from "@/lib/rate-limit";
import { jsonError, jsonOk, handleRouteError } from "@/lib/api";
import { getBillingOverview, recordUsageEvent } from "@/lib/billing";

export const maxDuration = 60;

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("認証が必要です", 401);

    const { plan: currentPlan, usage } = await getBillingOverview(user.id);
    if (usage.aiGenerations >= currentPlan.monthlyAiGenerationLimit) {
      return jsonError(
        `今月のAI生成上限（${currentPlan.monthlyAiGenerationLimit}回）に達しています。プランをアップグレードしてください。`,
        403,
        { upgradeRequired: true }
      );
    }

    // Rate limit: 10 generations / minute / user.
    const rl = rateLimit(`generate:${user.id}`, 10, 60_000);
    if (!rl.success) {
      return jsonError(
        "リクエストが多すぎます。少し時間をおいてからお試しください。",
        429
      );
    }

    // Fetch the bot (RLS scopes to owner).
    const { data: bot, error: botError } = await supabase
      .from("bots")
      .select(
        "id, name, purpose, industry, company_name, service_description, intake_goal, final_cta"
      )
      .eq("id", params.id)
      .single();

    if (botError || !bot) return jsonError("Botが見つかりません", 404);

    // Call OpenAI (parsing + validation handled inside).
    let result;
    try {
      result = await generateBotPlan({
        name: bot.name,
        purpose: bot.purpose,
        industry: bot.industry,
        company_name: bot.company_name,
        service_description: bot.service_description,
        intake_goal: bot.intake_goal,
        final_cta: bot.final_cta,
      });
    } catch (err) {
      if (err instanceof AIGenerationError) {
        // Log the failed attempt for debugging (server-side, service role).
        try {
          const admin = createAdminClient();
          await admin.from("ai_generation_logs").insert({
            user_id: user.id,
            bot_id: bot.id,
            prompt: "(generation failed)",
            result: err.raw ?? err.message,
            model: process.env.OPENAI_MODEL || "gpt-4o-mini",
            token_usage: null,
          });
        } catch {
          /* logging is best-effort */
        }
        await recordUsageEvent(user.id, "ai_generation", {
          bot_id: bot.id,
          success: false,
        });
        return jsonError(err.message, 502);
      }
      throw err;
    }

    const { plan } = result;
    const admin = createAdminClient();

    // Replace existing questions with the freshly generated set.
    await admin.from("bot_questions").delete().eq("bot_id", bot.id);

    const rows = plan.questions.map((q, i) => ({
      bot_id: bot.id,
      question_text: q.question_text,
      question_type: q.question_type,
      options: q.options,
      is_required: q.is_required,
      sort_order: i + 1,
    }));

    const { error: insertError } = await admin
      .from("bot_questions")
      .insert(rows);
    if (insertError) {
      return jsonError("質問の保存に失敗しました", 500);
    }

    // Persist the generated copy onto the bot.
    await admin
      .from("bots")
      .update({
        name: bot.name || plan.bot_title,
        opening_message: plan.opening_message,
        completion_message: plan.completion_message,
        cta_message: plan.cta_message,
      })
      .eq("id", bot.id);

    // Log the successful generation.
    await admin.from("ai_generation_logs").insert({
      user_id: user.id,
      bot_id: bot.id,
      prompt: result.prompt,
      result: result.rawResult,
      model: result.model,
      token_usage: result.tokenUsage,
    });
    await recordUsageEvent(user.id, "ai_generation", {
      bot_id: bot.id,
      success: true,
    });

    return jsonOk({ plan });
  } catch (err) {
    return handleRouteError(err);
  }
}
