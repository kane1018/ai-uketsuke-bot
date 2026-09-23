"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { loginSchema, signupSchema } from "@/lib/validations";
import { authDestination } from "@/lib/navigation";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { USE_CASES } from "@/lib/use-cases";

export function AuthForm({ mode }: { mode: "signup" | "login" }) {
  const signup = mode === "signup";
  const router = useRouter(); const params = useSearchParams();
  const destination = authDestination(params.get("next") || params.get("redirect"), signup ? "/dashboard/bots/new" : "/dashboard");
  const chosen = USE_CASES.find((item)=>new URL(destination,"https://internal.invalid").searchParams.get("industry")===item.industry);
  const [name,setName]=useState("");const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [visible,setVisible]=useState(false);
  const [loading,setLoading]=useState(false);const [error,setError]=useState<string|null>(null);const [notice,setNotice]=useState<string|null>(null);
  const pending=useRef(false);const errorRef=useRef<HTMLDivElement>(null);
  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();if(pending.current)return;setError(null);setNotice(null);
    const parsed = signup ? signupSchema.safeParse({name,email,password}) : loginSchema.safeParse({email,password});
    if(!parsed.success){setError(parsed.error.issues[0]?.message??"入力内容を確認してください");return;}
    pending.current=true;setLoading(true);
    try {
      const supabase=createClient();
      if(signup){
        const result=await supabase.auth.signUp({email:email.trim(),password,options:{data:{name:name.trim()},emailRedirectTo:`${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}`}});
        if(result.error)throw new Error(result.error.message.includes("already")?"このメールアドレスは既に登録されています。ログインをお試しください。":"登録できませんでした。入力内容と接続を確認して、もう一度お試しください。");
        if(!result.data.session){setNotice("確認メールを送信しました。メール内のリンクから登録を完了してください。届かない場合は迷惑メールフォルダーと入力したアドレスをご確認ください。");return;}
      } else {
        const result=await supabase.auth.signInWithPassword({email:email.trim(),password});
        if(result.error)throw new Error("メールアドレスまたはパスワードをご確認ください。確認メールが届いている場合は、先にリンクを開いてください。");
      }
      router.push(destination);router.refresh();
    } catch(e){setError(e instanceof Error?e.message:"接続できませんでした。時間をおいて再度お試しください。");requestAnimationFrame(()=>errorRef.current?.focus());}
    finally{pending.current=false;setLoading(false);}
  }
  return <main id="main-content" className="mx-auto min-h-screen max-w-5xl px-4 py-8 sm:px-6 sm:py-12"><Link href="/" className="inline-flex items-center gap-2 text-xl font-bold text-brand-700">← 受付Bot</Link><div className="mt-8 grid items-start gap-10 md:grid-cols-[.9fr_1.1fr]">
    <aside className="md:pt-8"><p className="eyebrow">{signup?"カード不要・自動課金なし":"受付の続きはこちらから"}</p><h1 className="mt-4 text-3xl font-bold leading-relaxed">{signup?<>最初の受付を、<br/>30日無料で。</>:<>おかえりなさい。<br/>受付Botにログイン。</>}</h1><p className="mt-4 text-sm leading-8 text-slate-600">{signup?"登録したら、テンプレートを選んで質問を確認。公開URLを共有するだけで受付を始められます。ホームページへの埋め込みも試せます。":"作成したBotの編集、届いた回答の確認、プランの管理ができます。"}</p>{chosen&&<p className="mt-5 rounded-xl bg-brand-50 p-4 text-sm font-medium text-brand-900">選択中：{chosen.name}<br/><span className="mt-1 inline-block text-xs font-normal">登録・ログイン後の作成画面に引き継ぎます。</span></p>}{signup&&<p className="mt-5 text-xs leading-7 text-slate-500">無料体験終了後は無料プラン（Bot1個・月30回答・埋め込み不可）へ戻ります。継続したい方だけ月980円からお申し込みください。</p>}<Link href="/demo" className="mt-5 inline-block text-sm font-semibold text-brand-700 underline">先にデモを試す →</Link></aside>
    <section className="card p-5 sm:p-8" aria-label={signup?"無料登録":"ログイン"}>
      <h2 className="text-xl font-bold">{signup?"アカウントを作成":"ログイン情報"}</h2>
      {params.get("passwordReset")==="1"&&<p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">パスワードを更新しました。新しいパスワードでログインしてください。</p>}
      {params.get("error")==="auth"&&!error&&<p role="alert" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">認証リンクを確認できませんでした。ログインをお試しください。パスワードの再設定は下のリンクから行えます。</p>}
      {error&&<div ref={errorRef} tabIndex={-1} role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm leading-7 text-red-800">{error}</div>}
      {notice&&<p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm leading-7 text-emerald-800">{notice}</p>}
      <form className="mt-6 space-y-5" onSubmit={submit} aria-busy={loading}>
        {signup&&<div><label className="label" htmlFor="name">お名前</label><input id="name" className="input" value={name} onChange={(e)=>setName(e.target.value)} autoComplete="name" maxLength={100} required disabled={loading}/></div>}
        <div><label className="label" htmlFor="email">メールアドレス</label><input id="email" className="input" type="email" inputMode="email" autoCapitalize="none" autoComplete="email" value={email} onChange={(e)=>setEmail(e.target.value)} maxLength={254} required disabled={loading}/></div>
        <div><label className="label" htmlFor="password">パスワード{signup?"（8文字以上）":""}</label><div className="relative"><input id="password" className="input pr-20" type={visible?"text":"password"} autoComplete={signup?"new-password":"current-password"} value={password} onChange={(e)=>setPassword(e.target.value)} minLength={signup?8:undefined} maxLength={72} required disabled={loading}/><button className="absolute inset-y-0 right-1 min-w-[64px] px-2 text-sm font-medium text-brand-700" type="button" aria-controls="password" aria-pressed={visible} onClick={()=>setVisible((v)=>!v)}>{visible?"隠す":"表示"}</button></div></div>
        {!signup&&<div className="text-right"><Link href="/forgot-password" className="inline-block py-1 text-sm text-brand-700 underline">パスワードを忘れた方</Link></div>}
        {signup&&<p className="text-xs leading-6 text-slate-600">登録することで<Link href="/terms" target="_blank" rel="noopener noreferrer" className="text-brand-700 underline">利用規約（別タブ）</Link>に同意します。<Link href="/privacy" target="_blank" rel="noopener noreferrer" className="text-brand-700 underline">プライバシーポリシー（別タブ）</Link>もご確認ください。</p>}
        <button className="btn-primary w-full" disabled={loading} type="submit">{loading?"確認しています…":signup?"無料で登録して作成へ →":"ログイン"}</button>
      </form><div className="my-5 flex items-center gap-3 text-xs text-slate-500"><span className="h-px flex-1 bg-slate-200"/>または<span className="h-px flex-1 bg-slate-200"/></div>
      <GoogleSignInButton label={signup?"Googleで無料登録":"Googleでログイン"} next={destination} disabled={loading}/>
      <p className="mt-6 text-center text-sm text-slate-600">{signup?"登録済みの方は":"アカウントをお持ちでない方は"} <Link className="font-semibold text-brand-700 underline" href={signup?`/login?redirect=${encodeURIComponent(destination)}`:`/signup?next=${encodeURIComponent(destination)}`}>{signup?"ログイン":"無料で登録"}</Link></p>
    </section>
  </div></main>;
}
