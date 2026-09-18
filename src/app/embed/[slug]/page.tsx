import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ChatForm } from "@/components/ChatForm";
import type { BotQuestion } from "@/lib/types";
import { getEffectivePlan } from "@/lib/billing";

export const dynamic = "force-dynamic";

// iframe embed view: chat only, no header / nav / page chrome.
export default async function EmbedChatPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: bot } = await supabase
    .from("bots")
    .select(
      "id, user_id, name, company_name, opening_message, completion_message, cta_message, public_slug, status"
    )
    .eq("public_slug", slug)
    .eq("status", "published")
    .single();

  if (!bot || !bot.company_name?.trim()) notFound();

  const { data: questions } = await supabase
    .from("bot_questions")
    .select("*")
    .eq("bot_id", bot.id)
    .order("sort_order", { ascending: true });

  const list = (questions ?? []) as BotQuestion[];
  if (list.length === 0) notFound();
  const { plan } = await getEffectivePlan(bot.user_id);

  if (!plan.iframeEnabled) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 p-6 text-center text-sm text-gray-600">
        このBotの埋め込み表示は現在利用できません。
      </div>
    );
  }

  return (
    <div className="h-screen w-full overflow-hidden bg-white">
      <ChatForm
        slug={bot.public_slug}
        botName={bot.name}
        operatorName={bot.company_name}
        openingMessage={bot.opening_message ?? ""}
        completionMessage={bot.completion_message ?? ""}
        ctaMessage={bot.cta_message ?? ""}
        questions={list}
        showBranding={plan.brandingVisible}
      />
    </div>
  );
}
