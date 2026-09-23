import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ChatForm } from "@/components/ChatForm";
import type { BotQuestion } from "@/lib/types";
import { getEffectivePlan } from "@/lib/billing";

export const dynamic = "force-dynamic";
export const metadata = { title: "お問い合わせ受付", robots: { index: false, follow: false } };

// Public chat page. RLS only returns the bot if it is published.
export default async function PublicChatPage({
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

  return (
    <div id="main-content" className="flex min-h-dvh items-center justify-center bg-gray-100 p-0 sm:p-6">
      <div id="main-content" className="h-dvh w-full overflow-hidden bg-white shadow-xl sm:h-[640px] sm:max-w-md sm:rounded-2xl">
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
    </div>
  );
}
