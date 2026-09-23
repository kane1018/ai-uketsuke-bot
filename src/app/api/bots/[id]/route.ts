import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  botBasicInfoSchema,
  botStatusUpdateSchema,
  questionsSaveSchema,
} from "@/lib/validations";
import { jsonError, jsonOk, handleRouteError } from "@/lib/api";
import { z } from "zod";
import { buildBotTemplate } from "@/lib/bot-templates";
import { syncUntouchedCopy } from "@/lib/copy-defaults";

// Accept either a basic-info update, a status update, or both.
const patchSchema = z.object({
  info: botBasicInfoSchema.partial().optional(),
  status: botStatusUpdateSchema.shape.status.optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("認証が必要です", 401);

    const body = await request.json();
    const { info, status } = patchSchema.parse(body);

    // RLS ensures the user can only touch their own bot.
    const { data: bot, error: fetchError } = await supabase
      .from("bots")
      .select("id, user_id, company_name, status, purpose, industry, service_description, intake_goal, final_cta, opening_message, cta_message")
      .eq("id", id)
      .single();

    if (fetchError || !bot) return jsonError("Botが見つかりません", 404);

    const effectiveStatus = status ?? bot.status;
    const effectiveCompanyName = (info?.company_name ?? bot.company_name ?? "").trim();

    if (effectiveStatus === "published") {
      if (!effectiveCompanyName) {
        return jsonError("公開中のBotには会社・事業者名が必要です", 400);
      }

      const { count: questionCount, error: questionError } = await supabase
        .from("bot_questions")
        .select("id", { count: "exact", head: true })
        .eq("bot_id", id);
      if (questionError) return jsonError("公開条件の確認に失敗しました", 400);
      if ((questionCount ?? 0) < 1) {
        return jsonError("公開中のBotには質問が1つ以上必要です", 400);
      }
    }

    const update: Record<string, unknown> = {};
    if (info) {
      Object.assign(update, info);
      const previous = buildBotTemplate(bot);
      const next = buildBotTemplate({ ...bot, ...info });
      const copy = syncUntouchedCopy(bot, previous, next);
      const validated = questionsSaveSchema.pick({ opening_message: true, cta_message: true }).safeParse(copy);
      if (!validated.success) return jsonError("自動更新するあいさつ・回答後の案内が長すぎます。サービスの説明や受付で確認したいことを短くしてください（各1,000文字まで）。", 422);
      Object.assign(update, copy);
    }
    if (status) update.status = status;

    if (Object.keys(update).length === 0) {
      return jsonError("更新内容がありません", 400);
    }

    let query = supabase.from("bots").update(update).eq("id", id);
    // Do not overwrite custom copy edited in another tab after this read.
    if ("opening_message" in update) query = query.eq("opening_message", bot.opening_message);
    if ("cta_message" in update) query = query.eq("cta_message", bot.cta_message);
    const { data: updated, error } = await query.select("*").maybeSingle();
    if (error) return jsonError(error.message, 400);
    if (!updated) return jsonError("別の画面で内容が更新されました。ページを読み直してから再度保存してください。", 409);
    return jsonOk({ bot: updated });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(
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

    const { error } = await supabase
      .from("bots")
      .delete()
      .eq("id", id);

    if (error) return jsonError(error.message, 400);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
