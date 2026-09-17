import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { questionsSaveSchema } from "@/lib/validations";
import { questionTypeHasOptions } from "@/lib/constants";
import { jsonError, jsonOk, handleRouteError } from "@/lib/api";

// Replace the full question set for a bot, and optionally its chat copy.
export async function PUT(
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
    const { questions, opening_message, completion_message, cta_message } =
      questionsSaveSchema.parse(body);

    // Verify ownership (RLS also enforces this on writes).
    const { data: bot, error: botError } = await supabase
      .from("bots")
      .select("id")
      .eq("id", id)
      .single();
    if (botError || !bot) return jsonError("Botが見つかりません", 404);

    const normalizedQuestions = questions.map((q, i) => ({
      question_text: q.question_text,
      question_type: q.question_type,
      options: questionTypeHasOptions(q.question_type)
        ? q.options.filter((o) => o.trim().length > 0)
        : [],
      is_required: q.is_required,
      sort_order: i + 1,
    }));

    // One database transaction updates copy + replaces the full question set.
    // If any insert fails, PostgreSQL rolls the whole function call back.
    const { error } = await supabase.rpc("replace_bot_questions", {
      p_bot_id: id,
      p_questions: normalizedQuestions,
      p_opening_message: opening_message ?? "",
      p_completion_message: completion_message ?? "",
      p_cta_message: cta_message ?? "",
    });
    if (error) return jsonError("質問の保存に失敗しました", 400);

    return jsonOk({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
