import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  botBasicInfoSchema,
  botStatusUpdateSchema,
} from "@/lib/validations";
import { jsonError, jsonOk, handleRouteError } from "@/lib/api";
import { z } from "zod";

// Accept either a basic-info update, a status update, or both.
const patchSchema = z.object({
  info: botBasicInfoSchema.partial().optional(),
  status: botStatusUpdateSchema.shape.status.optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("認証が必要です", 401);

    const body = await request.json();
    const { info, status } = patchSchema.parse(body);

    // RLS ensures the user can only touch their own bot.
    const { data: bot, error: fetchError } = await supabase
      .from("bots")
      .select("id, user_id")
      .eq("id", params.id)
      .single();

    if (fetchError || !bot) return jsonError("Botが見つかりません", 404);

    const update: Record<string, unknown> = {};
    if (info) Object.assign(update, info);
    if (status) update.status = status;

    if (Object.keys(update).length === 0) {
      return jsonError("更新内容がありません", 400);
    }

    const { data: updated, error } = await supabase
      .from("bots")
      .update(update)
      .eq("id", params.id)
      .select("*")
      .single();

    if (error) return jsonError(error.message, 400);
    return jsonOk({ bot: updated });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("認証が必要です", 401);

    const { error } = await supabase
      .from("bots")
      .delete()
      .eq("id", params.id);

    if (error) return jsonError(error.message, 400);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
