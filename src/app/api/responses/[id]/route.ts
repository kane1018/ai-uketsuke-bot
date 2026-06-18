import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { responseStatusUpdateSchema } from "@/lib/validations";
import { jsonError, jsonOk, handleRouteError } from "@/lib/api";

// Update a response's status (new / contacted / closed). Owner only via RLS.
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
    const { status } = responseStatusUpdateSchema.parse(body);

    const { data, error } = await supabase
      .from("bot_responses")
      .update({ status })
      .eq("id", params.id)
      .select("id, status")
      .single();

    if (error || !data) return jsonError("更新に失敗しました", 400);
    return jsonOk({ response: data });
  } catch (err) {
    return handleRouteError(err);
  }
}
