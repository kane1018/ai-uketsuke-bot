import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { questionsSaveSchema } from "@/lib/validations";
import { questionTypeHasOptions } from "@/lib/constants";
import { jsonError, jsonOk, handleRouteError } from "@/lib/api";

// Replace the full question set for a bot, and optionally its chat copy.
export async function PUT(
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
    const { questions, opening_message, completion_message, cta_message } =
      questionsSaveSchema.parse(body);

    // Verify ownership (RLS also enforces this on writes).
    const { data: bot, error: botError } = await supabase
      .from("bots")
      .select("id")
      .eq("id", params.id)
      .single();
    if (botError || !bot) return jsonError("Botが見つかりません", 404);

    // Optionally update the chat copy.
    const copyUpdate: Record<string, string> = {};
    if (opening_message !== undefined) copyUpdate.opening_message = opening_message;
    if (completion_message !== undefined)
      copyUpdate.completion_message = completion_message;
    if (cta_message !== undefined) copyUpdate.cta_message = cta_message;
    if (Object.keys(copyUpdate).length > 0) {
      await supabase.from("bots").update(copyUpdate).eq("id", params.id);
    }

    // Replace all questions (delete + insert) for a clean reorder.
    const { error: delError } = await supabase
      .from("bot_questions")
      .delete()
      .eq("bot_id", params.id);
    if (delError) return jsonError(delError.message, 400);

    if (questions.length > 0) {
      const rows = questions.map((q, i) => ({
        bot_id: params.id,
        question_text: q.question_text,
        question_type: q.question_type,
        options: questionTypeHasOptions(q.question_type)
          ? q.options.filter((o) => o.trim().length > 0)
          : [],
        is_required: q.is_required,
        sort_order: i + 1,
      }));
      const { error: insError } = await supabase
        .from("bot_questions")
        .insert(rows);
      if (insError) return jsonError(insError.message, 400);
    }

    return jsonOk({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
