import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateBotPlan, AIGenerationError } from "@/lib/openai";
import { rateLimit } from "@/lib/rate-limit";
import { jsonError, jsonOk, handleRouteError } from "@/lib/api";
import { consumeAiGenerationQuota, getEffectivePlan } from "@/lib/billing";

export const maxDuration = 60;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("認証が必要です", 401);

    // Rate limit: 10 generations / minute / user.
    const rl = await rateLimit(`generate:${user.id}`, 10, 60_000);
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
      .eq("id", id)
      .single();

    if (botError || !bot) return jsonError("Botが見つかりません", 404);

    const { plan: currentPlan } = await getEffectivePlan(user.id);
    const quotaReserved = await consumeAiGenerationQuota(
      user.id,
      currentPlan.monthlyAiGenerationLimit,
      bot.id
    );
    if (!quotaReserved) {
      return jsonError(
        `今月のAI生成上限（${currentPlan.monthlyAiGenerationLimit}回）に達しています。プランをアップグレードしてください。`,
        403,
        { upgradeRequired: true }
      );
    }

    // Reserve quota before the external model call. Failed model attempts count
    // because they still consume provider resources.
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
        return jsonError(err.message, 502);
      }
      throw err;
    }

    const { plan } = result;
    const admin = createAdminClient();

    // Generation is preview-only. The editor explicitly saves the accepted plan
    // through the atomic questions endpoint, so existing content is never
    // destroyed just because an AI regeneration was requested.

    // Log the successful generation.
    await admin.from("ai_generation_logs").insert({
      user_id: user.id,
      bot_id: bot.id,
      prompt: result.prompt,
      result: result.rawResult,
      model: result.model,
      token_usage: result.tokenUsage,
    });
    return jsonOk({ plan });
  } catch (err) {
    return handleRouteError(err);
  }
}
