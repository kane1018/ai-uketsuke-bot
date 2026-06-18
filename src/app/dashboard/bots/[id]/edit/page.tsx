import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { QuestionsEditor } from "@/components/QuestionsEditor";
import type { BotQuestion } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: bot } = await supabase
    .from("bots")
    .select(
      "id, name, opening_message, completion_message, cta_message"
    )
    .eq("id", params.id)
    .single();

  if (!bot) notFound();

  const { data: questions } = await supabase
    .from("bot_questions")
    .select("*")
    .eq("bot_id", params.id)
    .order("sort_order", { ascending: true });

  return (
    <QuestionsEditor
      botId={bot.id}
      initialQuestions={(questions ?? []) as BotQuestion[]}
      initialOpening={bot.opening_message ?? ""}
      initialCompletion={bot.completion_message ?? ""}
      initialCta={bot.cta_message ?? ""}
    />
  );
}
