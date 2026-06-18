import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { botBasicInfoSchema } from "@/lib/validations";
import { generatePublicSlug } from "@/lib/utils";
import { jsonError, jsonOk, handleRouteError } from "@/lib/api";
import { getBillingOverview, recordUsageEvent } from "@/lib/billing";

// Create a new bot (draft). Requires auth.
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("認証が必要です", 401);

    const { plan, usage } = await getBillingOverview(user.id);
    if (usage.bots >= plan.botLimit) {
      return jsonError(
        `Bot数の上限（${plan.botLimit}個）に達しています。プランをアップグレードしてください。`,
        403,
        { upgradeRequired: true }
      );
    }

    const body = await request.json();
    const data = botBasicInfoSchema.parse(body);

    // Retry slug generation on the (astronomically unlikely) unique collision.
    let lastError: string | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data: bot, error } = await supabase
        .from("bots")
        .insert({
          user_id: user.id,
          name: data.name,
          purpose: data.purpose,
          industry: data.industry,
          company_name: data.company_name,
          service_description: data.service_description,
          intake_goal: data.intake_goal,
          final_cta: data.final_cta,
          notification_email: data.notification_email,
          status: "draft",
          public_slug: generatePublicSlug(),
        })
        .select("id")
        .single();

      if (!error && bot) {
        await recordUsageEvent(user.id, "bot_created", { bot_id: bot.id });
        return jsonOk({ bot }, 201);
      }
      lastError = error?.message ?? "作成に失敗しました";
      if (!error?.message.includes("duplicate")) break;
    }

    return jsonError(lastError ?? "作成に失敗しました", 400);
  } catch (err) {
    return handleRouteError(err);
  }
}
