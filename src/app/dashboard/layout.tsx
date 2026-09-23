import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LegalFooter } from "@/components/LegalFooter";
import { DashboardNav } from "@/components/DashboardNav";
export const dynamic="force-dynamic";
export const metadata={title:"受付の管理",robots:{index:false,follow:false}};
export default async function DashboardLayout({children}:{children:React.ReactNode}){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 return <div className="min-h-screen bg-slate-50"><header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6"><Link href="/dashboard" className="flex items-center gap-2 text-lg font-bold text-slate-900"><span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-700 text-sm text-white" aria-hidden="true">受</span>受付Bot</Link><div className="flex min-w-0 items-center gap-3"><span className="hidden max-w-[220px] truncate text-xs text-slate-500 sm:block">{user.email}</span><form action="/auth/signout" method="post"><button className="btn-ghost" type="submit">ログアウト</button></form></div></div><DashboardNav/></header><main id="main-content" className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10">{children}</main><LegalFooter/></div>;
}
