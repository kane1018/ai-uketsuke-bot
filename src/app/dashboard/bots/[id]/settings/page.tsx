import { notFound, redirect } from "next/navigation";
import { BasicInfoEditor } from "@/components/BasicInfoEditor";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: bot, error } = await supabase.from("bots")
    .select("id, name, purpose, industry, company_name, notification_email, service_description, intake_goal, final_cta")
    .eq("id", id).eq("user_id", user.id).single();
  if (error || !bot) notFound();
  return <BasicInfoEditor key={bot.id} botId={bot.id} initialInfo={{
    name: bot.name, purpose: bot.purpose, industry: bot.industry,
    company_name: bot.company_name ?? "", notification_email: bot.notification_email ?? "",
    service_description: bot.service_description ?? "", intake_goal: bot.intake_goal ?? "", final_cta: bot.final_cta ?? "",
  }} />;
}
