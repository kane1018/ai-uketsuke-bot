import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { botBasicInfoSchema } from "@/lib/validations";
import { generatePublicSlug } from "@/lib/utils";
import { jsonError, jsonOk, handleRouteError } from "@/lib/api";
import { getEffectivePlan, recordUsageEvent } from "@/lib/billing";

// Create a new bot (draft). Requires auth.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("認証が必要です", 401);

    const { plan } = await getEffectivePlan(user.id);

    const body = await request.json();
    const data = botBasicInfoSchema.parse(body);

    // The limit check and insert run in one DB transaction so concurrent
    // requests cannot create more bots than the plan allows.
    const admin = createAdminClient();
    let lastError: string | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data: rows, error } = await admin.rpc("create_bot_with_limit", {
        p_user_id: user.id,
        p_limit: plan.botLimit,
        p_name: data.name,
        p_purpose: data.purpose,
        p_industry: data.industry,
        p_company_name: data.company_name,
        p_service_description: data.service_description,
        p_intake_goal: data.intake_goal,
        p_final_cta: data.final_cta,
        p_notification_email: data.notification_email,
        p_public_slug: generatePublicSlug(),
      });

      const result = Array.isArray(rows) ? rows[0] : rows;
      if (!error && result?.limit_reached) {
        return jsonError(
          `Bot数の上限（${plan.botLimit}個）に達しています。プランをアップグレードしてください。`,
          403,
          { upgradeRequired: true }
        );
      }

      if (!error && result?.bot_id) {
        const bot = { id: result.bot_id as string };
        await recordUsageEvent(user.id, "bot_created", { bot_id: bot.id });
        return jsonOk({ bot }, 201);
      }

      lastError = error?.message ?? "作成に失敗しました";
      if (error?.code !== "23505") break;
    }

    return jsonError(lastError ?? "作成に失敗しました", 400);
  } catch (err) {
    return handleRouteError(err);
  }
}
