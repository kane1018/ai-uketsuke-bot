import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
export const metadata={title:"ログイン",robots:{index:false,follow:false}};
export default function LoginPage(){return <Suspense fallback={<main id="main-content" className="p-8" role="status">ログイン画面を読み込んでいます…</main>}><AuthForm mode="login"/></Suspense>;}
